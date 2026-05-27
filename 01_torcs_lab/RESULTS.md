# TORCS Lab – Experiment Results & Reflections

## Lab Completion Status

| Task | Status |
|------|--------|
| Task 1 – Run the baseline AI driver | ✅ Completed |
| Task 2 – Understand how the driver works | ✅ Completed |
| Task 3 – First modification (increase TARGET_SPEED) | ✅ Completed |
| Task 4 – Experiment and optimize (optional) | ✅ Completed |
| Task 5 – Record results and reflect | ✅ Completed |

---

## Task 1 – Baseline Observations

Ran `torcs_jm_par.py` with all default parameters:

```
TARGET_SPEED        = 100
STEER_GAIN          = 30
CENTERING_GAIN      = 0.20
BRAKE_THRESHOLD     = 0.9
ENABLE_TRACTION_CONTROL = True
```

**What I observed:**
- The car connected successfully over the socket and began driving immediately.
- On straight sections, the car accelerated smoothly up to roughly 100 km/h then held that speed.
- On corners, the steering was a little "twitchy" — it would overshoot the centre line slightly, oscillate, then recover.
- The car stayed on track for the entire observation run (no off-track incidents during the first lap).
- Gear changes were predictable and matched the speed thresholds in `GEAR_SPEEDS`.

---

## Task 2 – Understanding the Control Loop

The driver follows a **sense → decide → act** loop running ~50 times per second:

| Phase  | What happens |
|--------|-------------|
| **Sense** | TORCS sends `speedX`, `angle`, `trackPos`, `wheelSpinVel`, and other sensor data via UDP. |
| **Decide** | `drive_modular()` calls four helper functions to compute steer, accel, brake, and gear. |
| **Act**   | The computed commands are sent back to TORCS, which moves the car for that step. |

Key insight: the driver is **rule-based**, not learned. Every decision comes from hand-tuned formulas, not a neural network. This makes it easy to reason about cause and effect.

`calculate_steering()` is the most sensitive function: it blends *track angle correction* (point the car along the road) with *centering correction* (pull toward the centre line). STEER_GAIN and CENTERING_GAIN control the relative strength of these two forces.

---

## Task 3 – First Modification: Increase TARGET_SPEED

**Change made:**
```python
# Before
TARGET_SPEED = 100

# After
TARGET_SPEED = 150
```

**What I observed:**
- The car was noticeably faster on long straights — it reached and sustained higher speeds in the higher gears.
- Corner entry was more aggressive. The car's heading angle grew larger before the steering corrected it, meaning it was drifting slightly wider before recovering.
- On one tight hairpin the car went marginally off-track on the exit and then self-corrected (the centering logic pulled it back within 1–2 seconds).
- Overall lap character felt faster but less composed compared to the baseline.

**Conclusion:** Raising `TARGET_SPEED` alone increases pace but reduces stability, exactly as the comments in the code warn.

---

## Task 4 – Further Experiments (One Parameter at a Time)

### Experiment A – Lower STEER_GAIN (30 → 25)

Hypothesis: reducing steering sensitivity should reduce the oscillation observed at high speed.

| Parameter | Before | After |
|-----------|--------|-------|
| TARGET_SPEED | 150 | 150 |
| STEER_GAIN | 30 | **25** |

**Observation:** Oscillation on straights nearly disappeared. Corners were entered more smoothly. Trade-off: the car took slightly longer to correct after a large angle deviation, but it never went fully off-track.

---

### Experiment B – Raise CENTERING_GAIN (0.20 → 0.30)

Hypothesis: a stronger centering pull should recover the car faster after wide corner exits.

| Parameter | Before | After |
|-----------|--------|-------|
| CENTERING_GAIN | 0.20 | **0.30** |

**Observation:** Recovery after corners became noticeably quicker — the car returned to the centre line faster after the apex. However, on a very slight bend, the stronger centering introduced a brief wobble (over-correction), which damped out in ~0.5 s. Overall a net improvement.

---

### Experiment C – Lower BRAKE_THRESHOLD (0.9 → 0.6)

Hypothesis: braking earlier (at a smaller angle deviation) should prevent the car from running wide on tight corners.

| Parameter | Before | After |
|-----------|--------|-------|
| BRAKE_THRESHOLD | 0.9 | **0.6** |

**Observation:** The car braked more conservatively before sharp bends. It lost some time on medium-speed corners where braking wasn't really needed, but it never went off-track during tight hairpins. This felt like the biggest single safety improvement.

---

### Experiment D – Disable Traction Control

Just to understand what it does:

| Parameter | Value |
|-----------|-------|
| ENABLE_TRACTION_CONTROL | **False** |

**Observation:** At launch and after braking zones, the rear wheels spun noticeably before the car accelerated cleanly. On the simulator this showed as a brief hesitation followed by a lurch. Traction control clearly helps low-speed acceleration consistency. Re-enabled for the final configuration.

---

## Final Tuned Configuration

After all experiments, the configuration that gave the best balance of speed and stability:

```python
TARGET_SPEED            = 150   # Up from 100 — faster overall pace
STEER_GAIN              = 25    # Down from 30 — smoother, less oscillation
CENTERING_GAIN          = 0.30  # Up from 0.20 — faster centre recovery
BRAKE_THRESHOLD         = 0.60  # Down from 0.90 — earlier, safer braking
GEAR_SPEEDS             = [0, 20, 40, 80, 100, 180]   # Unchanged
ENABLE_TRACTION_CONTROL = True   # Kept on — wheel spin hurt low-speed exits
```

---

## Reflections

### One thing that surprised me
I expected raising `TARGET_SPEED` to be the most impactful single change, but it was actually the **combined effect** of lowering `STEER_GAIN` and raising `CENTERING_GAIN` together that made the biggest difference to lap quality. The steering and centering gains interact — they're both working on the steer output at the same time — so tuning them together rather than in isolation is important.

### One thing I would try next
I'd experiment with **speed-dependent steering gain**: reduce `STEER_GAIN` automatically when `speedX` is high and allow a higher gain at low speeds (where sharper correction is safe). This is a simple way to simulate the kind of speed-sensitive tuning that real-world control systems use. It could be implemented with a single conditional in `calculate_steering()`.

### Broader takeaway
This lab made it clear why simulation is so valuable in AI development. I was able to test and discard four different parameter sets in minutes without any real-world risk. Each iteration built intuition about which parameters affect which aspects of behavior — intuition that would be very hard to develop from documentation alone.

---

*Lab completed as part of the IBM SkillsBuild AI Builders Challenge – TORCS May Lab.*
