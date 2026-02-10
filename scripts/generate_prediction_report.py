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
from src.preprocessing import load_csv, preprocess_pipeline

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
    df = load_csv(DATA_PATH)
    df_processed = preprocess_pipeline(df)

    X = df_processed[FEATURE_COLS]

    model = joblib.load(MODEL_PATH)
    risk_proba = model.predict_proba(X)[:, 1]

    df_result = df.copy()
    df_result["risk_proba"] = risk_proba
    df_result["risk_level"] = df_result["risk_proba"].apply(assign_risk_level)
    df_result["action"] = df_result["risk_level"].apply(assign_action)

    today = datetime.now().strftime("%Y%m%d")
    output_path = OUTPUT_DIR / f"prediction_report_{today}.csv"
    df_result.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"Saved: {output_path}")
    return df_result


if __name__ == "__main__":
    main()
