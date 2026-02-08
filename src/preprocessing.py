from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple
import matplotlib.pyplot as plt

import numpy as np
import pandas as pd

@dataclass(frozen=True)
class Schema:
    """Expected columns for the learning dataset."""
    required_columns: List[str]
    target_column: str

DEFAULT_SCHEMA = Schema(
    required_columns=[
        "student_id",
        "study_time",
        "assignment_rate",
        "lms_login",
        "absence",
        "late",
        "total_score",
    ],
    target_column="total_score",
)

def load_csv(path: str, encoding: str = "utf-8-sig") -> pd.DataFrame:
    """Load a CSV file into a DataFrame."""
    return pd.read_csv(path, encoding=encoding)

def save_csv(df: pd.DataFrame, path: str, encoding: str = "utf-8-sig") -> None:
  """Save DataFrame to a CSV file."""
  df.to_csv(path, index=False, encoding=encoding)


def validate_schema(df: pd.DataFrame, schema: Schema = DEFAULT_SCHEMA) -> None:
    """Raise an error if required columns are missing."""
    missing = [c for c in schema.required_columns if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

def basic_cleaning(df: pd.DataFrame) -> pd.DataFrame:
    """
    Basic cleanup:
    - Drop duplicated rows
    - Strip column names
    - Enforce numeric types where possible
    """
    out = df.copy()
    out.columns = [c.strip() for c in out.columns]
    out = out.drop_duplicates()
    # Coerce numeric columns (ignore errors -> NaN)
    for col in out.columns:
        if col == "student_id":
            continue
        out[col] = pd.to_numeric(out[col], errors="coerce")
    return out

def fill_missing(
    df: pd.DataFrame,
    numeric_strategy: str = "median",
) -> pd.DataFrame:
    """
    Fill missing values for numeric columns using median or mean.
    """
    out = df.copy()
    numeric_cols = out.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
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
    """
    Clip outliers using IQR rule to reduce extreme values.
    """
    out = df.copy()
    if cols is None:
        cols = out.select_dtypes(include=[np.number]).columns.tolist()
    for col in cols:
        q1 = out[col].quantile(0.25)
        q3 = out[col].quantile(0.75)
        iqr = q3 - q1
        low = q1 - k * iqr
        high = q3 + k * iqr
        out[col] = out[col].clip(lower=low, upper=high)
    return out

def prepare_features(
    df: pd.DataFrame,
    schema: Schema = DEFAULT_SCHEMA,
    drop_cols: Optional[List[str]] = None,
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Split dataframe into X (features) and y (target).
    """
    out = df.copy()
    validate_schema(out, schema=schema)
    if drop_cols is None:
        drop_cols = ["student_id"]
    y = out[schema.target_column]
    X = out.drop(columns=[schema.target_column] + drop_cols, errors="ignore")
    return X, y

def preprocess_pipeline(
    df: pd.DataFrame,
    schema: Schema = DEFAULT_SCHEMA,
    numeric_strategy: str = "median",
    clip_outliers: bool = False,
) -> pd.DataFrame:
    """
    End-to-end preprocessing pipeline used by notebooks and later models.
    """
    validate_schema(df, schema=schema)
    out = basic_cleaning(df)
    out = fill_missing(out, numeric_strategy=numeric_strategy)
    if clip_outliers:
        out = clip_outliers_iqr(out)
    return out
  
