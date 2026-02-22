import os
import uuid
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.src.config import FEATURE_COLS
from backend.src.preprocessing import preprocess_pipeline
from backend.src.report_logic import (
    assign_action,
    assign_risk_level,
    enrich_report,
    parse_policy_json,
    safe_json_df,
)

# 서버가 어떤 위치에서 실행되더라도, 환경변수의 상대경로를
# 프로젝트 루트 기준으로 일관되게 해석하기 위해 사용합니다.
PROJECT_ROOT = Path(__file__).resolve().parents[2]

def _resolve_path(env_key: str, default_relative: str) -> Path:
    # 환경변수에서 경로를 읽고, 없으면 프로젝트 상대 기본 경로를 사용합니다.
    raw = os.getenv(env_key, default_relative).strip()
    path = Path(raw)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path

def _load_allowed_origins() -> list[str]:
    # CORS 허용 Origin은 쉼표로 구분한 환경변수 값으로 받을 수 있습니다.
    env_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

APP_TITLE = os.getenv("APP_TITLE", "EduTech Risk Prediction API").strip() or "EduTech Risk Prediction API"
MODEL_PATH = _resolve_path("MODEL_PATH", "models/logistic_model.joblib")
REPORT_DIR = _resolve_path("REPORT_DIR", "reports/tables")
DUMMY_DATA_PATH = _resolve_path("DUMMY_DATA_PATH", "data/dummy/dummy_midterm_like_labeled.csv")
FRONTEND_DIST = _resolve_path("FRONTEND_DIST", "client/dist")
REPORT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR_RESOLVED = REPORT_DIR.resolve()
FRONTEND_DIST_RESOLVED = FRONTEND_DIST.resolve()
FRONTEND_INDEX_PATH = FRONTEND_DIST / "index.html"

# --- 앱 초기화: FastAPI 생성 및 CORS 미들웨어 등록 ---
app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_load_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    # React 빌드 산출물이 있으면 앱을 서빙하고, 없으면 간단한 API 메시지를 반환합니다.
    if FRONTEND_INDEX_PATH.exists():
        return FileResponse(FRONTEND_INDEX_PATH)
    return {"message": APP_TITLE}

@app.get("/api/health")
def health():
    # 서버 상태 확인용 경량 헬스체크 엔드포인트입니다.
    return {"status": "ok"}

@app.get("/api/sample/dummy-midterm-like-labeled")
def download_dummy_csv():
    # 프론트 LandingPage의 "더미 파일 다운로드" 버튼이 호출하는 엔드포인트입니다.
    # 업로드 스키마에 맞는 예시 CSV 파일을 제공합니다.
    if not DUMMY_DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Dummy CSV file not found.")
    return FileResponse(
        DUMMY_DATA_PATH,
        media_type="text/csv",
        filename=DUMMY_DATA_PATH.name,
    )

@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    policy: str = Form(...),
    mode: str = "full",
):
    # 예측 처리 메인 흐름:
    # - 프론트 UploadModal(shared/api.ts -> predictCsv)에서 multipart/form-data로 호출
    # 1) CSV 검증 및 로드
    # 2) 입력 전처리
    # 3) 학습된 모델 로드 후 확률 예측
    # 4) 가이드/리포트 컬럼 확장
    # 5) 리포트 CSV 저장 후 JSON 응답 반환
    try:
        if file.content_type != "text/csv":
            raise HTTPException(status_code=400, detail="Only CSV files are supported.")

        df_raw = pd.read_csv(file.file)
        df_processed = preprocess_pipeline(df_raw)

        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail=f"Model file not found: {MODEL_PATH}")
        model = joblib.load(MODEL_PATH)

        X = df_processed[FEATURE_COLS]
        risk_proba = model.predict_proba(X)[:, 1]
        policy_obj = parse_policy_json(policy)

        df_result = df_processed.copy()
        df_result["risk_proba"] = risk_proba
        df_result["risk_level"] = df_result["risk_proba"].apply(assign_risk_level)
        df_result["action"] = df_result["risk_level"].apply(assign_action)
        df_result = enrich_report(df_result, policy_obj)

        # "compact" 모드는 UI에서 바로 활용할 핵심 컬럼만 반환합니다.
        if mode == "compact":
            compact_cols = [
                "student_id",
                "risk_level",
                "risk_proba",
                "top_reasons",
                "score_guidance",
                "action",
                "remaining_absence_allowance",
            ]
            compact_cols = [col for col in compact_cols if col in df_result.columns]
            df_response = df_result[compact_cols]
        else:
            df_response = df_result

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        token = uuid.uuid4().hex[:8]
        report_filename = f"prediction_report_{ts}_{token}.csv"
        output_path = REPORT_DIR / report_filename
        df_result.to_csv(output_path, index=False, encoding="utf-8-sig")

        # 프론트 대시보드(DashboardHeader/MobileFloatingNav)에서 이 경로를 받아
        # buildApiUrl()로 절대/상대 URL을 완성한 뒤 다운로드 버튼에 사용합니다.
        report_url = f"/api/download/{report_filename}"
        df_result = safe_json_df(df_result)

        return {
            "rows": len(df_result),
            "report_filename": report_filename,
            "report_url": report_url,
            # 프론트 DashboardPage는 이 data 배열을 라우터 state로 전달받아 표를 렌더링합니다.
            "data": safe_json_df(df_response).to_dict(orient="records"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.get("/api/download/{filename}")
def download_report(filename: str):
    # REPORT_DIR 내부 파일만 다운로드하도록 제한합니다(경로 이탈 방지).
    path = (REPORT_DIR / filename).resolve()
    if not path.exists() or path.parent != REPORT_DIR_RESOLVED:
        raise HTTPException(status_code=404, detail="Report file not found.")
    return FileResponse(
        path,
        media_type="text/csv",
        filename=filename,
    )

@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    # SPA/정적 파일 서빙 규칙:
    # - 요청 경로에 해당하는 정적 파일이 있으면 그 파일 반환
    # - 정적 파일이 아니면 index.html 반환(클라이언트 라우팅)
    # - /api 경로는 절대 프론트 fallback으로 삼키지 않음
    if not FRONTEND_INDEX_PATH.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found.")

    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found.")

    candidate = (FRONTEND_DIST / full_path).resolve()
    if full_path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST_RESOLVED):
        return FileResponse(candidate)

    return FileResponse(FRONTEND_INDEX_PATH)
