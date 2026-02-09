# edutech-learning-analysis

학생 학습 행동 데이터를 기반으로 성취도(총점)와의 관계를 탐색하고,<br>
학습 유형을 도출하며, 교육 현장에 적용 가능한 개입 아이디어를 설계하는 EduTech 데이터 분석 프로젝트입니다.

---

## 1. 프로젝트 목표 (Problem)

- 학습 행동 변수(학습시간, 과제 제출률, LMS 접속 등)가 성취도와 어떤 관계를 갖는지 탐색한다.
- 상위권/하위권 학생 집단의 행동 차이를 정량적으로 비교한다.
- K-Means 클러스터링을 통해 학습자 행동 유형을 도출한다.
- 분석 결과를 바탕으로 학교 현장에서 실행 가능한 개입 방안을 제안한다.

## 2. 데이터 설명 (Data)

실제 학생 데이터는 개인정보 보호를 위해 비식별화 처리하며, GitHub에는 더미 데이터만 포함됩니다.

- student_id: 비식별 학생 ID
- study_time: 학습 시간
- assignment_rate: 과제 제출률 (0~1)
- lms_login: LMS 접속 횟수
- absence: 결석 횟수
- late: 지각 횟수
- total_score: 총점 (성취도 지표)

### 데이터 폴더 구조

- data/raw/ : 원본(더미/비식별) 데이터
- data/processed/ : 전처리 완료 데이터

## 3. 프로젝트 구조 (Project Structure)

```text
edutech-learning-analysis/
├─ data/
│ ├─ raw/
│ └─ processed/
│
├─ notebook/
│ └─ 01_eda.ipynb
│
├─ src/
│ └─ preprocessing.py
│
├─ reports/
│ ├─ figures/
│ └─ tables/
│
├─ requirements.txt
└─ README.md
```

## 4. 실행 방법 (How to Run)

### 4.1 환경 구성

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4.2 노트북 실행

```bash
jupyter notebook notebook/01_eda.ipynb
```

## 5. 분석 수행 범위 (Analysis Scope)

본 프로젝트는 다음 분석 단계를 포함합니다.

### 5.1 데이터 이해 및 품질 점검

- info, describe
- 결측치 탐색
- 이상치 탐색

### 5.2 탐색적 데이터 분석 (EDA)

- 성취도 분포 분석
- 변수별 산점도
- 상관관계 히트맵
- 상·하위권 비교 분석

### 5.3 전처리 파이프라인 모듈화

src/preprocessing.py

#### 포함 기능:

- 데이터 로드
- 스키마 검증
- 중복 제거
- 타입 정리
- 결측치 처리
- IQR 기반 이상치 클리핑
- Feature / Target 분리
- 전처리 파이프라인 통합

## 6. K-Means 클러스터링

학습행동 기반 학습자 유형 도출을 위해 K-Means를 수행했습니다.

### 사용 변수

- study_time
- assignment_rate
- lms_login
- absence
- late

(성취도 제외 → 행동 기반 군집화)

### 클러스터 분포

| Cluster | 인원 | 비율  |
| ------- | ---- | ----- |
| 0       | 38   | 47.5% |
| 1       | 31   | 38.8% |
| 2       | 11   | 13.7% |

## 7. 학습자 유형 해석

### Cluster 2 — 고참여 성취형

- 학습시간 최고

- 과제 제출률 높음

- LMS 접속 최다

- 결석 최저

→ 자기주도 학습 역량이 높은 성실형 학습자

---

### Cluster 1 — 저시간 효율형

- 학습시간 낮음

- 과제 제출률 높음

- 결석 낮음

→ 과제 중심 학습 / 단기 집중형 학습자

---

### Cluster 0 — 저참여 위험군

- 과제 제출률 최저

- 결석 최고

→ 학습 참여도 및 출결 관리 필요 집단

## 8. 주요 발견점 (Key Findings)

- 과제 제출률과 성취도 간 강한 양의 상관관계 확인

- LMS 접속 빈도가 높은 학생일수록 성취도 평균이 높음

- 결석·지각 증가 시 성취도 감소 경향

- 학습행동 패턴 기반으로 3가지 학습자 유형 도출 가능

## 9. 교육 현장 적용 아이디어 (Actionable Ideas)

### 위험군 조기 탐지

- 과제 제출률 + 출결 기반 위험군 탐지

- 상담 및 보충학습 개입

### 학습 참여 유도 자동 알림

- LMS 접속 패턴 기반 학습 리마인드

### 맞춤형 학습 전략 제공

- 고참여형 → 심화 프로젝트

- 효율형 → 개념 강화

- 위험군 → 기초 보충

## 10. 결과물 (Outputs)

### 시각화

```bash
    reports/figures/
    ├─ correlation*heatmap.png
    ├─ hist_total_score.png
    ├─ scatter*_.png
    ├─ kmeans*scatter*_.png
    └─ kmeans*boxplot*\*.png
```

### 요약 테이블

```bash
reports/tables/
├─ cluster_profile_mean.csv
└─ cluster_score_summary.csv
```

## 11. 개인정보 처리 원칙 (Privacy)

- 이름, 학번 등 직접 식별 정보 미수집

- student_id는 비식별 처리

- GitHub에는 더미 데이터만 업로드

- 실제 데이터는 내부 보안 서버 보관

## 12. 향후 확장 계획 (Roadmap)

- 성취도 예측 회귀 모델 구축

- 성취도 등급 분류 모델

- 학습 추천 시스템

- LLM 기반 AI 학습 튜터
