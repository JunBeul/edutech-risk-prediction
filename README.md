# EduTech Risk Prediction

학기 중간 시점의 학습/행동 데이터를 기반으로 최소 성취수준 미도달 위험 학생을 조기 식별하는 End-to-End 프로젝트입니다.

이 저장소에는 다음이 포함됩니다.

- 데이터 전처리 파이프라인
- 위험 예측 모델 학습
- FastAPI 기반 추론/리포트 API
- 탐색 및 다운로드를 위한 React 대시보드

## 1. 문제 정의

많은 교실에서 고위험 학생은 학기 말에 가까워져서야 식별됩니다.  
이 프로젝트는 더 이른 시점에 위험을 예측하고, 실제 개입 가능한 가이드를 제공합니다.

## 2. 프로젝트가 제공하는 것

- CSV 업로드 기반 위험 예측 (`POST /api/predict`)
- 학교/학급별 평가 정책 동적 설정
  - 성취 기준 임계치
  - 평가 항목 만점 및 반영 비율
  - 총 수업 시수
- 교사 개입을 위한 리포트 확장 컬럼
  - `risk_proba`, `risk_level`, `top_reasons`, `score_guidance`, `action`
  - `absence_limit`, `remaining_absence_allowance`
  - `participation_risk_score`, `participation_flag`
- 대시보드 UX
  - 컬럼 필터/정렬/숨김
  - 스티키 테이블 헤더
  - 행 상세 드로어
  - 모바일 플로팅 내비게이션
- CSV 리포트 저장 및 다운로드 엔드포인트 제공 (`GET /api/download/{filename}`)

## 3. 기술 스택

- Backend: `FastAPI`, `pandas`, `scikit-learn`, `joblib`, `uvicorn`
- Frontend: `React 19`, `TypeScript`, `Vite`, `SCSS`
- Model: `LogisticRegression` + `SimpleImputer`
- 개발 실행: 루트 `npm run dev` (`concurrently`)

## 4. 데이터와 전처리

핵심 스키마 컬럼:

- `student_id`
- `midterm_score`, `final_score`, `performance_score`
- `assignment_count`, `participation_level`, `question_count`
- `night_study`, `absence_count`, `behavior_score`

전처리(`backend/src/preprocessing.py`) 수행 항목:

- 스키마 검증
- 기본 정제 및 수치형 변환
- 결측 플래그 생성 (`*_missing`)
- 결측치 대체 (median/mean + all-NaN fallback)
- 참여도 인코딩 (`participation_level_num`)
- 타깃 라벨 생성 옵션 (`at_risk`)

기본 더미 데이터셋:

- `data/dummy/dummy_full_labeled.csv` (300행, `at_risk` 비율: 0.60)
- `data/dummy/dummy_midterm_like_labeled.csv` (300행, `at_risk` 비율: 0.60)

## 5. 모델 및 성능

학습 스크립트: `backend/scripts/train_model.py`

- 모델: Logistic Regression (`class_weight='balanced'`)
- 입력 피처: `backend/src/config.py`의 `FEATURE_COLS`
- 결측 처리: `SimpleImputer(strategy='constant', fill_value=0)`

5-Fold CV 평균 성능 (`reports/tables/cv_metrics_logistic.csv`):

- Accuracy: `0.9900`
- Precision: `0.9963`
- Recall: `0.9925`
- F1: `0.9943`

참고:

- `reports/tables/model_metrics_logistic.csv`의 단일 학습 지표는 완벽에 가깝기 때문에, 일반화 성능 평가는 CV/외부 검증을 우선해야 합니다.
- 현재 저장소 데이터는 더미(시뮬레이션) 데이터입니다.

### 5.1 모델 선정 이유

본 프로젝트에서는 위험군 예측 모델로 Logistic Regression을 우선 적용했습니다.

선정 이유는 다음과 같습니다.

#### 1) 해석 가능성 (Interpretability)

위험군 예측의 목적은 단순 분류를 넘어, 어떤 요인이 학생을 위험군으로 만드는지 설명하는 데 있습니다.
Logistic Regression은 변수별 계수를 통해 위험 증가/감소 요인을 명확히 해석할 수 있어 교육 현장 개입 전략 수립에 직접 활용 가능합니다.

#### 2) 데이터 규모 적합성

본 프로젝트 데이터는 변수 수가 제한적이고 표본 수가 크지 않은 정형(tabular) 데이터 구조를 가집니다.
이 경우 복잡한 비선형 모델보다 선형 모델이 과적합 위험이 낮고 안정적인 일반화 성능을 보입니다.

#### 3) 확률 기반 의사결정 지원

Logistic Regression은 위험군 분류 결과를 단순 0/1이 아닌 확률값으로 제공합니다.
이를 통해 예방지도 대상 선별 임계값을 학교 상황에 맞게 유연하게 조정할 수 있습니다.

#### 4) 기준선 (Baseline Model) 역할

프로젝트 초기 단계에서는 설명력과 재현성이 높은 기준 모델이 필요합니다.
향후 RandomForest, Gradient Boosting 등 고급 모델 확장 시 성능 비교 기준으로 활용 가능합니다.

## 6. 시스템 흐름

1. 사용자가 웹 UI에서 CSV 업로드 및 정책 입력
2. API가 전처리 후 `risk_proba` 추론
3. API가 사유/가이드/액션 컬럼까지 확장
4. 대시보드에서 테이블 탐색 및 상세 확인
5. 생성된 리포트 CSV 다운로드

## 7. API 요약

- `GET /` - 프론트엔드 정적 앱 엔트리(빌드 미존재 시 API 메시지 반환)
- `GET /api/health` - 헬스 체크
- `POST /api/predict` - multipart 업로드 (`file`, `policy`) + query `mode=full|compact`
- `GET /api/download/{filename}` - 저장된 리포트 CSV 다운로드
- `GET /api/sample/dummy-midterm-like-labeled` - 예시 더미 CSV 다운로드

## 8. 로컬 실행

### 8.1 사전 요구사항

- Python 3.11+
- Node.js 20+

### 8.2 의존성 설치

```bash
pip install -r requirements.txt
npm install
npm --prefix client install
```

### 8.3 프론트 환경변수 설정

`client/.env` 파일 생성:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 8.4 개발 서버 실행

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`

## 9. 배치 실행

모델 학습:

```bash
python backend/scripts/train_model.py
```

리포트 생성:

```bash
python backend/scripts/generate_prediction_report.py
```

출력:

- 모델: `models/logistic_model.joblib`
- 리포트: `reports/tables/prediction_report_YYYYMMDD*.csv`

## 10. 프로젝트 구조

```text
edutech-risk-prediction/
+-- backend/api/           # FastAPI app
+-- client/        # React app
+-- backend/src/           # preprocessing/report shared logic
+-- backend/scripts/       # train/report/smoke scripts
+-- data/dummy/    # dummy datasets
+-- models/        # trained model artifacts
+-- reports/       # metrics and generated reports
`-- notebook/      # EDA and experiments
```

## 11. 포트폴리오 포인트

- 노트북 실험에 그치지 않고, 전처리 -> API 추론 -> 리포트 생성 -> 대시보드까지 전체 워크플로우를 구현했습니다.
- 단순 예측 점수 외에 교사 의사결정을 돕는 확장 필드를 제공했습니다.
- `preprocessing`, `report_logic`, API, 프론트엔드로 모듈을 분리해 재사용 가능한 구조로 설계했습니다.

## 12. 다음 단계

- 서비스 배포 준비.

