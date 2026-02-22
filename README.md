# 최성보 신호등 (MAP LIGHT) : EduTech Risk Prediction

학기 중간 시점의 학습/행동 데이터를 기반으로,  
최소성취수준 보장지도 대상(위험군)을 조기에 식별하고 교사 개입까지 제공하는 End-to-End AI 서비스입니다.

본 프로젝트는 교사가 예방지도를 위한 예비군을 선별해야 하는 현장 업무 부담을
데이터 기반으로 경감하는 것을 목표로 합니다.

- 배포 서비스: https://maplight.onrender.com
- Render 무료 플랜으로 배포되어 첫 시작에 오랜 시간이 소요(cold-start)됩니다.

---

개발/운영/재현 가이드는 [`README_DEV.md`](README_DEV.md)를 참고해주세요.

---

## 1. 프로젝트 개요

2022 개정 교육과정에서는 최소성취수준 보장지도가 도입되었습니다. 다음 조건에 해당하는 학생은 보충지도를 의무적으로 실시해야 합니다.

- 성취율 40% 미만
- 결석률 1/3 이상(출석률 2/3 미도달)

문제는 학기 종료 후 성취율이 확정되기 때문에 학기 중간 시점에는 위험군 선별 기준이 부재하다는 점입니다.

해당 프로젝트는 다음과 같은 의문을 해결하기 위해 시작합니다.

- 학기 중간 데이터만으로 위험군을 조기에 찾을 수 있는가?
- 예측 결과를 점수만이 아니라 교사 행동까지 제시할 수 있는가?

---

## 2. 프로젝트 진행

- 데이터 설계 및 더미 데이터 생성
- EDA/전처리 설계
- 모델 학습 및 성능 검증
- 리포트 자동화 로직 설계
- FastAPI 백엔드 구현
- React 프론트엔드 구현
- Docker/Render 배포
- 이슈 분석/회고 문서화(`docs/`)

---

## 3. 핵심 기능

- CSV 업로드 기반 위험 예측 (`POST /api/predict`)
- 학교/학급별 평가 정책 입력
- 위험 확률(`risk_proba`) + 위험 등급(`risk_level`) 제공
- 교사 개입 근거 컬럼 자동 생성
  - `top_reasons`
  - `score_guidance`
  - `action`
  - `remaining_absence_allowance`
- 대시보드 탐색 기능
  - 컬럼 정렬/필터/숨김
  - 스티키 헤더
  - 학생 상세 드로어
  - 모바일 플로팅 네비게이션
- 결과 CSV 다운로드 (`GET /api/download/{filename}`)

---

## 4. 기술 스택

### Backend / ML

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)

### Frontend

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Sass](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)

