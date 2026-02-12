from __future__ import annotations

import json
from dataclasses import dataclass
from math import floor
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd


# -----------------------------
# Policy
# -----------------------------
@dataclass(frozen=True)
class EvaluationPolicy:
    threshold: float
    midterm_max: float
    midterm_weight: float  # percent (0~100)
    final_max: float
    final_weight: float    # percent (0~100)
    performance_max: float
    performance_weight: float  # percent (0~100)
    total_classes: int


def parse_policy_json(policy_json: str) -> EvaluationPolicy:
    """
    policy_json: multipart로 넘어오는 문자열(JSON)
    """
    try:
        raw: Dict[str, Any] = json.loads(policy_json)
    except Exception as e:
        raise ValueError(f"policy JSON 파싱 실패: {e}")

    required = [
        "threshold",
        "midterm_max", "midterm_weight",
        "final_max", "final_weight",
        "performance_max", "performance_weight",
        "total_classes",
    ]
    missing = [k for k in required if k not in raw]
    if missing:
        raise ValueError(f"policy 누락 키: {missing}")

    policy = EvaluationPolicy(
        threshold=float(raw["threshold"]),
        midterm_max=float(raw["midterm_max"]),
        midterm_weight=float(raw["midterm_weight"]),
        final_max=float(raw["final_max"]),
        final_weight=float(raw["final_weight"]),
        performance_max=float(raw["performance_max"]),
        performance_weight=float(raw["performance_weight"]),
        total_classes=int(raw["total_classes"]),
    )
    validate_policy(policy)
    return policy


def validate_policy(p: EvaluationPolicy) -> None:
    # threshold
    if not (0.0 < p.threshold < 1.0):
        raise ValueError("threshold는 0~1 사이 실수여야 합니다. (예: 0.40)")

    # max > 0 (weight가 0이면 max는 무시 가능하지만, 입력은 보통 양수로 고정)
    for name, v in [
        ("midterm_max", p.midterm_max),
        ("final_max", p.final_max),
        ("performance_max", p.performance_max),
    ]:
        if v <= 0:
            raise ValueError(f"{name}는 0보다 커야 합니다.")

    # weights sum = 100
    wsum = p.midterm_weight + p.final_weight + p.performance_weight
    if abs(wsum - 100.0) > 1e-6:
        raise ValueError(f"반영비율 합이 100이 아닙니다: {wsum}")

    # weights >= 0
    for name, v in [
        ("midterm_weight", p.midterm_weight),
        ("final_weight", p.final_weight),
        ("performance_weight", p.performance_weight),
    ]:
        if v < 0:
            raise ValueError(f"{name}는 음수가 될 수 없습니다.")

    # total_classes
    if p.total_classes <= 0:
        raise ValueError("total_classes는 1 이상의 정수여야 합니다.")


# -----------------------------
# Utilities
# -----------------------------
def assign_risk_level(prob: float) -> str:
    if prob >= 0.70:
        return "High"
    if prob >= 0.40:
        return "Medium"
    return "Low"


def assign_action(level: str) -> str:
    if level == "High":
        return "즉시 상담 및 보충학습 개입 필요"
    if level == "Medium":
        return "과제 참여 모니터링 및 사전 지도"
    return "일반 관찰 유지"


def _clamp_score(x: float, smax: float) -> float:
    if x < 0:
        return 0.0
    if x > smax:
        return float(smax)
    return float(x)


