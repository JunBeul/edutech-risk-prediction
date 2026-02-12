"""
Generate Risk Prediction Report

Usage:
python -m scripts.generate_prediction_report
"""

from pathlib import Path
import sys
from datetime import datetime
from math import floor

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd

from src.config import FEATURE_COLS, EVALUATION_POLICY
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
    
    # 7) Score guidance message (closure using EVALUATION_POLICY)
    def clamp_score(x: float, smax: float) -> float:
        # 필요한 점수가 0 미만이면 0, 만점 초과면 만점으로 클램프
        if x < 0:
            return 0.0
        if x > smax:
            return float(smax)
        return float(x)
    
    def to_w(pct: float) -> float:
        return float(pct) / 100.0
    
    T = float(EVALUATION_POLICY["threshold"])

    mmax = float(EVALUATION_POLICY["midterm_max"])
    fmax = float(EVALUATION_POLICY["final_max"])
    pmax = float(EVALUATION_POLICY["performance_max"])

    wm = to_w(EVALUATION_POLICY["midterm_weight"])
    wf = to_w(EVALUATION_POLICY["final_weight"])
    wp = to_w(EVALUATION_POLICY["performance_weight"])
    
    w_sum = wm + wf + wp
    if abs(w_sum - 1.0) > 1e-6:
        raise ValueError(f"가중치 합이 100%가 아닙니다: {w_sum*100:.2f}%")
    
    def score_guidance(row: pd.Series) -> str:
    # 원본 점수(채워진 값일 수 있으므로, missing flag로 결측 여부 판단)
        mid = pd.to_numeric(row.get("midterm_score"), errors="coerce")
        fin = pd.to_numeric(row.get("final_score"), errors="coerce")
        perf = pd.to_numeric(row.get("performance_score"), errors="coerce")

        mid_miss = int(row.get("midterm_score_missing", 0)) == 1
        fin_miss = int(row.get("final_score_missing", 0)) == 1
        perf_miss = int(row.get("performance_score_missing", 0)) == 1

        # 중간까지 결측인 데이터는 현실적으로 안내가 애매하므로 메시지 축소
        if mid_miss or pd.isna(mid):
            return "중간고사 점수 정보가 없어 성취율 역산 안내를 제공할 수 없습니다."

        # 현재 확보된 기여(결측 항목은 제외)
        base = (mid / mmax) * wm
        if (not fin_miss) and pd.notna(fin):
            base += (fin / fmax) * wf
        if (not perf_miss) and pd.notna(perf):
            base += (perf / pmax) * wp

        # 이미 기준 충족이면 안내 불필요
        if base >= T:
            return "현재 입력된 점수 기준으로 성취율 40% 기준을 충족합니다."

        needed = T - base  # 추가로 필요한 비율 기여

        # 케이스 분기
        if fin_miss and (not perf_miss):
            # 기말만 결측 -> 기말 최소 점수
            req_final = (needed / wf) * fmax if wf > 0 else float("inf")
            req_final = clamp_score(req_final, fmax)
            return f"기말고사에서 최소 {req_final:.1f}점(/{fmax:.0f}) 이상 필요합니다."

        if perf_miss and (not fin_miss):
            # 수행만 결측 -> 수행 최소 점수
            req_perf = (needed / wp) * pmax if wp > 0 else float("inf")
            req_perf = clamp_score(req_perf, pmax)
            return f"수행평가에서 최소 {req_perf:.1f}점(/{pmax:.0f}) 이상 필요합니다."

        if fin_miss and perf_miss:
            # 둘 다 결측 -> 시나리오 2줄(사용자 친화)
            # 1) 수행 만점 가정 시 기말 필요
            base_perf_full = base + (1.0 * wp)  # 수행 만점 기여
            needed_final = max(0.0, T - base_perf_full)
            req_final = (needed_final / wf) * fmax if wf > 0 else float("inf")
            req_final = clamp_score(req_final, fmax)

            # 2) 기말 만점 가정 시 수행 필요
            base_final_full = base + (1.0 * wf)  # 기말 만점 기여
            needed_perf = max(0.0, T - base_final_full)
            req_perf = (needed_perf / wp) * pmax if wp > 0 else float("inf")
            req_perf = clamp_score(req_perf, pmax)

            return (
                f"[시나리오] 수행 만점 가정 시 기말 최소 {req_final:.1f}점(/{fmax:.0f}) 필요 / "
                f"기말 만점 가정 시 수행 최소 {req_perf:.1f}점(/{pmax:.0f}) 필요"
            )

        # 결측이 없는데도 base<T인 경우: 단순 안내
        return "현재 입력된 점수 기준으로 성취율 40% 미달입니다."

    df_result["score_guidance"] = df_result.apply(score_guidance, axis=1)
    
    # 8) 결석 한도 안내
    total_classes = int(EVALUATION_POLICY["total_classes"])
    absence_limit = floor(total_classes / 3)

    df_result["absence_limit"] = absence_limit
    
    # absence_count가 결측/문자열일 수 있으므로 안전 변환
    absn = pd.to_numeric(df_result.get("absence_count"), errors="coerce").fillna(0).astype(int)
    df_result["remaining_absence_allowance"] = absence_limit - absn
    
    # 9) Column order (readability)
    preferred_cols = [
        "student_id",
        "risk_proba",
        "risk_level",
        "top_reasons",
        "score_guidance",
        "action",
        "absence_limit",
        "participation_risk_score",
        "participation_flag",
    ]

    save_cols = (
        [c for c in preferred_cols if c in df_result.columns]
        + [c for c in df_result.columns if c not in preferred_cols]
    )
    df_result = df_result[save_cols]

    # 10) Save
    today = datetime.now().strftime("%Y%m%d")
    output_path = OUTPUT_DIR / f"prediction_report_{today}.csv"
    df_result.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"Saved: {output_path}")
    return df_result

if __name__ == "__main__":
    main()
