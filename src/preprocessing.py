from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


# ----------------------------
# Schema (single fixed columns)
# ----------------------------
@dataclass(frozen=True)
class Schema:
    required_columns: List[str]


SCORE_COLS = ["midterm_score", "final_score", "performance_score"]

SINGLE_SCHEMA = Schema(
    required_columns=[
        "student_id",
        "midterm_score",        # 학기 중간이면 NaN 허용
        "final_score",          # 학기 중간이면 NaN 허용
        "performance_score",    # 학기 중간이면 NaN 허용
        "assignment_count",
        "participation_level",  # 상/중/하
        "question_count",
        "night_study",          # 0/1
        "absence_count",
        "behavior_score",
    ]
)

# ----------------------------
# IO
# ----------------------------
def load_csv(path: str, encoding: str = "utf-8-sig") -> pd.DataFrame:
    return pd.read_csv(path, encoding=encoding)


def save_csv(df: pd.DataFrame, path: str, encoding: str = "utf-8-sig") -> None:
    df.to_csv(path, index=False, encoding=encoding)


# ----------------------------
# Validation & Cleaning
# ----------------------------
def validate_schema(
    df: pd.DataFrame,
    schema: Schema = SINGLE_SCHEMA,
    optional_columns: Optional[List[str]] = None,
) -> None:
    optional = set(optional_columns or [])
    missing = [c for c in schema.required_columns if c not in df.columns and c not in optional]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


def basic_cleaning(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Strip column names
    - Drop duplicates
    - Coerce numeric columns to numeric (errors->NaN)
    - Keep participation_level as string/category
    """
    out = df.copy()
    out.columns = [c.strip() for c in out.columns]
    out = out.drop_duplicates()

    # numeric cols (participation_level 제외)
    numeric_cols = [
        "midterm_score",
        "final_score",
        "performance_score",
        "assignment_count",
        "question_count",
        "night_study",
        "absence_count",
        "behavior_score",
    ]
    for c in numeric_cols:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors="coerce")

    # participation_level normalize (strip)
    if "participation_level" in out.columns:
        out["participation_level"] = (
            out["participation_level"].astype(str).str.strip()
        )

    return out


def add_missing_flags(
    df: pd.DataFrame,
    cols: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Add missing flags for score columns before fill_missing.
    If a score column is absent, create it as NaN and set its flag to 1.
    """
    out = df.copy()
    if cols is None:
        cols = SCORE_COLS

    for c in cols:
        if c not in out.columns:
            out[c] = np.nan
            out[f"{c}_missing"] = 1
        else:
            out[f"{c}_missing"] = out[c].isna().astype(int)

    return out


def encode_participation_level(
    df: pd.DataFrame,
    col: str = "participation_level",
    out_col: str = "participation_level_num",
    mapping: Optional[Dict[str, int]] = None,
) -> pd.DataFrame:
    """
    상/중/하 -> 2/1/0 숫자 인코딩 컬럼 추가.
    원본(col)은 유지.
    """
    if mapping is None:
        mapping = {"상": 2, "중": 1, "하": 0}

    out = df.copy()
    if col not in out.columns:
        return out

    out[out_col] = out[col].map(mapping)
    # 모르는 값은 NaN -> 이후 결측 처리에서 메움
    return out


def fill_missing(
    df: pd.DataFrame,
    numeric_strategy: str = "median",
    numeric_cols: Optional[List[str]] = None,
    all_nan_fill_value: float = 0.0,
) -> pd.DataFrame:
    """
    Fill missing values for numeric columns using median/mean.
    If a column is ALL-NaN (e.g., final_score in midterm snapshot),
    fill it with a constant fallback (default=0.0).
    """
    out = df.copy()

    if numeric_cols is None:
        numeric_cols = out.select_dtypes(include=[np.number]).columns.tolist()

    for col in numeric_cols:
        if col not in out.columns:
            continue

        # 전부 NaN이면 median/mean도 NaN이므로 fallback 사용
        if out[col].isna().all():
            out[col] = out[col].fillna(all_nan_fill_value)
            continue

        if numeric_strategy == "median":
            value = out[col].median()
        elif numeric_strategy == "mean":
            value = out[col].mean()
        else:
            raise ValueError("numeric_strategy must be 'median' or 'mean'")

        out[col] = out[col].fillna(value)

    return out


def clip_outliers_iqr(
    df: pd.DataFrame,
    cols: Optional[List[str]] = None,
    k: float = 1.5,
) -> pd.DataFrame:
    out = df.copy()
    if cols is None:
        cols = out.select_dtypes(include=[np.number]).columns.tolist()

    for col in cols:
        if col not in out.columns:
            continue
        q1 = out[col].quantile(0.25)
        q3 = out[col].quantile(0.75)
        iqr = q3 - q1
        low = q1 - k * iqr
        high = q3 + k * iqr
        out[col] = out[col].clip(lower=low, upper=high)

    return out


# ----------------------------
# Target engineering (key)
# ----------------------------
def compute_achievement_rate(
    df: pd.DataFrame,
    score_cols: Optional[List[str]] = None,
    weights: Optional[Dict[str, float]] = None,
    out_col: str = "achievement_rate",
) -> pd.DataFrame:
    """
    단일 스키마에서 '비어있는 점수 열'은 자동 제외하고 성취율을 계산.

    - weights를 주면 가중합 (단, NaN인 열은 제외 후 가중치 재정규화)
    - weights가 없으면 사용 가능한 점수의 단순 평균
    """
    out = df.copy()
    if score_cols is None:
        score_cols = SCORE_COLS

    score_cols = [c for c in score_cols if c in out.columns]
    if not score_cols:
        out[out_col] = np.nan
        return out

    # ensure numeric
    for c in score_cols:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors="coerce")

    if weights is None:
        out[out_col] = out[score_cols].mean(axis=1, skipna=True).round(1)
        return out

    # weighted with renormalization per row
    w = {c: float(weights.get(c, 0.0)) for c in score_cols}

    def row_weighted(r: pd.Series) -> float:
        available = [c for c in score_cols if pd.notna(r.get(c, np.nan)) and w.get(c, 0.0) > 0]
        if not available:
            return np.nan
        s = sum(w[c] for c in available)
        return float(sum((w[c] / s) * r[c] for c in available))

    out[out_col] = out.apply(row_weighted, axis=1).round(1)
    return out


