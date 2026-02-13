"""
Generate Risk Prediction Report (Refactored)

- 공통 리포트 로직(src/report_logic.py) 호출 기반
- CSV → 전처리 → 모델 추론 → 리포트 컬럼 생성 → CSV 저장

실행 예시:
    python -m scripts.generate_prediction_report

정책 주입 예시:
    python -m scripts.generate_prediction_report --data data/dummy/dummy_midterm_like_labeled.csv
    python -m scripts.generate_prediction_report --policy-json '{\"threshold\":0.4,\"midterm_max\":100,\"midterm_weight\":40,\"final_max\":100,\"final_weight\":40,\"performance_max\":100,\"performance_weight\":20,\"total_classes\":160}'
"""

from __future__ import annotations

from pathlib import Path
import sys
from datetime import datetime
import json
import argparse

import joblib
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import FEATURE_COLS, EVALUATION_POLICY
from src.preprocessing import load_csv, preprocess_pipeline
from src.report_logic import (
    parse_policy_json,
    enrich_report,
    assign_risk_level,
    assign_action,
)


DEFAULT_DATA_PATH = PROJECT_ROOT / "data/dummy/dummy_midterm_like_labeled.csv"
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models/logistic_model.joblib"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "reports/tables"


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=str, default=str(DEFAULT_DATA_PATH), help="입력 CSV 경로")
    p.add_argument("--model", type=str, default=str(DEFAULT_MODEL_PATH), help="joblib 모델 경로")
    p.add_argument("--outdir", type=str, default=str(DEFAULT_OUTPUT_DIR), help="출력 폴더")
    p.add_argument(
        "--policy-json",
        type=str,
        default="",
        help="EVALUATION_POLICY를 JSON 문자열로 직접 전달(우선 적용)",
    )
    return p.parse_args()


def main() -> pd.DataFrame:
    args = _parse_args()

    data_path = PROJECT_ROOT / args.data if not Path(args.data).is_absolute() else Path(args.data)
    model_path = PROJECT_ROOT / args.model if not Path(args.model).is_absolute() else Path(args.model)
    outdir = PROJECT_ROOT / args.outdir if not Path(args.outdir).is_absolute() else Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    # 1) Load raw
    df_raw = load_csv(str(data_path))

    # 2) Preprocess (결측 플래그 포함)
    df_processed = preprocess_pipeline(df_raw)
    df_result = df_processed.copy()

    # 3) Model predict
    if not model_path.exists():
        raise FileNotFoundError(f"모델 파일이 없습니다: {model_path}")

    model = joblib.load(model_path)

    # 모델이 학습 당시 feature_names_in_이 있으면 그것을 우선 사용(정렬/누락 방어)
    feature_cols = list(getattr(model, "feature_names_in_", FEATURE_COLS))
    X = df_result.reindex(columns=feature_cols)

    risk_proba = model.predict_proba(X)[:, 1]
    df_result["risk_proba"] = risk_proba
    df_result["risk_level"] = df_result["risk_proba"].apply(assign_risk_level)
    df_result["action"] = df_result["risk_level"].apply(assign_action)

    # 4) Policy 적용(우선순위: --policy-json > src.config.EVALUATION_POLICY)
    if args.policy_json.strip():
        policy_json = args.policy_json
    else:
        policy_json = json.dumps(EVALUATION_POLICY, ensure_ascii=False)

    policy_obj = parse_policy_json(policy_json)

    # 5) Report enrichment (participation / reasons / guidance / absence ...)
    df_result = enrich_report(df_result, policy_obj)

    # 6) Column order
    preferred_cols = [
        "student_id",
        "risk_proba",
        "risk_level",
        "top_reasons",
        "score_guidance",
        "action",
        "absence_limit",
        "remaining_absence_allowance",
        "participation_risk_score",
        "participation_flag",
    ]
    save_cols = (
        [c for c in preferred_cols if c in df_result.columns]
        + [c for c in df_result.columns if c not in preferred_cols]
    )
    df_result = df_result[save_cols]

    # 7) Save
    today = datetime.now().strftime("%Y%m%d")
    output_path = outdir / f"prediction_report_{today}.csv"
    df_result.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"Saved: {output_path}")
    return df_result


if __name__ == "__main__":
    main()
