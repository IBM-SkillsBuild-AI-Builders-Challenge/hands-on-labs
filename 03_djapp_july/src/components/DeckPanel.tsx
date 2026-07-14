// DeckPanel — everything for one deck: load button, track name, waveform, and transport.
// Driven by a UseDeck, so deck A and deck B are the same component with different state.
//
// P4 adds a cue row (Set Cue / ⏮ Cue) and a loop row (Loop In / Loop Out / Loop ON)
// below the transport. The loop buttons mark positions on the current playhead; Loop ON
// toggles the floored-modulo wrap in the audio graph (deck.ts). Pressing Loop ON while
// active exits the loop and re-bases the transport at the current position.

import { useRef, useState } from 'react';
import type { UseDeck } from '../useDeck';
import Waveform from './Waveform';

interface Props {
  deck: UseDeck;
  label: string;
  ensureAudio: () => Promise<void>; // boots the AudioContext on first user gesture
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DeckPanel({ deck, label, ensureAudio }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      await ensureAudio();
      await deck.load(file);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { track, cueNorm, loopIn, loopOut, loopActive } = deck.state;
  const dur = track?.duration ?? 0;

  return (
    <section className="deck">
      <header className="deck-head">
        <span className="deck-label">{label}</span>
        <button className="btn ghost" onClick={() => fileInputRef.current?.click()} disabled={loading}>
          {loading ? 'Loading…' : 'Load track'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.flac,.aiff,.aif"
          onChange={onPickFile}
          hidden
        />
      </header>

      <div className="track-name">{track ? track.name : 'No track loaded'}</div>

      <div className="waveform-wrap">
        <Waveform
          peaks={track?.peaks ?? null}
          position={deck.position}
          onSeek={deck.seek}
          cueNorm={cueNorm}
          loopIn={loopIn}
          loopOut={loopOut}
          loopActive={loopActive}
        />
      </div>

      <div className="transport">
        <button
          className={`btn ${deck.state.playing ? 'stop' : 'start'}`}
          onClick={deck.togglePlay}
          disabled={!track}
        >
          {deck.state.playing ? '◼ Pause' : '▶ Play'}
        </button>
        <span className="time">
          {track ? `${fmt(deck.position * dur)} / ${fmt(dur)}` : '0:00 / 0:00'}
        </span>
      </div>

      {/* P4 — cue row */}
      <div className="cue-row">
        <button
          className={`btn ghost${cueNorm > 0 ? ' active' : ''}`}
          onClick={() => deck.setCue(deck.position)}
          disabled={!track}
        >
          Set Cue
        </button>
        <button
          className="btn ghost"
          onClick={deck.jumpToCue}
          disabled={!track || cueNorm === 0}
        >
          ⏮ Cue
        </button>
        {cueNorm > 0 && track && (
          <span className="time">Cue: {fmt(cueNorm * dur)}</span>
        )}
      </div>

      {/* P4 — loop row */}
      <div className="loop-row">
        <button
          className="btn ghost"
          onClick={() => deck.setLoopIn(deck.position)}
          disabled={!track}
        >
          Loop In
        </button>
        <button
          className="btn ghost"
          onClick={() => deck.setLoopOut(deck.position)}
          disabled={!track}
        >
          Loop Out
        </button>
        <button
          className={`btn ghost${loopActive ? ' active' : ''}`}
          onClick={() => deck.toggleLoop(deck.position)}
          disabled={!track}
        >
          ◌ Loop ON
        </button>
        {track && (
          <span className="time">{fmt(loopIn * dur)} – {fmt(loopOut * dur)}</span>
        )}
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
