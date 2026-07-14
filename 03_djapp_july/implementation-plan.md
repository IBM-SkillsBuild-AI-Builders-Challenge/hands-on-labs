# Phase 4 Implementation Plan — DeckFlow Web

> **Starting point:** Phase 3 — two-deck mixer with EQ, DJ filter, crossfader, master volume, waveform + zoom, click-to-seek.
> **Goal:** Add varispeed tempo, in-mix cue point, manual loop, and waveform markers.

---

## High-Level Overview

Phase 4 introduces the "DJ feel" layer: the ability to speed up or slow down a deck, mark a jump-back point, and lock a section of audio into a seamless loop. A fourth cross-cutting piece draws all three of these markers visually on the waveform canvas.

### Features at a glance

| Feature | What it does | Where the work lands |
|---|---|---|
| **Varispeed tempo** | A TEMPO knob (50%–200%) per deck scales the playback rate; pitch moves with tempo (no time-stretching) | `deck.ts` (already wired), `useDeck.ts` (new action), `DeckControls.tsx` (new knob) |
| **In-mix cue point** | "Set Cue" stamps the current playhead; "⏮ Cue" jumps back to it instantly | `deck.ts` (new state), `useDeck.ts` (new actions), `DeckPanel.tsx` (new buttons) |
| **Manual loop** | "Loop In" / "Loop Out" mark a region; "Loop ON" toggles seamless audio wrapping via a floored-modulo Elementary graph | `deck.ts` (new state + graph), `useDeck.ts` (new actions), `DeckPanel.tsx` (new buttons) |
| **Waveform markers** | Coloured vertical lines for IN / OUT / CUE, semi-transparent shading for the active loop region | `Waveform.tsx` (additive draw calls), `DeckPanel.tsx` (pass new props) |

### How the features relate to the existing code

- **`DeckState`** is the single source of truth. All new properties (`cueNorm`, `loopIn`, `loopOut`, `loopActive`) live here alongside the existing `tempo` field (already present but not yet driven by a UI control).
- **`buildDeckSignal`** in `deck.ts` already reads `s.tempo` correctly — varispeed costs zero audio-graph changes. The loop wrapping is the only new audio-graph logic.
- **`useDeck`** exposes everything to the UI via a reducer + `useCallback` helpers. Every new UI action maps to one new reducer case.
- **`Waveform.tsx`** receives the marker positions as optional props and draws them after the playhead — purely additive.

### Files changed — complete list

| File | Type of change |
|---|---|
| `src/deck.ts` | Extend `DeckState` + `initialDeckState`; add loop graph nodes in `buildDeckSignal` |
| `src/useDeck.ts` | New `Action` variants, reducer cases, `UseDeck` helpers |
| `src/components/DeckControls.tsx` | Add TEMPO `Knob` |
| `src/components/DeckPanel.tsx` | Add cue row + loop row; pass marker props to `Waveform` |
| `src/components/Waveform.tsx` | Accept marker props; draw IN / OUT / CUE lines + loop region |
| `src/index.css` | Add `.cue-row`, `.loop-row`, `.btn.active` styles |

**No new files. No new npm dependencies.**

---

## Feature 1 — Varispeed Tempo

### What it is

A per-deck TEMPO knob that scales the playback rate. Because the transport increment is `tempo / (totalFrames − 1)` per output sample, doubling `tempo` plays the track twice as fast and an octave higher — varispeed, identical to how a vinyl pitch control works.

### How it already works in Phase 3

[`buildDeckSignal`](src/deck.ts:122) computes:

```ts
const incPerSample = s.tempo / Math.max(1, totalFrames - 1);
```

`tempo` is already in `DeckState` (initialized to `1`). The audio graph is complete — **zero changes needed to `deck.ts`** for this feature. What is missing:

1. A reducer action to mutate `tempo`.
2. A helper in `useDeck` to call it.
3. A knob in the `DeckControls` strip.

### State changes (`deck.ts` / `useDeck.ts`)

**`DeckState`** — `tempo: number` already exists, no change needed.

**New `Action`:**
```ts
{ type: 'SET_TEMPO'; value: number }
```

**New reducer case:**
```ts
case 'SET_TEMPO':
  return { ...s, tempo: Math.max(0.5, Math.min(2.0, a.value)) };
```

**New `UseDeck` helper:**
```ts
setTempo: (value: number) => void;
```

### UI changes (`DeckControls.tsx`)

Add a TEMPO `Knob` to the console strip, to the right of the existing FILTER knob:

- Label: `"TEMPO"`
- Range: `min=0.5`, `max=2.0`, `defaultValue=1.0`
- Format: `(v) => \`${Math.round(v * 100)}%\``  → shows `"100%"` at 1×
- `onChange`: `deck.setTempo`

### Outcome

The TEMPO knob appears in the console strip. Dragging it changes the playback speed of that deck in real time with no clicks (Elementary diffs only the `_inc` const value).

---

## Feature 2 — In-Mix Cue Point

### What it is

