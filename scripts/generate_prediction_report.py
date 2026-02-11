"""
Generate Risk Prediction Report

Usage:
python -m scripts.generate_prediction_report
"""

from pathlib import Path
import sys
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd

from src.config import FEATURE_COLS
from src.preprocessing import load_csv, preprocess_pipeline, basic_cleaning

DATA_PATH = PROJECT_ROOT / "data/dummy/dummy_midterm_like_labeled.csv"
MODEL_PATH = PROJECT_ROOT / "models/logistic_model.joblib"

OUTPUT_DIR = PROJECT_ROOT / "reports/tables"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def assign_risk_level(p: float) -> str:
    if p >= 0.70:
        return "High"
    if p >= 0.40:
        return "Medium"
    return "Low"

def assign_action(level: str) -> str:
    if level == "High":
        return "즉시 상담 및 보충학습 개입 필요"
    if level == "Medium":
        return "과제 참여 모니터링 및 사전 지도"
    return "일반 관찰 유지"

def main() -> pd.DataFrame:
    # 1) Load raw
    df_raw = load_csv(DATA_PATH)

    # 2) Clean for missing-check (before fill_missing)
    df_clean = basic_cleaning(df_raw)

    # 결측 여부 판단용 맵 (student_id -> {final_isna, perf_isna})
    # NOTE: student_id가 유니크하다는 전제. 중복 가능하면 먼저 drop_duplicates 기준을 합의해야 함.
    score_subset = df_clean.set_index("student_id").reindex(
        columns=["final_score", "performance_score"]
    )
    missing_map = (
        score_subset.isna()
        .rename(columns={"final_score": "final_isna", "performance_score": "perf_isna"})
        .to_dict(orient="index")
    )

    # 3) Preprocess for model/report (after fill_missing etc.)
    df_processed = preprocess_pipeline(df_raw)
    df_result = df_processed.copy()

    # 4) Predict (use df_result for alignment)
    model = joblib.load(MODEL_PATH)
    feature_cols = list(getattr(model, "feature_names_in_", FEATURE_COLS))
    X = df_result.reindex(columns=feature_cols)
    risk_proba = model.predict_proba(X)[:, 1]

    df_result["risk_proba"] = risk_proba
    df_result["risk_level"] = df_result["risk_proba"].apply(assign_risk_level)
    df_result["action"] = df_result["risk_level"].apply(assign_action)

    # 5) Participation composite (bottom 15%)
    q_assign = df_result["assignment_count"].quantile(0.15)
    q_question = df_result["question_count"].quantile(0.15)

    df_result["participation_risk_score"] = 0
    df_result.loc[df_result["assignment_count"] <= q_assign, "participation_risk_score"] += 1
    df_result.loc[df_result["question_count"] <= q_question, "participation_risk_score"] += 1
    df_result.loc[df_result["participation_level"] == "하", "participation_risk_score"] += 2
    df_result["participation_flag"] = (df_result["participation_risk_score"] >= 2).astype(int)

    # 6) Build reasons (closure using missing_map)
    def build_reasons(row: pd.Series) -> str:
        reasons = []
        sid = row.get("student_id")
        miss = missing_map.get(sid, {"final_isna": False, "perf_isna": False})
        absn = pd.to_numeric(row.get("absence_count"), errors="coerce")
        mid = pd.to_numeric(row.get("midterm_score"), errors="coerce")
        fin = pd.to_numeric(row.get("final_score"), errors="coerce")
        perf = pd.to_numeric(row.get("performance_score"), errors="coerce")

        # 1) 결석
        if pd.notna(absn) and absn >= 5:
            reasons.append("결석 횟수 높음")

        # 2) 중간
        if pd.notna(mid) and mid < 50:
            reasons.append("중간고사 성적 낮음")

        # 3) 기말 (원본에서 결측이면 제외)
        if (not miss.get("final_isna", False)) and pd.notna(fin) and fin < 50:
            reasons.append("기말고사 성적 낮음")

        # 4) 수행 (원본에서 결측이면 제외)
        if (not miss.get("perf_isna", False)) and pd.notna(perf) and perf < 50:
            reasons.append("수행평가 성적 낮음")

        # 5) 참여도 종합
        if row.get("participation_flag", 0) == 1:
            reasons.append("학습 참여도 저하(과제/질문/참여)")

        return ", ".join(reasons[:3]) if reasons else "특이 요인 없음"

    df_result["top_reasons"] = df_result.apply(build_reasons, axis=1)

    # 7) Column order (readability)
    preferred_cols = [
        "student_id",
        "risk_proba",
        "risk_level",
        "top_reasons",
        "action",
        "participation_risk_score",
        "participation_flag",
    ]

    save_cols = (
        [c for c in preferred_cols if c in df_result.columns]
        + [c for c in df_result.columns if c not in preferred_cols]
    )
    df_result = df_result[save_cols]

    # 8) Save
    today = datetime.now().strftime("%Y%m%d")
    output_path = OUTPUT_DIR / f"prediction_report_{today}.csv"
    df_result.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"Saved: {output_path}")
    return df_result

if __name__ == "__main__":
    main()
