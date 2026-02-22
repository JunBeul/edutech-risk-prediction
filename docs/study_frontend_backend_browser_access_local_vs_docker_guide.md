# 프론트엔드/백엔드 브라우저 접근 구분 가이드 (로컬 개발 vs Docker)

이 문서는 이 프로젝트에서 브라우저로 접속할 때 `프론트엔드(UI)`와 `백엔드(API)`를 어떻게 구분해서 이해하면 되는지 정리합니다.

- 로컬 개발 실행 (`npm run dev`)
- Docker 실행 (`docker build`, `docker run`)
- 경로(path) 기준 구분 (`/` vs `/api/...`)
- 실행 방식별 확인 체크리스트

---

## 1. 먼저 결론: 무엇이 다른가?

브라우저 자체가 다른 것이 아니라, `접속 주소(URL)`와 `서버 역할`이 다릅니다.

- 프론트엔드: 사람이 보는 화면(UI)
  - React 라우팅 (`/`, `/dashboard`)
  - 파일 업로드, 결과 확인, 대시보드 사용
- 백엔드: 데이터 처리/API
  - FastAPI 엔드포인트 (`/api/health`, `/api/predict`, `/api/download/...`)
  - JSON/CSV 응답 반환

---

## 2. 프로젝트 코드 기준으로 구분되는 위치

### 프론트엔드 (React)

- `client/src/App.tsx`
  - `/` -> 랜딩 페이지
  - `/dashboard` -> 대시보드 페이지

즉 브라우저에서 프론트엔드를 본다는 것은 React 페이지를 보고 있다는 뜻입니다.

### 백엔드 (FastAPI)

- `backend/api/main.py`
  - `GET /api/health` -> 상태 확인 JSON
  - `POST /api/predict` -> CSV 업로드 예측 처리
  - `GET /api/download/{filename}` -> 결과 CSV 다운로드

즉 브라우저에서 백엔드를 본다는 것은 API 응답(JSON/파일)을 확인하는 것입니다.

---

## 3. 로컬 개발에서의 구분 (프론트/백 분리 실행)

`README_DEV.md` 기준 기본 개발 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`

### 브라우저에서 어떻게 보이나?

- `http://localhost:5173`
  - React 개발 서버(Vite)
  - UI 화면이 보임 (프론트엔드)
- `http://127.0.0.1:8000/api/health`
  - `{"status":"ok"}` 같은 JSON이 보임 (백엔드 API)

### 로컬 개발에서 자주 헷갈리는 포인트

- `http://127.0.0.1:8000/` 는 항상 프론트 화면이 아닐 수 있습니다.
- `backend/api/main.py`의 `GET /`는 `client/dist/index.html`이 있으면 프론트를 서빙하고,
  없으면 API 메시지를 반환합니다.
- 개발 중에는 보통 Vite 개발 서버(`5173`)를 사용하므로 프론트 확인은 `5173`에서 합니다.

---

## 4. Docker 실행에서의 구분 (단일 컨테이너, 단일 포트)

`Dockerfile`은 멀티스테이지 빌드 후, 런타임에서 FastAPI가 React 빌드 결과(`client/dist`)를 함께 서빙하도록 구성되어 있습니다.

즉 Docker에서는 보통 `8000` 포트 하나로 프론트와 백엔드를 모두 접근합니다.

### 브라우저에서 어떻게 보이나?

- `http://localhost:8000/`
  - 프론트엔드 UI (React build 결과)
- `http://localhost:8000/dashboard`
  - 프론트엔드 UI 라우트
- `http://localhost:8000/api/health`
  - 백엔드 API JSON
- `http://localhost:8000/api/sample/dummy-midterm-like-labeled`
  - 샘플 CSV 다운로드

### Docker에서의 핵심 구분 기준

Docker에서는 포트가 같기 때문에 `경로(path)`로 구분합니다.

- 프론트엔드 경로: `/`, `/dashboard` 등
- 백엔드 경로: `/api/...`

---

## 5. 왜 Docker에서는 하나의 주소로 동작하나?

### `Dockerfile` 관점

