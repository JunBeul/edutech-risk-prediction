# edutech-learning-analysis

학생 학습 행동 데이터를 기반으로 성취도(총점)와의 관계를 탐색하고, 교육 현장에 적용 가능한 개입 아이디어를 도출하는 EDA(탐색적 데이터 분석) 프로젝트입니다.

---

## 1. 목표 (Problem)

- 학습 행동 변수(학습시간, 과제 제출률, LMS 접속 등)가 성취도와 어떤 관계를 갖는지 탐색한다.
- 상위권/하위권 학생 집단의 행동 차이를 정량적으로 비교한다.
- 분석 결과를 바탕으로 학교 현장에서 실행 가능한 개입 방안을 제안한다.

---

## 2. 데이터 (Dataset)

> 실제 학생 데이터는 개인정보 보호를 위해 비식별화 처리하며, Git에는 더미 데이터만 포함합니다.

### 사용 컬럼 (예시)

| 컬럼            | 설명                       |
| --------------- | -------------------------- |
| student_id      | 비식별 학생 ID             |
| study_time      | 주간 학습시간              |
| assignment_rate | 과제 제출률 (0~1)          |
| lms_login       | LMS 접속 횟수              |
| absence         | 결석 횟수                  |
| late            | 지각 횟수                  |
| total_score     | 성취도 지표(총점/시험점수) |

### 데이터 폴더 구조

- `data/raw/` : 원본(더미/비식별) 데이터
- `data/processed/` : 전처리 완료 데이터

---

## 3. 프로젝트 구조 (Project Structure)

```text
edutech-learning-analysis/
├─ data/
│  ├─ raw/
│  └─ processed/
├─ notebook/
│  └─ 01_eda.ipynb
├─ src/
│  └─ preprocessing.py
├─ reports/
│  ├─ figures/
│  └─ tables/
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
jupyter notebook
notebook/01_eda.ipynb
```

## 5. 분석 내용 (Analysis)

- 데이터 요약 및 품질 점검: info, describe, 결측치/이상치 확인
- 성취도와의 상관관계 분석: 상관 히트맵
- 주요 변수별 관계 시각화: 산점도/분포
- 상/하위권(Top/Bottom 20%) 집단 비교

## 6. 주요 발견점 (Key Findings)

- 과제 제출률과 성취도 간 강한 양의 상관관계 발견
- LMS 접속 빈도가 높은 학생이 평균 성취도 15% 높음
- 결석/지각이 많은 학생은 성취도에서 유의미한 감소

## 7. 교육 현장 적용 아이디어 (Actionable Ideas)

### 위험군 조기 탐지

- 과제 제출률/출결 기반으로 위험군을 조기 선별하여 상담/보충학습 개입

### 학습 참여 유도 자동 알림

- LMS 접속 패턴이 낮은 학생에게 학습 알림/개인 맞춤 자료 제공

## 8. 결과물 (Outputs)

reports/figures/ : 시각화 이미지(히트맵/산점도/분포 등)

reports/tables/ : 집단 비교 요약 테이블(CSV)

## 9. 개인정보 처리 원칙 (Privacy)

- 이름/학번/연락처 등 직접 식별 정보는 수집/저장하지 않음

- student_id는 랜덤/해시 기반 비식별 ID 사용

- GitHub 공개 저장소에는 더미 데이터만 포함

- 실제 데이터는 내부 보안 서버에 별도 보관
