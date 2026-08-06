# Phase 4 Implementation Plan — Varispeed Tempo, Manual Loops & In-Mix Cue

## Overview

Phase 4 adds three interrelated DJ features on top of the working Phase 3 two-deck mixer:

1. **Varispeed tempo** — a TEMPO knob per deck that stretches/squashes playback rate (pitch moves with tempo; no time-stretching).
2. **In-mix cue point** — a single per-deck cue point the DJ can set and jump back to instantly ("Set Cue" / "⏮ Cue" buttons).
3. **Manual loop** — a per-deck loop region (Loop In / Loop Out points) with an on/off toggle. The loop uses a floored-modulo wrap inside the Elementary graph so the accumulator keeps running and the graph toggles structurally.

A fourth cross-cutting piece ties these together:

4. **Waveform markers** — the canvas waveform gains coloured vertical lines and a shaded region for the cue point, loop-in, and loop-out positions.

The Phase 3 app is already wired for `tempo` in `DeckState` (it's initialized to `1` and passed through `buildDeckSignal`), so the audio side of varispeed is a small change. Loops and cue are net-new state, audio graph changes, reducer actions, UI buttons, and waveform drawing.

All changes follow the existing patterns: new state lives in `DeckState` + reducer, audio graph lives in `deck.ts`, new UI goes in `DeckPanel.tsx`, and waveform drawing is an additive change to `Waveform.tsx`.

---

## Sub-Tasks

---

### Sub-Task 1 — Extend DeckState and the reducer for cue point, loop, and tempo

**Intent**  
Add the new fields to `DeckState` and handle them in the reducer. This is the data foundation every other sub-task depends on.

**Expected Outcomes**  
- `DeckState` has: `cueNorm: number`, `loopIn: number`, `loopOut: number`, `loopActive: boolean`.
- `initialDeckState` initialises them to sensible defaults (`cueNorm: 0`, `loopIn: 0`, `loopOut: 1`, `loopActive: false`).
- New reducer actions: `SET_CUE`, `JUMP_TO_CUE`, `SET_LOOP_IN`, `SET_LOOP_OUT`, `TOGGLE_LOOP`.
- `LOAD` resets all new fields to their defaults.
- `SEEK` now also deactivates the loop if the seek lands outside the loop region (optional safeguard — matches desktop behaviour).
- `UseDeck` exposes the new dispatch helpers: `setCue`, `jumpToCue`, `setLoopIn`, `setLoopOut`, `toggleLoop`.
- The tempo knob already exists in `DeckControls.tsx`; `SET_TEMPO` action and `setTempo` helper are added to `useDeck.ts` (the `tempo` field is already in `DeckState` and `initialDeckState`, but there's no action or helper for it yet).

**Todo List**  
1. In `deck.ts`, extend the `DeckState` interface with `cueNorm`, `loopIn`, `loopOut`, `loopActive`.
2. In `deck.ts`, update `initialDeckState` to include the new fields.
3. In `useDeck.ts`, add `SET_CUE`, `JUMP_TO_CUE`, `SET_LOOP_IN`, `SET_LOOP_OUT`, `TOGGLE_LOOP`, and `SET_TEMPO` to the `Action` union.
4. In `useDeck.ts`, implement the new reducer cases.
5. In `useDeck.ts`, extend the `UseDeck` interface with the new helper functions.
6. In `useDeck.ts`, add `useCallback`-wrapped dispatch helpers for each new action.
7. Return the new helpers from `useDeck`.

**Relevant Context**  
- [`DeckState` and `initialDeckState`](src/deck.ts:27)
- [`Action` union and `reducer`](src/useDeck.ts:20)
- [`UseDeck` interface](src/useDeck.ts:57)

**Status** — `[ ] pending`

---

### Sub-Task 2 — Add varispeed tempo to the audio graph in deck.ts

**Intent**  
Wire the `tempo` field into `buildDeckSignal` so the playback rate scales. The field already exists and is always `1.0`; this sub-task makes it meaningful.

**Expected Outcomes**  
- `incPerSample` is already computed as `s.tempo / Math.max(1, totalFrames - 1)` — this is correct and unchanged; it is what provides varispeed (higher `tempo` → larger increment per sample → faster/higher-pitched playback).
- No change needed to the Elementary graph itself — the `tempo` field already flows through correctly. The only work here is confirming this is wired through and that `SET_TEMPO` in the reducer updates `tempo` in `DeckState`.
- Confirm that `DeckControls.tsx` is wired up: a TEMPO knob already appears in the reference screenshots (labelled "TEMPO", range roughly 0.5–2.0, default 1.0, displayed as "100%").

**Todo List**  
1. Verify `incPerSample` in `buildDeckSignal` already reads `s.tempo` (it does — no graph change needed).
2. In `DeckControls.tsx`, add a TEMPO `Knob` with min `0.5`, max `2.0`, default `1.0`, using `deck.setTempo` (added in Sub-Task 1), formatted as a percentage string (e.g. `"100%"`).
3. Confirm `SET_TEMPO` clamps tempo to the `[0.5, 2.0]` range in the reducer.

**Relevant Context**  
- [`buildDeckSignal` — `incPerSample` line](src/deck.ts:122)
- [`DeckControls.tsx`](src/components/DeckControls.tsx)
- Reference screenshots: TEMPO knob visible in console strip alongside HIGH/MID/LOW/FILTER

**Status** — `[ ] pending`

---

### Sub-Task 3 — Add loop transport to the audio graph in deck.ts

**Intent**  
Add the floored-modulo loop wrap to `buildDeckSignal`. When `loopActive` is `true` the position is wrapped into `[loopIn, loopOut)` using `el.sub(pos, el.mul(len, el.floor(el.div(el.sub(pos, loopIn), len))))`. This is the "floored modulo" described in §6 of the spec. When `loopActive` is `false` the graph is unchanged (same plain `position` as Phase 3). Because the graph shape changes structurally with the toggle, Elementary will re-diff and rebuild the loop nodes; the accumulator keeps its state across this because its key is stable.

Loop exit re-basing: when the user turns off the loop while it is active, the `TOGGLE_LOOP` reducer action must re-base the transport (`baseNorm = current loopPosition`, `seekGen++`) so playback continues from the current spot rather than the run-on phase. This means `TOGGLE_LOOP` needs the live `position` at the time the button is pressed. Pass it in as part of the action: `{ type: 'TOGGLE_LOOP', positionNorm: number }`.

**Expected Outcomes**  
- When `loopActive` is `true`, playback wraps between `loopIn` and `loopOut` seamlessly in the audio graph.
- When `loopActive` is toggled off, the deck continues from the current position without a jump.
- The Elementary graph uses stable `key`s for the loop-related nodes so re-rendering only nudges values.
- `buildDeckSignal` accepts the full `DeckState` (already does) — no signature change needed.

**Todo List**  
1. In `deck.ts`, add `loopIn`, `loopOut`, `loopActive` to the fields read from `DeckState` in `buildDeckSignal`.
2. Compute `loopLen = loopOut - loopIn` (clamped to a minimum of `1/totalFrames` to avoid division by zero).
3. Build `const loopInConst = el.const({ key: \`${id}_loopIn\`, value: s.loopIn })` and similarly for `loopOut` and `loopLen`.
4. Implement the floored-modulo wrapped position: `el.add(loopInConst, el.sub(relPos, el.mul(loopLen, el.floor(el.div(relPos, loopLen)))))` where `relPos = el.sub(position, loopInConst)`.
5. Use `s.loopActive ? wrappedPosition : position` to select the signal fed to `el.table`.
6. Update `TOGGLE_LOOP` in the reducer (Sub-Task 1) to include the re-base logic when deactivating.

**Relevant Context**  
- [`buildDeckSignal`](src/deck.ts:118)
- Spec §6 — floored modulo explanation and loop exit re-base
- Elementary `el.floor`, `el.div`, `el.mul`, `el.sub`, `el.add`, `el.const` are already imported

**Status** — `[ ] pending`

---

### Sub-Task 4 — Cue point and loop controls in DeckPanel

**Intent**  
Add the transport row of buttons visible in the reference screenshots: "Set Cue", "⏮ Cue" (with cue time display), "Loop In", "Loop Out", "◌ Loop ON" (with loop range display). These sit below the waveform in each deck panel.

**Expected Outcomes**  
- "Set Cue" button: calls `deck.setCue(deck.position)` — sets the cue point to the current playhead.
- "⏮ Cue" button: calls `deck.jumpToCue()` — seeks to the stored cue point. Disabled when no track is loaded. Shows "Cue: M:SS" label beside it when a cue is set.
- "Loop In" button: calls `deck.setLoopIn(deck.position)` — marks the current playhead as the loop start.
- "Loop Out" button: calls `deck.setLoopOut(deck.position)` — marks the current playhead as the loop end.
- "◌ Loop ON" toggle button: calls `deck.toggleLoop(deck.position)` — enables/disables the loop. Appears highlighted (active style) when loop is on. Shows "M:SS – M:SS" range label.
- All loop/cue buttons are disabled when no track is loaded.
- The "Set Cue" button is highlighted green (matching screenshot) when a cue is active (i.e. `cueNorm > 0` or track loaded); "Loop ON" is highlighted when active.

**Todo List**  
1. In `DeckPanel.tsx`, import and use the new helpers from `deck` (`setCue`, `jumpToCue`, `setLoopIn`, `setLoopOut`, `toggleLoop`).
2. Add a `cue-row` div below the transport with "Set Cue" and "⏮ Cue" buttons + cue time display.
3. Add a `loop-row` div with "Loop In", "Loop Out", and "◌ Loop ON" buttons + loop range display.
4. Wire each button to its `useDeck` helper.
5. Compute display times from normalized positions using the existing `fmt` helper and `track.duration`.
6. Apply active CSS class to "Set Cue" when cue is set (cueNorm !== 0 or track has been loaded) and "Loop ON" when `state.loopActive`.
7. Add CSS in `index.css` for `.cue-row`, `.loop-row`, and a `.btn.active` or `.btn.loop-on` variant for the highlighted state (green, matching screenshots).

**Relevant Context**  
- [`DeckPanel.tsx`](src/components/DeckPanel.tsx)
- [`fmt` helper](src/components/DeckPanel.tsx:15)
- [`index.css` — `.btn` styles](src/index.css:75)
- Reference screenshots: phase4-feature2.png (cue), phase4-feature3.png (loop)

**Status** — `[ ] pending`

---

### Sub-Task 5 — Waveform cue/loop markers

**Intent**  
Draw coloured vertical marker lines and a shaded loop region on the waveform canvas. These are the "IN", "OUT", "CUE" labels and coloured lines visible in `phase4-feature4.png`. This is a purely visual addition to `Waveform.tsx` — no audio changes.

**Expected Outcomes**  
- Cue marker: a green vertical line at the cue position with a small "CUE" label, visible when `cueNorm` is set.
- Loop-in marker: a yellow/green vertical line with "IN" label.
- Loop-out marker: an orange/red vertical line with "OUT" label.
- Loop region: a semi-transparent teal/green fill between loop-in and loop-out when `loopActive` is true.
- All markers are drawn in the `draw` callback using the same coordinate transform as the playhead (`(pos * total - start) / win * cssW`).
- Markers only render when their position is within the visible window.
- `Waveform` props are extended to receive `cueNorm`, `loopIn`, `loopOut`, `loopActive` (all optional / nullable; if null/undefined the markers are simply not drawn).

**Todo List**  
1. In `Waveform.tsx`, extend the `Props` interface with `cueNorm?: number`, `loopIn?: number`, `loopOut?: number`, `loopActive?: boolean`.
2. In the `draw` callback, after drawing the playhead, compute pixel X positions for each marker using the same window transform.
3. Draw the loop region fill (semi-transparent) between loopIn and loopOut X positions (only when `loopActive`).
4. Draw a coloured vertical line for loop-in (yellow-green), loop-out (orange), and cue (green).
5. Draw short text labels ("IN", "OUT", "CUE") above each line.
6. In `DeckPanel.tsx`, pass `cueNorm={deck.state.cueNorm}`, `loopIn={deck.state.loopIn}`, `loopOut={deck.state.loopOut}`, `loopActive={deck.state.loopActive}` to `<Waveform>`.

**Relevant Context**  
- [`Waveform.tsx` — `draw` callback](src/components/Waveform.tsx:82)
- [`DeckPanel.tsx` — Waveform usage](src/components/DeckPanel.tsx:63)
- Reference screenshot: phase4-feature4.png — shows IN/OUT/CUE labels and loop shading

**Status** — `[ ] pending`

---

## Dependency Order

```
Sub-Task 1 (state + reducer)
    ↓
Sub-Task 2 (tempo knob UI)   Sub-Task 3 (loop audio graph)
                                    ↓
                             Sub-Task 4 (cue/loop UI buttons)
                                    ↓
                             Sub-Task 5 (waveform markers)
```

Sub-Tasks 2 and 3 can be done in parallel after Sub-Task 1. Sub-Tasks 4 and 5 require Sub-Task 3 (to have `jumpToCue`, `toggleLoop` etc. available).

---

## Files Changed

| File | Change |
|------|--------|
| `src/deck.ts` | Extend `DeckState`, `initialDeckState`; add loop graph in `buildDeckSignal` |
| `src/useDeck.ts` | Add actions, reducer cases, helpers for cue/loop/tempo |
| `src/components/DeckControls.tsx` | Add TEMPO knob |
| `src/components/DeckPanel.tsx` | Add cue row, loop row; pass markers to Waveform |
| `src/components/Waveform.tsx` | Accept marker props; draw them in `draw` |
| `src/index.css` | Add `.cue-row`, `.loop-row`, `.btn.active` styles |

No new files, no new dependencies.
