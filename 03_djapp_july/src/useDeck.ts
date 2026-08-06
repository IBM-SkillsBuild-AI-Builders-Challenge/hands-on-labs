// useDeck — React state + transport for a single deck.
//
// Owns the reducer-backed DeckState (the serializable transport + mixer controls) plus
// two pieces of live, high-rate state that must NOT live in the reducer (they update
// ~30x/sec and would otherwise trigger graph re-renders): the playhead position and
// the meter level. Both arrive asynchronously from the audio graph's analysis events.
//
// P4 adds cue-point and loop actions. TOGGLE_LOOP carries the live positionNorm so
// the reducer can re-base the transport when exiting a loop (see deck.ts §P4 comment).

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { getRuntime } from './audio';
import { loadTrackToVFS } from './track';
import {
  DeckState,
  initialDeckState,
  METER_EVENT_SUFFIX,
  POS_EVENT_SUFFIX,
} from './deck';

type EqBand = 'eqLow' | 'eqMid' | 'eqHigh';

type Action =
  | { type: 'LOAD'; track: DeckState['track'] }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; norm: number }
  | { type: 'END' }
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'SET_EQ'; band: EqBand; value: number }
  | { type: 'SET_FILTER'; value: number }
  | { type: 'SET_TEMPO'; value: number }
  | { type: 'SET_CUE'; norm: number }
  | { type: 'JUMP_TO_CUE' }
  | { type: 'SET_LOOP_IN'; norm: number }
  | { type: 'SET_LOOP_OUT'; norm: number }
  | { type: 'TOGGLE_LOOP'; positionNorm: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function reducer(s: DeckState, a: Action): DeckState {
  switch (a.type) {
    case 'LOAD':
      // New track: stop, rewind, reset all P4 state, bump seekGen.
      return {
        ...s,
        track: a.track,
        playing: false,
        baseNorm: 0,
        seekGen: s.seekGen + 1,
        tempo: 1,
        loopIn: 0,
        loopOut: 1,
        loopActive: false,
        cueNorm: 0,
      };
    case 'PLAY':
      return s.track ? { ...s, playing: true } : s;
    case 'PAUSE':
      return { ...s, playing: false };
    case 'SEEK':
      return s.track ? { ...s, baseNorm: clamp01(a.norm), seekGen: s.seekGen + 1 } : s;
    case 'END':
      // Reached the end: stop, rewind, exit any active loop.
      return { ...s, playing: false, baseNorm: 0, seekGen: s.seekGen + 1, loopActive: false };
    case 'SET_VOLUME':
      return { ...s, volume: clamp01(a.value) };
    case 'SET_EQ':
      return { ...s, [a.band]: a.value };
    case 'SET_FILTER':
      return { ...s, filterCutoff: Math.max(-1, Math.min(1, a.value)) };
    case 'SET_TEMPO':
      return { ...s, tempo: Math.max(0.5, Math.min(2.0, a.value)) };
    // --- P4: cue ---
    case 'SET_CUE':
      return s.track ? { ...s, cueNorm: clamp01(a.norm) } : s;
    case 'JUMP_TO_CUE':
      return s.track && s.cueNorm > 0
        ? { ...s, baseNorm: s.cueNorm, seekGen: s.seekGen + 1 }
        : s;
    // --- P4: loop ---
    case 'SET_LOOP_IN':
      return s.track ? { ...s, loopIn: clamp01(a.norm) } : s;
    case 'SET_LOOP_OUT':
      return s.track ? { ...s, loopOut: clamp01(a.norm) } : s;
    case 'TOGGLE_LOOP':
      if (!s.track) return s;
      if (s.loopActive) {
        // Exiting loop: re-base transport to the current wrapped position so playback
        // continues from exactly where it was rather than the raw accumulator value.
        return { ...s, loopActive: false, baseNorm: clamp01(a.positionNorm), seekGen: s.seekGen + 1 };
      }
      return { ...s, loopActive: true };
    default:
      return s;
  }
}

export interface UseDeck {
  state: DeckState;
  position: number; // live normalized playhead 0..1
  level: number; // live meter level 0..1
  load: (file: File) => Promise<void>;
  togglePlay: () => void;
  seek: (norm: number) => void;
  setVolume: (value: number) => void;
  setEq: (band: EqBand, value: number) => void;
  setFilter: (value: number) => void;
  setTempo: (value: number) => void;
  // P4 — cue
  setCue: (norm: number) => void;
  jumpToCue: () => void;
  // P4 — loop
  setLoopIn: (norm: number) => void;
  setLoopOut: (norm: number) => void;
  toggleLoop: (positionNorm: number) => void;
}

export function useDeck(id: string, audioReady: boolean): UseDeck {
  const [state, dispatch] = useReducer(reducer, id, initialDeckState);
  const [position, setPosition] = useState(0);
  const [level, setLevel] = useState(0);

  // Ref so the snapshot handler reads current `playing` without re-subscribing.
  const playingRef = useRef(state.playing);
  playingRef.current = state.playing;

  // Route this deck's analysis events (playhead + meter) into local state.
  useEffect(() => {
    if (!audioReady) return;
    const rt = getRuntime();
    if (!rt) return;

    const posSource = `${id}${POS_EVENT_SUFFIX}`;
    const meterSource = `${id}${METER_EVENT_SUFFIX}`;

    const onSnapshot = (e: { source?: string; data: number }) => {
      if (e.source !== posSource) return;
      const p = clamp01(e.data);
      setPosition(p);
      if (p >= 0.9999 && playingRef.current) dispatch({ type: 'END' });
    };

    const onMeter = (e: { source?: string; min: number; max: number }) => {
      if (e.source !== meterSource) return;
      setLevel(clamp01(Math.max(Math.abs(e.min), Math.abs(e.max))));
    };

    rt.core.on('snapshot', onSnapshot);
    rt.core.on('meter', onMeter);
    return () => {
      rt.core.off('snapshot', onSnapshot);
      rt.core.off('meter', onMeter);
    };
  }, [id, audioReady]);

  const load = useCallback(
    async (file: File) => {
      const rt = getRuntime();
      if (!rt) return;
      const track = await loadTrackToVFS(rt, id, file);
      setPosition(0);
      dispatch({ type: 'LOAD', track });
    },
    [id],
  );

  const togglePlay = useCallback(() => {
    dispatch(playingRef.current ? { type: 'PAUSE' } : { type: 'PLAY' });
  }, []);

  const seek = useCallback((norm: number) => {
    setPosition(clamp01(norm));
    dispatch({ type: 'SEEK', norm });
  }, []);

  const setVolume   = useCallback((value: number) => dispatch({ type: 'SET_VOLUME', value }), []);
  const setEq       = useCallback((band: EqBand, value: number) => dispatch({ type: 'SET_EQ', band, value }), []);
  const setFilter   = useCallback((value: number) => dispatch({ type: 'SET_FILTER', value }), []);
  const setTempo    = useCallback((value: number) => dispatch({ type: 'SET_TEMPO', value }), []);
  const setCue      = useCallback((norm: number) => dispatch({ type: 'SET_CUE', norm }), []);
  const jumpToCue   = useCallback(() => dispatch({ type: 'JUMP_TO_CUE' }), []);
  const setLoopIn   = useCallback((norm: number) => dispatch({ type: 'SET_LOOP_IN', norm }), []);
  const setLoopOut  = useCallback((norm: number) => dispatch({ type: 'SET_LOOP_OUT', norm }), []);
  const toggleLoop  = useCallback((positionNorm: number) => dispatch({ type: 'TOGGLE_LOOP', positionNorm }), []);

  return {
    state, position, level, load, togglePlay, seek,
    setVolume, setEq, setFilter, setTempo,
    setCue, jumpToCue, setLoopIn, setLoopOut, toggleLoop,
  };
}