- Stage 1: `client`를 빌드해서 `client/dist` 생성
- Stage 2: FastAPI 런타임 컨테이너에서 `client/dist`를 함께 포함
- FastAPI가 정적 파일 + SPA fallback을 서빙

### `backend/api/main.py` 관점

- `GET /`: `client/dist/index.html`이 있으면 프론트 반환
- `GET /{full_path:path}`: SPA 라우팅 fallback 처리
- `/api/...`: 프론트 fallback으로 삼키지 않고 API로 처리

즉 컨테이너 내부에서는 `FastAPI 서버 1개`가

- API 응답도 하고
- 프론트 정적 파일도 함께 제공합니다.

---

## 6. 프론트 API 호출 주소가 실행 방식에 따라 달라지는 이유

- `client/src/shared/api.ts`
  - `VITE_API_BASE_URL` 환경변수를 읽어서 API 주소를 구성함
  - 값이 없으면 same-origin 경로(`/api/...`)를 사용함

### 로컬 개발 (분리 실행)

보통 `client/.env`에 아래처럼 설정:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

그래서 프론트(`5173`)가 백엔드(`8000`)로 API 요청을 보냅니다.

### Docker/배포 (단일 서비스)

`Dockerfile`에서 `VITE_API_BASE_URL` 기본값을 빈 문자열로 두므로,
프론트가 현재 도메인 기준 same-origin으로 `/api/...`를 호출합니다.

예: `http://localhost:8000`에서 열었으면 API도 `http://localhost:8000/api/...`

---

## 7. 실행 방식별 체크리스트

## A. 로컬 개발 체크리스트 (`npm run dev`)

1. 모델 파일이 있는지 확인 (`models/logistic_model.joblib`)
   - 없으면 `python backend/scripts/train_model.py` 실행
2. 백엔드와 프론트를 함께 실행 (`npm run dev`)
3. 브라우저에서 프론트 확인
   - `http://localhost:5173`
4. 브라우저(또는 API 클라이언트)에서 백엔드 헬스체크 확인
   - `http://127.0.0.1:8000/api/health`
5. 프론트 업로드/예측이 안 되면 `client/.env`의 `VITE_API_BASE_URL` 확인
   - 보통 `http://127.0.0.1:8000`
6. CORS 에러가 보이면 백엔드 `ALLOWED_ORIGINS` 확인
   - 예: `http://localhost:5173`

### 로컬 개발에서 내가 열어야 할 주소 요약

- UI 확인: `http://localhost:5173`
- API 확인: `http://127.0.0.1:8000/api/health`

---

## B. Docker 체크리스트 (`docker build`, `docker run`)

1. 이미지 빌드
   - `docker build -t edutech-risk-prediction:local .`
2. 컨테이너 실행
   - `docker run --rm -d -p 8000:8000 --name edutech-app edutech-risk-prediction:local`
3. 브라우저에서 프론트 확인
   - `http://localhost:8000/`
4. 브라우저(또는 API 클라이언트)에서 백엔드 헬스체크 확인
   - `http://localhost:8000/api/health`
5. 대시보드 라우팅 확인
   - `http://localhost:8000/dashboard`
6. 샘플 CSV 다운로드 API 확인
   - `http://localhost:8000/api/sample/dummy-midterm-like-labeled`
7. Docker에서는 프론트/백엔드 구분을 `포트`가 아니라 `경로(/api)` 기준으로 확인

### Docker에서 내가 열어야 할 주소 요약

- UI 확인: `http://localhost:8000`
- API 확인: `http://localhost:8000/api/health`

---

## 8. 빠른 판별표 (한 번에 기억하기)

- `localhost:5173` -> 프론트 개발 서버 (로컬 개발)
- `127.0.0.1:8000/api/...` -> 백엔드 API (로컬 개발)
- `localhost:8000` -> Docker/배포에서 프론트+백엔드 단일 서비스
- `/api/...` 경로면 백엔드, 그 외 SPA 라우트면 프론트라고 보면 됨

---

## 9. 관련 코드 참고

- `client/src/App.tsx`
- `client/src/shared/api.ts`
- `backend/api/main.py`
- `Dockerfile`
- `README_DEV.md`