def add_at_risk_label(
    df: pd.DataFrame,
    achievement_col: str = "achievement_rate",
    out_col: str = "at_risk",
    achievement_threshold: float = 40.0,
    total_sessions: int = 30,
    absence_fraction: float = 1 / 3,
) -> pd.DataFrame:
    """
    at_risk = (achievement_rate < 40) OR (absence_count >= ceil(total_sessions * 1/3))
    """
    out = df.copy()

    if achievement_col not in out.columns:
        out = compute_achievement_rate(out, out_col=achievement_col)

    absence_threshold = int(np.ceil(total_sessions * absence_fraction))
    out[out_col] = (
        (pd.to_numeric(out[achievement_col], errors="coerce") < achievement_threshold)
        | (pd.to_numeric(out["absence_count"], errors="coerce") >= absence_threshold)
    ).astype(int)

    return out


# ----------------------------
# Feature split
# ----------------------------
def prepare_features(
    df: pd.DataFrame,
    target_col: str = "at_risk",
    drop_cols: Optional[List[str]] = None,
) -> Tuple[pd.DataFrame, pd.Series]:
    out = df.copy()
    if drop_cols is None:
        drop_cols = ["student_id"]

    if target_col not in out.columns:
        raise ValueError(f"target_col '{target_col}' not found. Create it first (e.g., add_at_risk_label).")

    y = out[target_col]
    X = out.drop(columns=[target_col] + drop_cols, errors="ignore")
    return X, y


# ----------------------------
# Pipeline
# ----------------------------
def preprocess_pipeline(
    df: pd.DataFrame,
    schema: Schema = SINGLE_SCHEMA,
    numeric_strategy: str = "median",
    clip_outliers: bool = False,
    encode_participation: bool = True,
    add_labels: bool = False,
    weights: Optional[Dict[str, float]] = None,
    total_sessions: int = 30,
    absence_fraction: float = 1 / 3,
) -> pd.DataFrame:
    """
    단일 스키마 대응 파이프라인.

    - 결측 점수(final_score 등)는 계산 시 자동 제외 가능(achievement_rate)
    - participation_level은 participation_level_num으로 인코딩(기본 on)
    - 필요 시 at_risk 라벨 생성(add_labels=True)
    """
    validate_schema(df, schema=schema, optional_columns=SCORE_COLS)
    out = basic_cleaning(df)

    out = add_missing_flags(out, cols=SCORE_COLS)

    if encode_participation:
        out = encode_participation_level(out)

    # numeric 결측 채우기 (모델 입력/EDA 편의)
    out = fill_missing(out, numeric_strategy=numeric_strategy)

    if clip_outliers:
        out = clip_outliers_iqr(out)

    # 성취율/라벨은 선택
    out = compute_achievement_rate(out, weights=weights)
    if add_labels:
        out = add_at_risk_label(
            out,
            total_sessions=total_sessions,
            absence_fraction=absence_fraction,
        )

    return out