A single saved position per deck. The DJ presses **Set Cue** at a musical landmark (e.g. a downbeat) and can jump back to it at any time by pressing **⏮ Cue**. Useful for re-entering a mix from a known point.

### State changes (`deck.ts` / `useDeck.ts`)

**`DeckState` — new field:**
```ts
cueNorm: number;   // normalized position 0..1; 0 = not set / start of track
```

**`initialDeckState` addition:**
```ts
cueNorm: 0,
```

**`LOAD` reset:** `cueNorm` resets to `0` on track load.

**New `Action` variants:**
```ts
| { type: 'SET_CUE';    norm: number }   // stamp current playhead as cue
| { type: 'JUMP_TO_CUE' }               // seek to stored cue
```

**New reducer cases:**
```ts
case 'SET_CUE':
  return s.track ? { ...s, cueNorm: clamp01(a.norm) } : s;

case 'JUMP_TO_CUE':
  return s.track && s.cueNorm > 0
    ? { ...s, baseNorm: s.cueNorm, seekGen: s.seekGen + 1 }
    : s;
```

**New `UseDeck` helpers:**
```ts
setCue:     (norm: number) => void;
jumpToCue:  () => void;
```

### UI changes (`DeckPanel.tsx`)

Add a **cue row** below the transport row:

```
[ Set Cue ]  [ ⏮ Cue ]  Cue: 0:21
```

- **Set Cue** — always enabled when a track is loaded; calls `deck.setCue(deck.position)`. Highlighted green (`btn active`) when `state.cueNorm > 0`.
- **⏮ Cue** — disabled when `cueNorm === 0` or no track; calls `deck.jumpToCue()`.
- **Cue label** — shows `Cue: M:SS` using the `fmt` helper when `cueNorm > 0`.

### CSS additions (`index.css`)

```css
.cue-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.btn.active {
  background: #4caf50;   /* green — matches Set Cue in screenshots */
  color: #0a0c10;
}
```

### Outcome

Each deck has a "Set Cue / ⏮ Cue" row. Setting a cue turns the button green and shows the timestamp. Pressing ⏮ Cue instantly seeks back — the Elementary accumulator resets at audio rate, so there is no click or latency.

---

## Feature 3 — Manual Loop

### What it is

The DJ marks a **Loop In** and **Loop Out** position, then toggles **Loop ON** to wrap playback seamlessly within that region. While looping the audio graph wraps the transport position using a **floored-modulo** formula (per spec §6). When the loop is turned off, playback continues from the current position without a jump.

### State changes (`deck.ts` / `useDeck.ts`)

**`DeckState` — new fields:**
```ts
loopIn:     number;    // normalized 0..1; loop start
loopOut:    number;    // normalized 0..1; loop end
loopActive: boolean;
```

**`initialDeckState` additions:**
```ts
loopIn: 0,
loopOut: 1,
loopActive: false,
```

**`LOAD` reset:** all three reset to defaults.

**New `Action` variants:**
```ts
| { type: 'SET_LOOP_IN';  norm: number }
| { type: 'SET_LOOP_OUT'; norm: number }
| { type: 'TOGGLE_LOOP';  positionNorm: number }  // carries live position for re-base on exit
```

**New reducer cases:**
```ts
case 'SET_LOOP_IN':
  return s.track ? { ...s, loopIn: clamp01(a.norm) } : s;

case 'SET_LOOP_OUT':
  return s.track ? { ...s, loopOut: clamp01(a.norm) } : s;

case 'TOGGLE_LOOP':
  if (!s.track) return s;
  if (s.loopActive) {
    // Exiting loop: re-base so playback continues from the current wrapped position.
    return { ...s, loopActive: false, baseNorm: clamp01(a.positionNorm), seekGen: s.seekGen + 1 };
  }
  return { ...s, loopActive: true };
```

> **Why `positionNorm` on exit?** While looping, the accumulator has been running modulo the loop length. When we remove the loop wrap from the graph, the raw accumulator value would jump to a position outside the loop region. Re-basing sets `baseNorm` to the current *wrapped* position and resets the accumulator to zero — playback continues from exactly where it was.

**New `UseDeck` helpers:**
```ts
setLoopIn:  (norm: number) => void;
setLoopOut: (norm: number) => void;
toggleLoop: (positionNorm: number) => void;
```

### Audio graph changes (`deck.ts` — `buildDeckSignal`)

When `loopActive` is `true`, the position signal fed to `el.table` is replaced with a wrapped version:

```
relPos      = position − loopIn
wrappedPos  = loopIn + (relPos − loopLen · floor(relPos / loopLen))
```

Built from Elementary primitives:

```ts
const loopLen = Math.max(1 / totalFrames, s.loopOut - s.loopIn);

const loopInNode  = el.const({ key: `${id}_loopIn`,  value: s.loopIn });
const loopLenNode = el.const({ key: `${id}_loopLen`, value: loopLen });

const relPos     = el.sub(position, loopInNode);
const wrapped    = el.add(loopInNode,
                    el.sub(relPos,
                      el.mul(loopLenNode,
                        el.floor(el.div(relPos, loopLenNode)))));

const readPos = s.loopActive ? wrapped : position;
```

