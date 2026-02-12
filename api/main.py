from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models/logistic_model.joblib"

import pandas as pd
import joblib
import os

from src.config import FEATURE_COLS
from src.preprocessing import preprocess_pipeline
from src.report_logic import (
    parse_policy_json,
    enrich_report,
    assign_risk_level,
    assign_action,
    safe_json_df,
)

app = FastAPI(title="EduTech Risk Prediction API")

# -----------------------------
# CORS (React 연동용)
# -----------------------------
# 기본: 로컬 개발 환경(React)
default_origins = [
    "http://localhost:5173",  # Vite
    "http://localhost:3000",  # CRA (혹시 사용할 경우)
]
# 배포 시: 환경변수로 오버라이드 가능 (콤마 구분)
env_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
if env_origins:
    allow_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    allow_origins = default_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Health Check & Root
# -----------------------------

@app.get("/")
def root():
    return {"message": "EduTech Risk Prediction API"}

@app.get("/health")
def health():
    return {"status": "ok"}

# -----------------------------
# main prediction logic
# -----------------------------

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),   # '...'는 필수 항목임을 나타냄, Ellipsis는 한국어로 '생략'이라는 뜻
    policy: str = Form(...),   # multipart JSON 문자열
):
    try:
        # 1. CSV → DataFrame
        df_raw = pd.read_csv(file.file)

        # 2. 전처리
        df_processed = preprocess_pipeline(df_raw)

        # 3. 모델 로드
        model_path = PROJECT_ROOT / "models/logistic_model.joblib"
        model = joblib.load(model_path)

        X = df_processed[FEATURE_COLS]
        risk_proba = model.predict_proba(X)[:, 1]

        # 4. policy 파싱 + 검증
        policy_obj = parse_policy_json(policy)

        # 5. 리포트 생성
        df_result = df_processed.copy()

        df_result["risk_proba"] = risk_proba
        df_result["risk_level"] = df_result["risk_proba"].apply(assign_risk_level)
        df_result["action"] = df_result["risk_level"].apply(assign_action)

        # 공통 로직 호출
        df_result = enrich_report(df_result, policy_obj)

        # 6. JSON 안전 변환
        df_result = safe_json_df(df_result)

        return {
            "rows": len(df_result),
            "data": df_result.to_dict(orient="records"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
