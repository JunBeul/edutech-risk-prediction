# edutech-risk-prediction

정보·컴퓨터 교과에서 **최소성취수준 보장지도(최성보) 위험군 학생을 학기 중간 시점에 조기 예측**하기 위한  
EduTech 데이터 분석 및 AI 예측 프로젝트입니다.

본 프로젝트는 교사가 예방지도를 위한 예비군을 선별해야 하는 현장 업무 부담을  
데이터 기반으로 경감하는 것을 목표로 합니다.

---

## 1. 프로젝트 배경

2022 개정 교육과정에서는 최소성취수준 보장지도가 도입되었습니다. 다음 조건에 해당하는 학생은 보충지도를 의무적으로 실시해야 합니다.

- 성취율 40% 미만
- 결석률 1/3 이상(출석률 2/3 미도달)

문제는 학기 종료 후 성취율이 확정되기 때문에 학기 중간 시점에는 위험군 선별 기준이 부재하다는 점입니다.

특히 정보·컴퓨터 교과는

- 모의고사 없음
- 수행평가 비중 높음
- 과정 중심 평가 구조

로 인해 사전 선별이 더욱 어렵습니다.

---

## 2. 프로젝트 목표

학기 중간 시점의 학습·행동 데이터를 기반으로 **최소성취수준 미도달 위험군(at_risk)을 조기 예측**합니다.

- (분석) 위험군 분포 및 영향 요인 탐색
- (모델) 위험군 분류 모델 구축 및 평가
- (적용) 현장 개입(예방지도) 우선순위 도출을 위한 근거 제공

---

## 3. 데이터 스키마 (Single Schema)

> 학기 중간 스냅샷에서 `final_score`, `performance_score`는 결측(NaN)일 수 있습니다.  
> 본 저장소에는 개인정보 보호를 위해 더미 데이터만 포함됩니다.

| Column              | Description                              |
| ------------------- | ---------------------------------------- |
| student_id          | 비식별 학생 ID                           |
| midterm_score       | 중간고사 성적 (결측 허용)                |
| final_score         | 기말고사 성적 (결측 허용)                |
| performance_score   | 수행평가 성적 (결측 허용)                |
| assignment_count    | 과제 제출 횟수                           |
| participation_level | 수업 참여도 (상/중/하)                   |
| question_count      | 질문 횟수                                |
| night_study         | 야간자율학습 참여 여부 (0/1)             |
| absence_count       | 결석 횟수                                |
| behavior_score      | 상벌점                                   |
| at_risk             | 최성보 위험군 라벨 (조기 예측 대상, 0/1) |

### 파생 컬럼(모델 입력 안정화용)

결측 여부가 0점과 혼동되지 않도록 **missing flag**를 추가합니다.

- `midterm_score_missing`
- `final_score_missing`
- `performance_score_missing`
- `participation_level_num` (상/중/하 인코딩)

---

## 4. 더미 데이터 구성

경로:

```text
data/dummy/
```

생성 파일:

- dummy_full.csv → 학기 말 가정 데이터
- dummy_midterm_like.csv → 학기 중간 가정 데이터
- dummy_full_labeled.csv
- dummy_midterm_like_labeled.csv
- data_dictionary.csv

더미 데이터는 다음 목적을 위해 사용합니다.

- 노트북/파이프라인 재현성 확보
- 결측(final_score, performance_score) 등 스냅샷 상황 검증
- 모델 학습/평가 흐름 검증

---

## 5. 전처리 파이프라인

경로:

```text
src/preprocessing.py
```

주요 기능:

- 단일 스키마 검증 (필수 컬럼 확인)
- 기본 정제: 중복 제거, numeric coercion
- 결측 플래그 생성(missing flag)
- 결측치 처리: median/mean + all-NaN 컬럼 fallback(스냅샷 방어)
- 참여도 인코딩(participation_level_num)
- 성취율(achievement) 계산 시 결측 컬럼은 제외하여 평균(가용 항목 기준)

추가 품질 게이트(스모크 테스트):

```text
scripts/smoke_test_preprocessing.py
```

---

## 6. 탐색적 데이터 분석 (EDA)

노트북:

```text
notebook/01_eda.ipynb
```

분석 내용:

1. 데이터 품질 점검
2. 결측 데이터 영향 분석
3. 위험군 분포 분석
4. 변수별 위험군 차이 분석
5. 조기 탐지 후보 변수 도출

---

## 7. 위험군 예측 모델 (Project 1)

노트북:

