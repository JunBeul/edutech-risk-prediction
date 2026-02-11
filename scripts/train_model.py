"""
Train and save risk prediction model.

Usage:
python scripts/train_model.py
"""

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

from src.config import FEATURE_COLS
from src.preprocessing import load_csv, preprocess_pipeline

DATA_PATH = PROJECT_ROOT / "data/dummy/dummy_midterm_like_labeled.csv"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "logistic_model.joblib"

def main():
    df = load_csv(DATA_PATH)
    dfp = preprocess_pipeline(df)
    if "at_risk" not in dfp.columns:
        dfp = preprocess_pipeline(df, add_labels=True)
    if "at_risk" not in dfp.columns:
        raise ValueError("Missing target column 'at_risk' after preprocessing.")

    X = dfp.reindex(columns=FEATURE_COLS)
    y = dfp["at_risk"]

    model = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="constant", fill_value=0)),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
    ])

    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    print("Saved model:", MODEL_PATH)

if __name__ == "__main__":
    main()