`readPos` replaces `position` in the two `el.table` calls.

**Key points:**
- `loopLen` is clamped to avoid division by zero (`1/totalFrames` minimum).
- The graph shape changes when `loopActive` toggles; Elementary re-diffs the whole tree. The accumulator node keeps its state because its `key` (`${id}_seek`, `${id}_inc`, `${id}_base`) is unchanged.
- All new `el.const` nodes carry stable keys, so re-rendering while looping only nudges `loopIn`/`loopLen` values — no clicks.

### UI changes (`DeckPanel.tsx`)

Add a **loop row** below the cue row:

```
[ Loop In ]  [ Loop Out ]  [ ◌ Loop ON ]  0:21 – 0:42
```

- **Loop In** — calls `deck.setLoopIn(deck.position)`.
- **Loop Out** — calls `deck.setLoopOut(deck.position)`.
- **◌ Loop ON** — calls `deck.toggleLoop(deck.position)`; highlighted green when `state.loopActive`.
- **Range label** — shows `M:SS – M:SS` using `fmt` and `track.duration`.
- All three buttons disabled when no track loaded.

### CSS additions (`index.css`)

```css
.loop-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.3rem;
}
```

The `.btn.active` class added for the cue feature is reused for Loop ON.

### Outcome

The DJ can mark any region and loop it indefinitely. Toggling the loop off continues playback from exactly the current position. The waveform (Feature 4) shows the region visually.

---

## Feature 4 — Waveform Markers

### What it is

The existing `Waveform` canvas gains three coloured vertical marker lines (CUE, IN, OUT) and a semi-transparent shaded fill between IN and OUT when the loop is active. All drawing happens inside the existing `draw` callback — same coordinate space as the playhead.

### Props changes (`Waveform.tsx`)

Extend the `Props` interface with optional marker props:

```ts
interface Props {
  peaks:      TrackPeaks | null;
  position:   number;
  onSeek:     (norm: number) => void;
  // Phase 4 additions — all optional; absent = not drawn
  cueNorm?:   number;
  loopIn?:    number;
  loopOut?:   number;
  loopActive?: boolean;
}
```

### Drawing logic (`draw` callback)

After the existing playhead line, add:

```
1.  Compute pixel X for each marker:
      markerX(norm) = ((norm * total) − start) / win * cssW

2.  Loop region fill (only when loopActive):
      ctx.fillStyle = 'rgba(76, 194, 255, 0.12)'
      ctx.fillRect(loopInX, 0, loopOutX − loopInX, cssH)

3.  Loop-in line:
      colour #a8ff78 (yellow-green), 1.5px, label "IN" at top

4.  Loop-out line:
      colour #ff8c42 (orange), 1.5px, label "OUT" at top

5.  Cue line (only when cueNorm > 0):
      colour #4caf50 (green), 1.5px, label "CUE" at top
```

Markers outside the visible window (`markerX < 0` or `markerX > cssW`) are skipped.

Label style: `font: '9px system-ui'`, `fillStyle` matching the line colour, drawn 4px above the top of the canvas.

### Props wired in `DeckPanel.tsx`

```tsx
<Waveform
  peaks={track?.peaks ?? null}
  position={deck.position}
  onSeek={deck.seek}
  cueNorm={deck.state.cueNorm}
  loopIn={deck.state.loopIn}
  loopOut={deck.state.loopOut}
  loopActive={deck.state.loopActive}
/>
```

The new props are passed unconditionally — `Waveform` skips drawing when values are at their defaults (`0`, `1`, `false`).

### Outcome

The waveform shows the cue point as a green line, loop-in as yellow-green, loop-out as orange, and the loop region as a faint blue fill — matching the `phase4-feature4.png` reference screenshot.

---

## Implementation Order

The five sub-tasks have the following dependency chain:

```
[1] Extend DeckState + reducer
        │
        ├──▶ [2] Tempo knob in DeckControls   (UI only, no audio change)
        │
        └──▶ [3] Loop audio graph in deck.ts
                    │
                    └──▶ [4] Cue + Loop buttons in DeckPanel
                                │
                                └──▶ [5] Waveform markers
```

Sub-Tasks 2 and 3 can be done in parallel after Sub-Task 1 is complete.

---

## Sub-Task Checklist

| # | Sub-task | Status |
|---|---|---|
| 1 | Extend `DeckState` + `initialDeckState`; add all new `Action` types, reducer cases, and `UseDeck` helpers | `[ ] pending` |
| 2 | Add TEMPO `Knob` to `DeckControls.tsx`; add `SET_TEMPO` action and `setTempo` helper | `[ ] pending` |
| 3 | Add floored-modulo loop wrap to `buildDeckSignal` in `deck.ts` | `[ ] pending` |
| 4 | Add cue row + loop row to `DeckPanel.tsx`; add `.cue-row`, `.loop-row`, `.btn.active` CSS | `[ ] pending` |
| 5 | Extend `Waveform.tsx` props; draw IN / OUT / CUE markers + loop region fill | `[ ] pending` |
