from __future__ import annotations

FEATURE_COLS = [
    "midterm_score",                # 중간고사 점수
    "final_score",                  # 기말고사 점수
    "performance_score",            # 수행평가 점수
    "midterm_score_missing",        # 중간고사 결측 플래그
    "final_score_missing",          # 기말고사 결측 플래그
    "performance_score_missing",    # 수행평가 결측 플래그
    "assignment_count",             # 과제 제출 횟수
    "question_count",               # 질문 횟수
    "night_study",                  # 야간 자율학습 참여 여부
    "absence_count",                # 결석 횟수
    "behavior_score",               # 상벌점
    "participation_level_num",      # 수업 참여도 (상=2/중=1/하=0)
]

SCORE_RULE = {                  # 성취율 계산용 기준값 (유저 입력)
    "threshold": 0.40,          # T : 최성보 성취율 기준(0~1)
    "midterm_max": 100,         # 중간고사 만점
    "midterm_weight": 40,       # %
    "final_max": 100,           # 기말고사 만점
    "final_weight": 40,         # %
    "performance_max": 100,     # 수행평가 만점
    "performance_weight": 20,   # %
}