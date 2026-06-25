Copy this results file and paste it into your own repo to showcase your results! Lab results do not count towards your score you'll receive for your submission, but we encourage you to show off what you learned in the lab!

# Add your experiment results and reflections here

## Football Lab (June Challenge) — Soccer Match Predictor

### What I built
A full ML pipeline that predicts the outcome (home win / away win / draw) of international
football matches, plus an interactive Streamlit app to query it.

- **Data:** `results.csv` — ~49,300 international matches from 1872–2026.
- **Features (8):** rolling win rate, average goals scored, and recent-form (last 5 games)
  for both teams, plus `is_neutral` and `is_major_tournament` flags. All features are computed
  from *only* matches that happened strictly before the match being predicted, so there's no
  data leakage from the future.
- **Model:** `RandomForestClassifier(n_estimators=200, max_depth=12)` from scikit-learn.
- **Train/test split:** time-based — trained on matches before 2018-01-01, tested on everything
  from 2018-01-01 onward (so the model is judged only on matches it never saw during training).
- **Artifacts saved:** `models/match_predictor.pkl` (trained model) and `models/team_data.pkl`
  (per-team stats + feature column order), used by both the notebook's `predict_match()` helper
  and the Streamlit app.
- **App:** `app.py` — a Streamlit page where you pick Team A / Team B, toggle neutral venue and
  major-tournament flags, and get win/draw/loss probabilities.

### Results

| Metric | Value |
|---|---|
| Matches used (1990 onward) | 32,212 |
| Training matches (< 2018) | 24,179 |
| Test matches (≥ 2018) | 8,033 |
| Test accuracy | **55.9%** |
| Baseline (always predict majority class — home win) | 47.2% |

The model beats the "always predict the most common outcome" baseline by about 8.7 points,
which makes sense — football is genuinely hard to predict (that's why upsets are exciting!),
but team form, historical win rate, and home/neutral venue do carry real signal.

Sample predictions from `predict_match()` (neutral venue, major tournament):

| Match | Team A win | Team B win | Draw |
|---|---|---|---|
| Brazil vs Argentina | 47.3% | 34.5% | 18.2% |
| Germany vs Brazil | 50.9% | 30.8% | 18.3% |
| Spain vs France | 44.7% | 28.8% | 26.5% |

### What I learned
- How to turn raw match-by-match data into time-aware features (no peeking at the future!).
- Why a time-based train/test split matters more than a random split for forecasting problems.
- How a Random Forest compares to a "dumb" baseline, and why beating the baseline by even a
  modest margin is meaningful for a noisy real-world outcome like sports results.
- How to wire a trained scikit-learn model + saved stats dictionary into a small Streamlit app
  so the model is actually usable interactively instead of just living in a notebook.

### Notes / things I'd try next
- Add more features: head-to-head history between the two specific teams, ranking/Elo-style
  rating instead of simple win rate, goal difference instead of just goals-for.
- Try gradient boosting (XGBoost/LightGBM) to see if it beats the Random Forest.
- Calibrate the predicted probabilities (e.g. with `CalibratedClassifierCV`) since raw RF
  probabilities tend to be overconfident/underconfident in clumps.