def add_participation_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    참여도 종합 점수:
    - 과제 제출 하위 15%: +1
    - 질문 횟수 하위 15%: +1
    - participation_level == '하': +2
    => 합 >= 2면 participation_flag=1
    """
    out = df.copy()
    q_assign = out["assignment_count"].quantile(0.15)
    q_question = out["question_count"].quantile(0.15)

    out["participation_risk_score"] = 0
    out.loc[out["assignment_count"] <= q_assign, "participation_risk_score"] += 1
    out.loc[out["question_count"] <= q_question, "participation_risk_score"] += 1
    out.loc[out["participation_level"] == "하", "participation_risk_score"] += 2
    out["participation_flag"] = (out["participation_risk_score"] >= 2).astype(int)
    return out


def add_absence_allowance(df: pd.DataFrame, policy: EvaluationPolicy) -> pd.DataFrame:
    out = df.copy()
    limit = floor(policy.total_classes / 3)
    out["absence_limit"] = limit
    absn = pd.to_numeric(out.get("absence_count"), errors="coerce").fillna(0).astype(int)
    out["remaining_absence_allowance"] = limit - absn
    return out


def add_score_guidance(df: pd.DataFrame, policy: EvaluationPolicy) -> pd.DataFrame:
    out = df.copy()

    T = policy.threshold
    wm = policy.midterm_weight / 100.0
    wf = policy.final_weight / 100.0
    wp = policy.performance_weight / 100.0

    mmax = policy.midterm_max
    fmax = policy.final_max
    pmax = policy.performance_max

    def _guidance(row: pd.Series) -> str:
        mid = pd.to_numeric(row.get("midterm_score"), errors="coerce")
        fin = pd.to_numeric(row.get("final_score"), errors="coerce")
        perf = pd.to_numeric(row.get("performance_score"), errors="coerce")

        mid_miss = int(row.get("midterm_score_missing", 0)) == 1
        fin_miss = int(row.get("final_score_missing", 0)) == 1
        perf_miss = int(row.get("performance_score_missing", 0)) == 1

        if mid_miss or pd.isna(mid):
            return "중간고사 점수 정보가 없어 성취율 역산 안내를 제공할 수 없습니다."

        base = (mid / mmax) * wm
        if (not fin_miss) and pd.notna(fin):
            base += (fin / fmax) * wf
        if (not perf_miss) and pd.notna(perf):
            base += (perf / pmax) * wp

        if base >= T:
            return "현재 입력된 점수 기준으로 성취율 40% 기준을 충족합니다."

        needed = T - base

        if fin_miss and (not perf_miss):
            req_final = (needed / wf) * fmax if wf > 0 else float("inf")
            req_final = _clamp_score(req_final, fmax)
            return f"기말고사에서 최소 {req_final:.1f}점(/{fmax:.0f}) 이상 필요합니다."

        if perf_miss and (not fin_miss):
            req_perf = (needed / wp) * pmax if wp > 0 else float("inf")
            req_perf = _clamp_score(req_perf, pmax)
            return f"수행평가에서 최소 {req_perf:.1f}점(/{pmax:.0f}) 이상 필요합니다."

        if fin_miss and perf_miss:
            base_perf_full = base + (1.0 * wp)
            needed_final = max(0.0, T - base_perf_full)
            req_final = (needed_final / wf) * fmax if wf > 0 else float("inf")
            req_final = _clamp_score(req_final, fmax)

            base_final_full = base + (1.0 * wf)
            needed_perf = max(0.0, T - base_final_full)
            req_perf = (needed_perf / wp) * pmax if wp > 0 else float("inf")
            req_perf = _clamp_score(req_perf, pmax)

            return (
                f"[시나리오] 수행 만점 가정 시 기말 최소 {req_final:.1f}점(/{fmax:.0f}) 필요 / "
                f"기말 만점 가정 시 수행 최소 {req_perf:.1f}점(/{pmax:.0f}) 필요"
            )

        return "현재 입력된 점수 기준으로 성취율 40% 미달입니다."

    out["score_guidance"] = out.apply(_guidance, axis=1)
    return out


def add_top_reasons(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    def _reasons(row: pd.Series) -> str:
        reasons = []

        absn = pd.to_numeric(row.get("absence_count"), errors="coerce")
        mid = pd.to_numeric(row.get("midterm_score"), errors="coerce")
        fin = pd.to_numeric(row.get("final_score"), errors="coerce")
        perf = pd.to_numeric(row.get("performance_score"), errors="coerce")

        fin_miss = int(row.get("final_score_missing", 0)) == 1
        perf_miss = int(row.get("performance_score_missing", 0)) == 1

        if pd.notna(absn) and absn >= 5:
            reasons.append("결석 횟수 높음")

        if pd.notna(mid) and mid < 50:
            reasons.append("중간고사 성적 낮음")

        if (not fin_miss) and pd.notna(fin) and fin < 50:
            reasons.append("기말고사 성적 낮음")

        if (not perf_miss) and pd.notna(perf) and perf < 50:
            reasons.append("수행평가 성적 낮음")

        if int(row.get("participation_flag", 0)) == 1:
            reasons.append("학습 참여도 저하(과제/질문/참여)")

        return ", ".join(reasons[:3]) if reasons else "특이 요인 없음"

    out["top_reasons"] = out.apply(_reasons, axis=1)
    return out


def enrich_report(df_processed: pd.DataFrame, policy: EvaluationPolicy) -> pd.DataFrame:
    """
    df_processed: preprocess_pipeline 결과(DataFrame)
    policy: 사용자 입력(EvaluationPolicy)

    리포트 컬럼을 추가하여 반환
    """
    out = df_processed.copy()

    # participation → reasons에 필요
    out = add_participation_flags(out)

    # absence
    out = add_absence_allowance(out, policy)

    # score guidance
    out = add_score_guidance(out, policy)

    # reasons
    out = add_top_reasons(out)

    # action (risk_level 이후에 적용하는 편이 자연스러우나, 편의상 여기서는 컬럼만 준비)
    # risk_level이 없으면 action을 채울 수 없으므로, API에서 risk_level 생성 후 호출하는 것을 권장
    return out


def safe_json_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    JSON 응답 안전화를 위해 NaN → None 변환
    """
    return df.replace({np.nan: None})
