# README_DEV

개발자/협업자 관점에서 프로젝트를 빠르게 이해하고 재현하기 위한 문서입니다.

- 서비스 URL: https://maplight.onrender.com
- 루트 README: [`README.md`](https://github.com/JunBeul/edutech-risk-prediction?tab=readme-ov-file)

---

## 1. 개발 목표

- 중간 시점 데이터로 위험군 예측
- 예측 점수뿐 아니라 교사 개입 가능한 설명 컬럼 생성
- 단일 저장소에서 API + UI + 배포까지 재현 가능하게 구성

---

## 2. 실행 환경

### 필수

- Python 3.11+
- Node.js 20+

### 권장: 가상환경

```bash
python -m venv .venv
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 패키지 설치

```bash
pip install -r requirements.txt
npm install
npm --prefix client install
```

---

## 3. 환경변수

### 루트 `.env` (백엔드)

`.env.example` 기준

```env
APP_TITLE=EduTech Risk Prediction API
MODEL_PATH=models/logistic_model.joblib
REPORT_DIR=reports/tables
DUMMY_DATA_PATH=data/dummy/dummy_midterm_like_labeled.csv
FRONTEND_DIST=client/dist
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000
```

파일 생성 예시:

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### `client/.env` (프론트)

`client/.env.example` 기준

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
# VITE_DUMMY_CSV_URL=https://example.com/dummy_midterm_like_labeled.csv
```

파일 생성 예시:

Linux/macOS:

```bash
cp client/.env.example client/.env
```

Windows PowerShell:

```powershell
Copy-Item client/.env.example client/.env
```

---

## 4. 로컬 실행

### 0) 모델 파일 확인 (클린 클론 중요)

`models/logistic_model.joblib`가 없으면 `POST /api/predict`에서 500 에러가 발생합니다.

```bash
python backend/scripts/train_model.py
```

### 통합 개발 서버

```bash
npm run dev
```

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://localhost:5173`

### 개별 실행

```bash
npm run dev:back
npm run dev:front
```

### 기본 동작 확인

- 헬스체크: `GET http://127.0.0.1:8000/api/health`
- 샘플 CSV 다운로드: `GET http://127.0.0.1:8000/api/sample/dummy-midterm-like-labeled`

---

## 5. 데이터 계약(업로드 스키마)

필수 컬럼:

- `student_id`
- `midterm_score`
- `final_score`
- `performance_score`
- `assignment_count`
- `participation_level`
- `question_count`
- `night_study`
- `absence_count`
- `behavior_score`

중간 시점 데이터에서 일부 점수(`final_score`) 결측/all-NaN이 발생하는 케이스를 전제로 설계되어 있습니다.

---

## 6. 전처리 파이프라인 요약

`backend/src/preprocessing.py`

주요 처리:

- 스키마 검증 (`validate_schema`)
- 컬럼 정리/중복 제거/수치형 변환 (`basic_cleaning`)
- 결측 플래그 생성 (`*_missing`)
- 결측치 보정 (`median/mean`, all-NaN은 fallback 상수)
- 참여도 인코딩 (`participation_level_num`)
- 성취율 계산 (`achievement_rate`)
- 라벨 생성 옵션 (`at_risk`)

라벨 규칙(기본):

- `at_risk = (achievement_rate < 40) OR (absence_count >= ceil(total_sessions * 1/3))`

---

## 7. 모델 학습/추론

### 학습

`backend/scripts/train_model.py`

- 모델: `Pipeline(SimpleImputer + LogisticRegression)`
- 핵심 옵션: `class_weight='balanced'`, `max_iter=1000`, `random_state=42`
- 피처: `backend/src/config.py`의 `FEATURE_COLS`
- 출력: `models/logistic_model.joblib`

```bash
python backend/scripts/train_model.py
```

### 리포트 생성(배치)

`backend/scripts/generate_prediction_report.py`

```bash
python backend/scripts/generate_prediction_report.py
```

출력:

- `reports/tables/prediction_report_YYYYMMDD.csv`

### 스모크 테스트

`backend/scripts/smoke_test_preprocessing.py`

```bash
python backend/scripts/smoke_test_preprocessing.py
```

검증 항목:

- all-NaN 컬럼 보정 동작
- missing flag 생성 동작
- 라벨 분포 유효성

---

## 8. API 스펙 요약

`backend/api/main.py`

- `GET /`
  - `client/dist/index.html` 존재 시 프론트 서빙
  - 없으면 API 메시지 반환
- `GET /api/health`
- `GET /api/sample/dummy-midterm-like-labeled`
- `POST /api/predict`
  - multipart: `file`(CSV), `policy`(JSON 문자열)
  - query: `mode=full|compact`
- `GET /api/download/{filename}`

### policy 예시

```json
{
	"threshold": 0.4,
	"midterm_max": 100,
	"midterm_weight": 40,
	"final_max": 100,
	"final_weight": 40,
	"performance_max": 100,
	"performance_weight": 20,
	"total_classes": 160
}
```

### 리포트 확장 로직

`backend/src/report_logic.py`

- 위험 등급: `High(>=0.70)`, `Medium(>=0.40)`, `Low`
- 개입 권장 문구(`action`)
- 참여 위험 지표(`participation_risk_score`, `participation_flag`)
- 결석 허용 계산(`absence_limit`, `remaining_absence_allowance`)
- 점수 가이드(`score_guidance`)
- 주요 사유(`top_reasons`)

---

## 9. 프론트 구조 요약

- 페이지
  - `client/src/pages/LandingPage.tsx`
  - `client/src/pages/DashboardPage.tsx`
- 업로드
  - `client/src/components/upload/UploadModal.tsx`
- 대시보드
  - 테이블/필터/컬럼 선택/상세 드로어/모바일 플로팅 네비게이션
- API 유틸
  - `client/src/shared/api.ts` (`buildApiUrl`, `predictCsv`)

---

## 10. Docker/배포

`Dockerfile` 기준:

- 멀티스테이지 빌드
  - Stage 1: React 빌드
  - Stage 2: FastAPI 런타임
- 단일 컨테이너에서 API + 정적 프론트 서빙
- `PORT` 환경변수 기반 실행(Render 호환)

### 로컬 Docker 검증

```bash
docker build -t edutech-risk-prediction:local .
docker run --rm -d -p 8000:8000 --name edutech-app edutech-risk-prediction:local
```

---

## 11. 주요 이슈/회고 문서

`docs/` 참고:

- `docs/issues_technical_issues_and_resolutions.md`
- `docs/issues_upload_not_navigate_to_dashboard_in_docker.md`
- `docs/issues_docker_desktop_ports_not_visible.md`
- `docs/issues_table_sticky_and_horizontal_scroll.md`
- `docs/issues_filter_popover_scroll_and_positioning.md`
- `docs/study_render_single_service_deployment_guide.md`

핵심 교훈:

- 결측은 숨기지 말고 정보로 보존(`*_missing` 피처)
- 학습/추론 피처 계약을 명시적으로 고정
- 전처리 변경 시 스모크 테스트로 회귀를 빠르게 확인
- 배포 환경의 API base URL 하드코딩 리스크를 사전에 차단

---

## 12. 디렉터리

```text
edutech-risk-prediction/
├─ backend/
│  ├─ api/
│  ├─ src/
│  └─ scripts/
├─ client/
├─ data/dummy/
├─ models/
├─ reports/
└─ docs/
```