```text
notebook/02_risk_prediction.ipynb
```

### 7.1 모델 설정

- 알고리즘: Logistic Regression
- 결측 처리: SimpleImputer(Constant=0)
- 클래스 불균형 대응: class_weight="balanced"
- 평가 방식: Stratified 5-Fold Cross Validation
- 핵심 지표: Recall(위험군 놓침 최소화)

### 7.2 교차검증 성능 요약

> 아래 수치는 더미 데이터 기반 실험 결과이며, 실제 데이터 적용 시 재검증이 필요합니다.

| Metric    | Score  |
| --------- | ------ |
| Accuracy  | 0.9900 |
| Precision | 0.9963 |
| Recall    | 0.9925 |
| F1-Score  | 0.9943 |

| Metric    | Score  |
| --------- | ------ |
| Accuracy  | 0.0091 |
| Precision | 0.0083 |
| Recall    | 0.0103 |
| F1-Score  | 0.0052 |

### 7.3 모델 선정 이유

본 프로젝트에서는 위험군 예측 모델로 Logistic Regression을 우선 적용하였다.

- 해석 가능성: 계수 기반으로 위험 증가/감소 요인 설명 가능
- 데이터 규모 적합성: 소규모 정형 데이터에서 과적합 위험이 낮음
- 확률 기반 의사결정: 임계값을 학교 상황에 맞게 조정 가능
- 기준선(Baseline) 역할: 향후 고급 모델과 비교 기준 제공

> Feature importance(계수 기반 정리)는 추후 단계에서 별도 리포트로 확장 예정입니다.

---

## 8. 주요 발견점(더미 데이터 기준)

위험군 학생은 다음 특성을 보였습니다.

- 결석 횟수 높음
- 과제 제출 횟수 낮음
- 수행평가 점수 낮음(결측 제외)
- 참여도 낮음

→ 학기 중간 시점에서도 위험군 조기 탐지 가능

---

## 9. 산출물 (Outputs)

### Tables

    reports/tables/

- 예측 리포트: prediction_report_YYYYMMDD.csv (날짜 접미사)

---

## 10. 향후 계획 (Next)

- 실제 학교 현장 데이터(비식별)로 성능 재검증 및 임계값(Threshold) 최적화
- CSV 업로드 기반 예측 리포트 자동 생성(대시보드/서빙 단계)
- (Project 2) 보고서형 수행평가 자동 채점 프로젝트로 확장

---

## 11. 개인정보 처리

- 실제 학생 데이터 비공개
- 저장소에는 더미 데이터만 포함
- 분석 결과는 집계·익명화하여 보고

---

## Quickstart — Risk Prediction Report

예측 리포트는 아래 2단계로 생성할 수 있습니다.

### 1) 모델 학습 및 저장

```bash
python scripts/train_model.py
```

저장 경로:

```text
models/logistic_model.joblib
```

### 2) 예측 리포트 생성

```bash
python scripts/generate_prediction_report.py
```

출력 파일:

```text
reports/tables/prediction_report_YYYYMMDD.csv
```

### 3) 교사 입력값(임시)

현재는 `src/config.py`의 `EVALUATION_POLICY`에 임시값으로 정의되어 있으며,<br>
웹 UI 구축 시 CSV 업로드와 함께 입력받는 형태로 전환할 예정입니다.

- (성취율 기준) 40%
- 중간/기말/수행 만점 및 반영비율(합 100%)
- 총 수업일수

예측 리포트 주요 컬럼:

| Column                      | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| student_id                  | 학생 ID                                                         |
| risk_proba                  | 위험군 확률                                                     |
| risk_level                  | High / Medium / Low                                             |
| top_reasons                 | 위험 사유(최대 3개, 결측 점수는 제외)                           |
| score_guidance              | 결측 점수(기말/수행) 기준 성취율 40% 충족을 위한 필요 점수 안내 |
| absence_limit               | 총수업일 기준 결석 한도(floor(total/3))                         |
| remaining_absence_allowance | 결석 한도까지 남은 결석 여유(횟수)                              |
| participation_risk_score    | 참여도 종합 점수(하위 15%+참여도)                               |
| participation_flag          | 참여도 저하 여부(0/1)                                           |
| action                      | 권장 개입 전략                                                  |

---

본 리포트는 학기 중간 시점 데이터만으로<br>
최성보 위험군 예비군을 조기 선별하기 위한 목적으로 생성됩니다.<br>
생성된 리포트는 교사의 판단을 보조하는 참고 자료로 활용하시기 바랍니다.

---
