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

PROJECT_ROOT = Path(__file__).resolve().parents[2]

def _resolve_path(env_key: str, default_relative: str) -> Path:
    raw = os.getenv(env_key, default_relative).strip()
    path = Path(raw)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path

def _load_allowed_origins() -> list[str]:
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
    if FRONTEND_INDEX_PATH.exists():
        return FileResponse(FRONTEND_INDEX_PATH)
    return {"message": APP_TITLE}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/sample/dummy-midterm-like-labeled")
def download_dummy_csv():
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

        report_url = f"/api/download/{report_filename}"
        df_result = safe_json_df(df_result)

        return {
            "rows": len(df_result),
            "report_filename": report_filename,
            "report_url": report_url,
            "data": safe_json_df(df_response).to_dict(orient="records"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.get("/api/download/{filename}")
def download_report(filename: str):
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
    if not FRONTEND_INDEX_PATH.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found.")

    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found.")

    candidate = (FRONTEND_DIST / full_path).resolve()
    if full_path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST_RESOLVED):
        return FileResponse(candidate)

    return FileResponse(FRONTEND_INDEX_PATH)
