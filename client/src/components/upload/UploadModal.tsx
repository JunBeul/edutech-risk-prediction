import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictCsv } from '../../shared/api';
import type { EvaluationPolicy } from '../../shared/types';
import { useEscapeClose } from '../../hooks/useEscapeClose';

import '../../styles/modal.scss';

type Props = {
	onClose: () => void;
	onSuccessNavigateTo: string;
};

function toNumber(v: string): number {
	// 빈 문자열/공백은 NaN 처리
	const n = Number(v);
	return n;
}

export default function UploadModal({ onClose, onSuccessNavigateTo }: Props) {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);

	useEscapeClose(onClose);

	// 입력은 string으로 들고 있다가, 제출 시 number 변환(HTML input 특성 대응)
	const [form, setForm] = useState({
		threshold: '0.4',
		midterm_max: '100',
		midterm_weight: '40',
		final_max: '100',
		final_weight: '40',
		performance_max: '100',
		performance_weight: '20',
		total_classes: '160'
	});

	const policy: EvaluationPolicy | null = useMemo(() => {
		const p: EvaluationPolicy = {
			threshold: toNumber(form.threshold),
			midterm_max: toNumber(form.midterm_max),
			midterm_weight: toNumber(form.midterm_weight),
			final_max: toNumber(form.final_max),
			final_weight: toNumber(form.final_weight),
			performance_max: toNumber(form.performance_max),
			performance_weight: toNumber(form.performance_weight),
			total_classes: toNumber(form.total_classes)
		};

		// 숫자 파싱 실패(NaN) 체크
		const values = Object.values(p);
		if (values.some((x) => Number.isNaN(x))) return null;

		return p;
	}, [form]);

	const errors = useMemo(() => {
		const errs: string[] = [];
		if (!policy) {
			errs.push('입력값을 숫자로 채우십시오.');
			return errs;
		}

		// 범위/제약
		if (policy.threshold <= 0 || policy.threshold >= 1) errs.push('threshold는 0~1 사이(예: 0.4)여야 합니다.');
		if (policy.midterm_max <= 0) errs.push('중간고사 만점은 1 이상이어야 합니다.');
		if (policy.final_max <= 0) errs.push('기말고사 만점은 1 이상이어야 합니다.');
		if (policy.performance_max <= 0) errs.push('수행평가 만점은 1 이상이어야 합니다.');
		if (policy.total_classes <= 0) errs.push('총 수업 횟수는 1 이상이어야 합니다.');

		// 반영비율 합 체크
		const wSum = policy.midterm_weight + policy.final_weight + policy.performance_weight;
		if (wSum !== 100) errs.push(`반영비율 합이 100이어야 합니다. (현재: ${wSum})`);

		// 음수 금지
		if (policy.midterm_weight < 0 || policy.final_weight < 0 || policy.performance_weight < 0) errs.push('반영비율은 음수가 될 수 없습니다.');

		return errs;
	}, [policy]);

	const canSubmit = file && policy && errors.length === 0;

	const onSubmit = async () => {
		if (!canSubmit || !policy || !file) return;

		const result = await predictCsv({
			file,
			policyObj: policy,
			mode: 'full'
		});

		onClose();
		navigate(onSuccessNavigateTo, { state: { result } });
	};

	const setField = (key: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<div className='modal_wapper'>
			<div className='modal_container' onClick={(e) => e.stopPropagation()}>
				<div className='modal_header'>
					<h3>파일 업로드</h3>
					<button onClick={onClose}>닫기</button>
				</div>

				<div className='modal_body'>
					<input type='file' accept='.csv' onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
						<label>
							최성보 비율
							<input value={form.threshold} onChange={(e) => setField('threshold', e.target.value)} />
						</label>

						<label>
							총 수업 횟수
							<input value={form.total_classes} onChange={(e) => setField('total_classes', e.target.value)} />
						</label>

						<label>
							중간 만점
							<input value={form.midterm_max} onChange={(e) => setField('midterm_max', e.target.value)} />
						</label>

						<label>
							중간 반영(%)
							<input value={form.midterm_weight} onChange={(e) => setField('midterm_weight', e.target.value)} />
						</label>

						<label>
							기말 만점
							<input value={form.final_max} onChange={(e) => setField('final_max', e.target.value)} />
						</label>

						<label>
							기말 반영(%)
							<input value={form.final_weight} onChange={(e) => setField('final_weight', e.target.value)} />
						</label>

						<label>
							수행 만점
							<input value={form.performance_max} onChange={(e) => setField('performance_max', e.target.value)} />
						</label>

						<label>
							수행 반영(%)
							<input value={form.performance_weight} onChange={(e) => setField('performance_weight', e.target.value)} />
						</label>
					</div>
					{errors.length > 0 && (
						<div style={{ padding: 8, border: '1px solid #ddd' }}>
							<strong>입력 오류</strong>
							<ul style={{ margin: 8 }}>
								{errors.map((e, i) => (
									<li key={i}>{e}</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className='modal_footer'>
					<button onClick={onSubmit} disabled={!canSubmit}>
						업로드
					</button>
				</div>
			</div>
		</div>
	);
}
