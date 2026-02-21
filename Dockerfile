# syntax=docker/dockerfile:1

# 1) 프론트엔드 빌드 스테이지 (Vite -> dist)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
# 의존성 캐시를 위해 package 파일 먼저 복사
COPY client/package.json client/package-lock.json ./
RUN npm ci
# 프론트 소스 복사 후 정적 빌드
COPY client/ ./
RUN npm run build


# 2) 런타임 스테이지 (FastAPI + React 정적 파일 단일 서비스)
FROM python:3.11-slim AS runtime
WORKDIR /app
# scikit-learn 런타임에 필요한 시스템 라이브러리 설치
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
# 파이썬 패키지 설치
# 참고: 현재 requirements.txt에 scikit-learn이 없어 별도 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir scikit-learn
# 백엔드 실행에 필요한 코드/데이터 복사
COPY backend ./backend
COPY data ./data
# 보고서 저장 폴더 생성 및 기본 모델 빌드(더미 데이터 기반)
RUN mkdir -p models reports/tables \
    && python backend/scripts/train_model.py
# 프론트 빌드 산출물을 FastAPI가 읽는 경로(client/dist)로 복사
COPY --from=frontend-builder /app/client/dist ./client/dist

# Render가 주입하는 PORT를 사용 (로컬 기본값 8000)
ENV PORT=8000
ENV FRONTEND_DIST=client/dist
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 단일 컨테이너에서 FastAPI 실행 (정적 파일 포함)
EXPOSE 8000
CMD ["sh", "-c", "python -m uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT}"]
