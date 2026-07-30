# Phase 4 Implementation Plan

## High-level overview

Phase 4 extends the existing Phase 3 mixer with the DJ-oriented features that make the decks feel more like a real performance tool. The current app already supports:

- two decks,
- track loading and decoding,
- play/pause and click-to-seek,
- EQ, filter, volume, and crossfader controls,
- a canvas waveform with playhead feedback.

Phase 4 should build on that foundation by adding:

- tempo control for each deck,
- manual loop entry and exit points,
- a cue point that jumps playback back to a saved position,
- visible cue and loop markers on the waveform.

The implementation should remain aligned with the current architecture:

- keep the transport and graph logic in the deck layer,
- keep React state in the deck hook,
- keep live playhead and meter updates out of the reducer,
- and preserve the lightweight canvas-based waveform rendering.

The goal is to add these features without changing the app's overall structure or breaking the Phase 3 experience.

---

## Current baseline

The app is currently at the Phase 3 stage and already provides the core mixer foundation. Phase 4 should be treated as a targeted extension of that foundation rather than a redesign.

Key implementation constraints:

- playback is driven by a normalized transport built in the deck audio graph,
- seeking already works through a resettable accumulator pattern,
- waveform rendering is already optimized with a cached bitmap,
- the deck hook is the right place for per-deck UI state.

---

## Feature 1: Tempo control

### Goal
Allow each deck to play faster or slower than the original track while keeping the existing transport model intact.

### Scope
- Add a tempo control to each deck.
- Support a practical range around the default value, such as 0.8x to 1.2x.
- Make tempo changes affect playback speed without breaking play, pause, or seek behavior.

### Implementation approach
1. Extend the deck state with a tempo field, defaulting to 1.0.
2. Update the transport math so the per-sample increment uses the tempo value.
3. Expose a simple UI control in the deck panel or deck controls area.
4. Keep the playhead and waveform view consistent after tempo changes.

### Files likely to change
- [src/deck.ts](src/deck.ts)
- [src/useDeck.ts](src/useDeck.ts)
- [src/components/DeckPanel.tsx](src/components/DeckPanel.tsx)
- [src/components/DeckControls.tsx](src/components/DeckControls.tsx)

### Acceptance criteria
- Each deck can increase or decrease tempo.
- Playback remains smooth after changing tempo.
- Seek and pause/resume continue to work normally.
- The current tempo value is visible in the UI.

### Notes
This should be implemented as a small extension of the existing varispeed transport, not as an entirely new playback system.

---

## Feature 2: Loops

### Goal
Let the user define a loop region on each deck and repeat that section while looping is enabled.

### Scope
- Add a loop toggle for each deck.
- Add loop in and loop out controls or actions.
- When looping is active, playback should wrap inside the selected range.
- When looping is disabled, playback should continue normally.

### Implementation approach
1. Add loop state to the deck model:
   - `loopEnabled`
   - `loopStart`
   - `loopEnd`
2. Extend the deck graph so the normalized position is wrapped into the active loop region using the floored-mod approach described in the spec.
3. Make loop enable/disable and loop set actions part of the deck hook state.
4. Keep loop changes from breaking the current transport state or seek handling.
5. Use the waveform as the visual place where loop points can be understood and later edited.

### Files likely to change
- [src/deck.ts](src/deck.ts)
- [src/useDeck.ts](src/useDeck.ts)
- [src/components/DeckPanel.tsx](src/components/DeckPanel.tsx)
- [src/components/Waveform.tsx](src/components/Waveform.tsx)

### Acceptance criteria
- The user can enable and disable looping.
- The user can define a loop region.
- Playback repeats inside the loop while enabled.
- Disabling the loop returns playback to normal behavior.

### Notes
The implementation should follow the spec’s floored-mod wrap behavior so the loop logic is consistent with the existing audio-graph model.

---

## Feature 3: Cue point

### Goal
Add a simple in-mix cue point so the user can jump back to a saved position quickly.

### Scope
- Add a cue point to each deck.
- Allow the user to set the cue point to the current playhead position.
- Allow the user to jump back to that cue point instantly.
- Keep the feature simple and deterministic for the Phase 4 scope.

### Implementation approach
1. Add cue-related state to the deck model:
   - `cuePosition`
   - `cueSet`
2. Add a button to set the cue point from the current playback position.
3. Add a button to jump the deck back to the cue point.
4. Make the cue action work while paused or while playing.
5. Keep cue handling as a transport jump rather than a separate playback mode.

### Files likely to change
- [src/deck.ts](src/deck.ts)
- [src/useDeck.ts](src/useDeck.ts)
- [src/components/DeckPanel.tsx](src/components/DeckPanel.tsx)
- [src/components/Waveform.tsx](src/components/Waveform.tsx)

### Acceptance criteria
- The user can set a cue point at the current position.
- The user can jump back to that cue point.
- The cue behavior works during playback and while paused.
- The UI clearly indicates whether a cue point is set.

### Notes
This should be implemented as a lightweight transport jump to a normalized position so it does not add complexity to the audio graph.

---

## Feature 4: Waveform markers

### Goal
Make cue points and loops visible directly on the waveform so the user can understand and manage them visually.

### Scope
- Draw cue markers on the waveform.
- Draw loop start and loop end markers on the waveform.
- Keep markers aligned with the current zoom and playhead position.
- Preserve the current performance model for waveform rendering.

### Implementation approach
1. Extend the waveform component props to receive cue and loop values from the deck.
2. Render marker lines on top of the existing cached waveform bitmap.
3. Keep the existing offscreen-canvas rendering strategy for performance.
4. Update marker positions whenever the playhead, zoom, or deck state changes.
5. Leave room for future click-to-edit marker interactions if time allows.

### Files likely to change
- [src/components/Waveform.tsx](src/components/Waveform.tsx)
- [src/components/DeckPanel.tsx](src/components/DeckPanel.tsx)
- [src/useDeck.ts](src/useDeck.ts)
- [src/deck.ts](src/deck.ts)

### Acceptance criteria
- Cue and loop positions appear on the waveform.
- Markers stay aligned when playback moves or the waveform is zoomed.
- The visual design stays clear and does not interfere with the playhead display.

### Notes
Because waveform rendering is already optimized, markers should be drawn as a lightweight overlay rather than a full waveform redraw per frame.

---

## Suggested implementation order

1. Tempo control
2. Cue point
3. Loops
4. Waveform markers

This order keeps the transport logic simple first, adds the deck-level controls next, and finishes with the visual layer.

---

## Risks and attention points

- The transport logic in [src/deck.ts](src/deck.ts) is central and should be changed carefully to avoid breaking seek and playback.
- Loop behavior must preserve the correct transport state when enabled or disabled.
- Marker rendering should stay lightweight so the app remains responsive.
- The UI should remain simple and consistent with the existing deck layout.
