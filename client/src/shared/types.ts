export type EvaluationPolicy = {
	threshold: number; // 0~1
	midterm_max: number;
	midterm_weight: number; // %
	final_max: number;
	final_weight: number; // %
	performance_max: number;
	performance_weight: number; // %
	total_classes: number; // 총 수업 횟수
};
