export const COLUMN_LABELS: Record<string, string> = {
	// 식별/결과
	student_id: '학생 ID',
	risk_level: '위험도',
	risk_proba: '위험 확률',
	top_reasons: '위험 사유',
	action: '권장 조치',

	// 점수/안내
	midterm_score: '중간고사 점수',
	final_score: '기말고사 점수',
	performance_score: '수행평가 점수',
	score_guidance: '점수 안내(역산)',

	// 참여/행동
	assignment_count: '과제 제출 횟수',
	participation_level: '수업 참여도',
	question_count: '질문 횟수',
	night_study: '야간자율학습',
	behavior_score: '상벌점',
	absence_count: '결석 횟수',
	absence_limit: '결석 한도',

	// 파생값(프로젝트 내부)
	participation_risk_score: '참여도 위험 점수',
	participation_flag: '참여도 위험 여부',
	remaining_absence_allowance: '남은 결석 허용 횟수',

	// 위험 라벨/모델 관련
	at_risk: '위험군 여부',

	// 결측 플래그
	midterm_score_missing: '중간고사 결측 여부',
	final_score_missing: '기말고사 결측 여부',
	performance_score_missing: '수행평가 결측 여부',

	// 파생 점수
	participation_level_num: '참여도 수치화 점수',
	achievement_rate: '성취율'
};

export function labelOf(colKey: string): string {
	return COLUMN_LABELS[colKey] ?? colKey; // 미정의 키는 원문 표시
}