### Infra / Deploy

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=000000)
![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

---

## 5. 프로젝트 진행 흐름

1. EDA 및 전처리 방향 수립 (Notebook)
2. 모델 학습/검증 실험 (Notebook)
3. 실험 코드를 파이썬 모듈/스크립트로 전환
4. 개입전략 및 리포트 자동화 로직 추가
5. FastAPI 백엔드 구현
6. React 프론트엔드 구현
7. Docker/Render 배포

### Architecture Overview

본 서비스는 단일 Docker 컨테이너 기반의 Full-Stack ML 시스템으로 구성되어 있습니다.

```mermaid
flowchart LR

  %% =======================
  %% User Layer
  %% =======================
  U[Teacher User]

  %% =======================
  %% Frontend
  %% =======================
  FE[React Dashboard<br/>Vite + TypeScript + SCSS]

  %% =======================
  %% Backend API
  %% =======================
  API[FastAPI<br/>/api/predict<br/>/api/download]

  %% =======================
  %% ML Pipeline
  %% =======================
  PRE[Preprocessing Pipeline<br/>- validate_schema<br/>- missing flags<br/>- encoding]
  MODEL[Logistic Regression Model<br/>predict_proba]
  REPORT[Report Logic<br/>- risk_level<br/>- top_reasons<br/>- score_guidance<br/>- absence_limit]

  %% =======================
  %% Data
  %% =======================
  CSV[(Uploaded CSV)]
  POLICY[(Evaluation Policy JSON)]
  MODELFILE[(models/logistic_model.joblib)]

  %% =======================
  %% Flow
  %% =======================
  U -->|Upload CSV + Policy| FE
  FE -->|POST /api/predict| API

  API --> CSV
  API --> POLICY
  API --> MODELFILE

  API --> PRE
  PRE --> MODEL
  MODEL --> REPORT
  REPORT --> API

  API -->|Prediction JSON| FE
  FE -->|GET /api/download| API

  %% =======================
  %% Deployment Context
  %% =======================
  subgraph Render["Render (Single Docker Web Service)"]
    FE
    API
    PRE
    MODEL
    REPORT
  end
```

1. 교사는 CSV 파일과 평가 정책(JSON)을 업로드합니다.
2. React 대시보드는 /api/predict 엔드포인트로 데이터를 전송합니다.
3. FastAPI는 업로드된 데이터를 전처리 파이프라인에 전달합니다.
4. 전처리 결과는 학습된 Logistic Regression 모델로 전달되어 위험 확률(risk_proba)이 계산됩니다.
5. 예측 결과는 report_logic 모듈을 통해 교사 개입 가능한 형태의 컬럼(top_reasons, score_guidance, action 등)으로 확장됩니다.
6. 최종 결과는 JSON으로 프론트엔드에 반환되며, 필요 시 CSV 파일로 다운로드할 수 있습니다.

배포 환경에서는 React 빌드 결과(client/dist)를 FastAPI가 정적 파일로 직접 서빙하며, Render 단일 Web Service에서 API와 프론트엔드를 함께 운영합니다.

### 1단계: EDA와 전처리

초기에는 `notebook/01_eda.ipynb`, `notebook/02_risk_prediction.ipynb`에서  
중간 시점 데이터의 분포와 위험군 패턴을 확인했습니다.

핵심 확인 포인트:

- 결석 증가와 위험군 비율 관계
- 수행/중간 점수와 위험군 관계
- 과제/참여도와 위험군 관계
- 중간 시점 특성상 `final_score` 결측(all-NaN) 처리 필요성

결과 이미지:

- 결석과 위험군
  ![EDA: 결석과 위험군](reports/figures/eda_absence_vs_risk.png)
- 수행평가와 위험군
  ![EDA: 수행평가와 위험군](reports/figures/eda_performance_vs_risk.png)
- 과제 제출과 위험군
  ![EDA: 과제 제출과 위험군](reports/figures/eda_assignment_vs_risk.png)
- 참여도와 위험군
  ![EDA: 참여도와 위험군](reports/figures/eda_participation_vs_risk.png)

전처리 구현 결과:

- `backend/src/preprocessing.py`로 파이프라인 모듈화
- 결측 플래그(`*_missing`)를 피처로 보존
- all-NaN 컬럼 fallback 처리
- 참여도 인코딩(`participation_level_num`)
- 라벨 생성 규칙(`at_risk`) 정리

### 2단계: 모델 실험과 선택

EDA 이후 위험군 분류 baseline으로 Logistic Regression을 먼저 확정했습니다.

#### 왜 Logistic Regression을 선택했는가

1. 해석 가능성

- 교육 현장에서는 "왜 위험한가"가 중요하므로 계수 기반 설명이 가능한 모델이 필요했습니다.

2. 데이터 구조 적합성

- 현재 데이터는 정형(tabular) + 제한된 피처 구조이므로, 초기 baseline으로 선형 모델이 적합했습니다.

3. 확률 기반 의사결정

- `predict_proba`를 활용해 학교별 정책에 따라 컷오프를 조정할 수 있습니다.

계수 산출물(`reports/tables/feature_importance_logistic.csv`) 예시:

- `absence_count`: +0.293
- `midterm_score`: -1.278
- `performance_score`: -1.289

### 3단계: 성능 평가 기준 설계

모델을 선택한 뒤, 지표를 "정확도 단일 기준"이 아니라 현장 개입 목적 기준으로 정했습니다.

> 해석 주의:
>
> - 저장소 데이터는 더미(시뮬레이션) 데이터입니다.
> - 단일 학습 지표(1.0)는 과대평가 가능성이 있으므로 CV/외부 검증 중심으로 해석합니다.
> - 본 프로젝트의 핵심 성과는 "운영 가능한 파이프라인 + 개입 가능한 리포트" 구축입니다.

#### 성능 평가 기준 선정

- Recall: 위험군 누락 최소화(개입 대상 놓치지 않기)
- Precision: 과개입/자원 낭비 방지
- F1: Recall-Precision 균형 확인
- Accuracy: 보조 지표

또한 단일 split 과대평가를 피하기 위해 5-Fold CV(교차 검증) 결과를 함께 사용했습니다.

#### 성능평가 결과:

| Metric    |       Mean |        Std |
| --------- | ---------: | ---------: |
| Accuracy  | **0.9900** | **0.0091** |
| Precision | **0.9963** | **0.0083** |
| Recall    | **0.9925** | **0.0103** |
| F1        | **0.9943** | **0.0052** |

위 지표는 `reports/tables/cv_metrics_logistic.csv` 기반 5-Fold CV 입니다.

시각화 참고(혼동행렬은 holdout 예측 결과, 나머지 그래프는 데이터 분포 확인용):

- 혼동 행렬
  ![혼동행렬](reports/figures/cm_logistic_regression.png)

- 성취율 분포
  ![성취율 분포](reports/figures/achievement_rate_distribution.png)

- 위험군 비율 비교
  ![데이터셋 위험군 비율 비교](reports/figures/risk_rate_comparison.png)

결과 해석:

- 평균 Recall **0.9925**(Std **0.0103**)로 위험군 누락을 거의 만들지 않는 패턴을 보여, 본 프로젝트의 핵심 목표(개입 대상 선별)와 지표 선택 기준이 일치합니다.
- Precision **0.9963**도 함께 높아 과개입 가능성은 낮게 나타났고, Recall-Precision 균형 지표인 F1(**0.9943**) 역시 안정적입니다.
- Fold별 점수가 `0.983~1.000` 범위에 머물러 데이터 분할에 따른 성능 흔들림이 크지 않으며, 현재 더미 데이터 기준에서는 분류 경계가 일관되게 형성됩니다.
- 다만 holdout 혼동행렬(`[[7, 0], [0, 53]]`)과 일부 Fold의 완전 분류(1.000)는 실제 성능 보장이라기보다 더미 데이터의 높은 분리도 영향을 크게 받았을 가능성이 큽니다.
- 따라서 이 결과는 “모델 일반화 성능 확정”보다 “운영 가능한 위험군 예측 파이프라인/리포트 동작 검증”의 근거로 해석하고, 실제 데이터 적용 시 외부 검증, 임계값 재조정이 필요합니다.

#### 순열 중요도 결과:

![Permutation Importance](reports/figures/permutation_importance_bar.png)

Permutation Importance(`reports/tables/permutation_importance.csv`)

결과 해석:

- `absence_count`가 가장 큰 중요도(`importance_mean ≈ 0.0536`)를 보여, 결석 정보가 위험군 예측에 가장 크게 기여했습니다.
- 다음으로 `participation_level_num`(`≈ 0.0329`), `behavior_score`(`≈ 0.0223`), `midterm_score`(`≈ 0.0202`) 순으로 영향을 주며, 학습 참여/행동/중간 성취 신호가 핵심 변수로 작동했습니다.
- `night_study`, `question_count`는 보조적인 신호(약 `0.004`대)로 해석할 수 있고, `assignment_count` 영향은 매우 작았습니다.
- `midterm_score`, `final_score`, `performance_score` 및 결측 플래그 변수들(`*_missing`)는 결측이 가능하기에 이를 유의해서 읽어야 합니다.
- 순열 중요도는 상관된 변수들 사이에서 중요도가 나뉠 수 있으므로, 계수 해석(Logistic Regression)과 함께 보는 것을 기준으로 삼았습니다.

### 4단계: 파이썬 모듈화 + 개입전략/리포트 자동화

노트북 실험에서 끝내지 않고 서비스 운영 가능한 형태로 코드화했습니다.

- 모델 학습 스크립트: `backend/scripts/train_model.py`
- 배치 리포트 생성: `backend/scripts/generate_prediction_report.py`
- 리포트 로직 모듈: `backend/src/report_logic.py`

자동 생성 컬럼:

- `risk_proba`, `risk_level`
- `top_reasons`
- `score_guidance`
- `action`
- `absence_limit`, `remaining_absence_allowance`

즉, "위험 점수 출력"에서 끝나지 않고 "개입 가능한 문장/가이드 생성"까지 확장했습니다.

### 5~7단계: 백엔드, 프론트, 배포

#### 백엔드 (FastAPI)

- `backend/api/main.py`
- 업로드/예측/다운로드/샘플 API 구성
- 정책 입력(JSON) 기반 동적 계산

#### 프론트엔드 (React)

- `client/src/pages/LandingPage.tsx`
- `client/src/pages/DashboardPage.tsx`
- 업로드 -> 결과 확인 -> 상세 탐색 -> CSV 다운로드 UX

#### 배포

- Docker 멀티스테이지 빌드
- Render 단일 서비스 배포
- 서비스 URL: https://maplight.onrender.com

> 페이지 스크린샷 (PC / Mobile): [`screenshots.md`](docs/_README_screenshots.md)

---

## 6. 프로젝트 포인트

- 실험 노트북 -> 서비스 코드로 전환한 제품화 경험
- 모델 선택/평가 기준을 교육 개입 목적과 연결해 설명 가능
- 예측 결과를 교사 행동 전략까지 확장한 리포트 자동화
- 데이터/모델/API/UI/배포 전 과정을 경험

---
