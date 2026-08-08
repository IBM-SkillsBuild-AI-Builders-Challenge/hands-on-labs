import streamlit as st
import pandas as pd
import joblib
from pathlib import Path

st.set_page_config(page_title="Soccer 2026 Match Predictor", page_icon="⚽", layout="centered")

@st.cache_resource
def load_artifacts():
    model = joblib.load(Path("models") / "match_predictor.pkl")
    data = joblib.load(Path("models") / "team_data.pkl")
    return model, data["team_stats"], data["feature_cols"]

model, team_stats, feature_cols = load_artifacts()
team_names = sorted(team_stats.keys())

st.title("⚽ Soccer 2026 Match Predictor")
st.caption("Based on historical international football results (1872–present).")

col1, col2 = st.columns(2)
with col1:
    team_a = st.selectbox(
        "Team A", team_names,
        index=team_names.index("Brazil") if "Brazil" in team_names else 0,
    )
with col2:
    team_b = st.selectbox(
        "Team B", team_names,
        index=team_names.index("Argentina") if "Argentina" in team_names else 1,
    )

neutral = st.checkbox("Neutral venue", value=True)
major = st.checkbox("Major tournament (e.g. World Cup)", value=True)

if st.button("Predict", type="primary", use_container_width=True):
    if team_a == team_b:
        st.error("Please pick two different teams.")
    else:
        a, b = team_stats[team_a], team_stats[team_b]
        row = pd.DataFrame([{
            "team_a_winrate": a["winrate"],
            "team_b_winrate": b["winrate"],
            "team_a_goal_avg": a["goal_avg"],
            "team_b_goal_avg": b["goal_avg"],
            "team_a_recent_form": a["recent_form"],
            "team_b_recent_form": b["recent_form"],
            "is_neutral": int(neutral),
            "is_major_tournament": int(major),
        }])[feature_cols]

        proba = model.predict_proba(row)[0]
        p_a, p_draw, p_b = float(proba[0]), float(proba[1]), float(proba[2])

        st.subheader("Predicted outcome")
        c1, c2, c3 = st.columns(3)
        c1.metric(f"{team_a} wins", f"{p_a*100:.1f}%")
        c2.metric("Draw", f"{p_draw*100:.1f}%")
        c3.metric(f"{team_b} wins", f"{p_b*100:.1f}%")

        st.progress(p_a, text=f"{team_a}: {p_a*100:.1f}%")
        st.progress(p_draw, text=f"Draw: {p_draw*100:.1f}%")
        st.progress(p_b, text=f"{team_b}: {p_b*100:.1f}%")

        st.subheader("Team stats used")
        stats_df = pd.DataFrame({
            team_a: {
                "Win rate":              f"{a['winrate']:.3f}",
                "Avg goals scored":      f"{a['goal_avg']:.2f}",
                "Recent form (last 10)": f"{a['recent_form']:.2f}",
                "Matches played":        a["matches_played"],
            },
            team_b: {
                "Win rate":              f"{b['winrate']:.3f}",
                "Avg goals scored":      f"{b['goal_avg']:.2f}",
                "Recent form (last 10)": f"{b['recent_form']:.2f}",
                "Matches played":        b["matches_played"],
            },
        })
        st.table(stats_df)
