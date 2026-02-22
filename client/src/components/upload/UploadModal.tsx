import { type SubmitEvent, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictCsv } from '../../shared/api';
import type { EvaluationPolicy } from '../../shared/types';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useModalFocusManager } from '../../hooks/useModalFocusManager';
import OverlayHeader from '../common/OverlayHeader';
import LoadingOverlay from '../common/LoadingOverlay';

import '../../styles/modal.scss';

type Props = {
	onClose: () => void;
	onSuccessNavigateTo: string;
};

type UploadFormState = {
	threshold: string;
	midterm_max: string;
	midterm_weight: string;
	final_max: string;
	final_weight: string;
	performance_max: string;
	performance_weight: string;
	total_classes: string;
};

type UploadFormKey = keyof UploadFormState;
type UploadFieldErrors = Record<UploadFormKey, boolean>;

type UploadValidationResult = {
	errors: string[];
	fieldErrors: UploadFieldErrors;
};

const INITIAL_FORM: UploadFormState = {
	threshold: '0.4',
	midterm_max: '100',
	midterm_weight: '40',
	final_max: '100',
	final_weight: '40',
	performance_max: '100',
	performance_weight: '20',
	total_classes: '160'
};

function toNumber(v: string): number {
	// 빈 문자열/공백은 Number 변환 결과에 맡기고, 검증 단계에서 에러 처리합니다.
	return Number(v);
}

function createEmptyFieldErrors(): UploadFieldErrors {
	return {
		threshold: false,
		midterm_max: false,
		midterm_weight: false,
		final_max: false,
		final_weight: false,
		performance_max: false,
		performance_weight: false,
		total_classes: false
	};
}

function validateUploadForm(form: UploadFormState, policy: EvaluationPolicy | null): UploadValidationResult {
	const fieldErrors = createEmptyFieldErrors();
	const errors: string[] = [];

	if (!policy) {
		(Object.keys(form) as UploadFormKey[]).forEach((key) => {
			if (Number.isNaN(toNumber(form[key]))) {
				fieldErrors[key] = true;
			}
		});
		errors.push('입력값을 숫자로 채우십시오.');
		return { errors, fieldErrors };
	}

	if (policy.threshold <= 0 || policy.threshold >= 1) {
		fieldErrors.threshold = true;
		errors.push('threshold는 0~1 사이(예: 0.4)여야 합니다.');
	}
	if (policy.midterm_max <= 0) {
		fieldErrors.midterm_max = true;
		errors.push('중간고사 만점은 1 이상이어야 합니다.');
	}
	if (policy.final_max <= 0) {
		fieldErrors.final_max = true;
		errors.push('기말고사 만점은 1 이상이어야 합니다.');
	}
	if (policy.performance_max <= 0) {
		fieldErrors.performance_max = true;
		errors.push('수행평가 만점은 1 이상이어야 합니다.');
	}
	if (policy.total_classes <= 0) {
		fieldErrors.total_classes = true;
		errors.push('총 수업 횟수는 1 이상이어야 합니다.');
	}

	const wSum = policy.midterm_weight + policy.final_weight + policy.performance_weight;
	if (wSum !== 100) {
		fieldErrors.midterm_weight = true;
		fieldErrors.final_weight = true;
		fieldErrors.performance_weight = true;
		errors.push(`반영비율 합이 100이어야 합니다. (현재: ${wSum})`);
	}

	if (policy.midterm_weight < 0 || policy.final_weight < 0 || policy.performance_weight < 0) {
		if (policy.midterm_weight < 0) fieldErrors.midterm_weight = true;
		if (policy.final_weight < 0) fieldErrors.final_weight = true;
		if (policy.performance_weight < 0) fieldErrors.performance_weight = true;
		errors.push('반영비율은 음수가 될 수 없습니다.');
	}

	return { errors, fieldErrors };
}

export default function UploadModal({ onClose, onSuccessNavigateTo }: Props) {
	const navigate = useNavigate();
	const titleId = useId();
	const modalRef = useRef<HTMLDivElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleClose = () => {
		if (isSubmitting) return;
		onClose();
	};

	useEscapeClose(handleClose);
	useModalFocusManager({
		containerRef: modalRef,
		initialFocusRef: fileInputRef
	});

	// 입력은 string으로 들고 있다가, 제출 시 number 변환(HTML input 특성 대응)
	const [form, setForm] = useState<UploadFormState>(INITIAL_FORM);

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

		const values = Object.values(p);
		if (values.some((x) => Number.isNaN(x))) return null;

		return p;
	}, [form]);

	const { errors, fieldErrors } = useMemo(() => validateUploadForm(form, policy), [form, policy]);

	const canSubmit = !!file && !!policy && errors.length === 0 && !isSubmitting;

	const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!canSubmit || !policy || !file) return;

		setSubmitError(null);
		setIsSubmitting(true);
		try {
			const result = await predictCsv({
				file,
				policyObj: policy,
				mode: 'full'
			});

			onClose();
			navigate(onSuccessNavigateTo, { state: { result } });
		} catch (err) {
			if (err instanceof Error && err.message) {
				setSubmitError(err.message);
			} else {
				setSubmitError('업로드 처리 중 오류가 발생했습니다.');
			}
			setIsSubmitting(false);
		}
	};

	const setField = (key: UploadFormKey, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const getFieldInputClassName = (key: UploadFormKey) => `modal_text_input${fieldErrors[key] ? ' is-error' : ''}`;
	const getFieldAriaInvalid = (key: UploadFormKey) => (fieldErrors[key] ? true : undefined);

	return (
		<div className='modal_wapper' onClick={handleClose}>
			<div
				ref={modalRef}
				className='modal_container'
				onClick={(e) => e.stopPropagation()}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				aria-busy={isSubmitting || undefined}
				tabIndex={-1}
			>
				<OverlayHeader title='파일 업로드' titleId={titleId} onClose={handleClose} className='modal_header' />

				<form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
					<div className='modal_body'>
						<input ref={fileInputRef} className='modal_file_input' type='file' accept='.csv' disabled={isSubmitting} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

						<div className='modal_grid_item'>
							<label>
								<span className='title'>최성보 비율</span>
								<input
									className={getFieldInputClassName('threshold')}
									aria-invalid={getFieldAriaInvalid('threshold')}
									value={form.threshold}
									disabled={isSubmitting}
									onChange={(e) => setField('threshold', e.target.value)}
									inputMode='decimal'
								/>
							</label>

							<label>
								<span className='title'>총 수업 횟수</span>
								<input
									className={getFieldInputClassName('total_classes')}
									aria-invalid={getFieldAriaInvalid('total_classes')}
									value={form.total_classes}
									disabled={isSubmitting}
									onChange={(e) => setField('total_classes', e.target.value)}
									inputMode='numeric'
								/>
							</label>

							<label>
								<span className='title'>중간 만점</span>
								<input
									className={getFieldInputClassName('midterm_max')}
									aria-invalid={getFieldAriaInvalid('midterm_max')}
									value={form.midterm_max}
									disabled={isSubmitting}
									onChange={(e) => setField('midterm_max', e.target.value)}
									inputMode='numeric'
								/>
							</label>

							<label>
								<span className='title'>중간 반영(%)</span>
								<input
									className={getFieldInputClassName('midterm_weight')}
									aria-invalid={getFieldAriaInvalid('midterm_weight')}
									value={form.midterm_weight}
									disabled={isSubmitting}
									onChange={(e) => setField('midterm_weight', e.target.value)}
									inputMode='numeric'
								/>
							</label>

							<label>
								<span className='title'>기말 만점</span>
								<input
									className={getFieldInputClassName('final_max')}
									aria-invalid={getFieldAriaInvalid('final_max')}
									value={form.final_max}
									disabled={isSubmitting}
									onChange={(e) => setField('final_max', e.target.value)}
									inputMode='numeric'
								/>
							</label>

							<label>
								<span className='title'>기말 반영(%)</span>
								<input
									className={getFieldInputClassName('final_weight')}
									aria-invalid={getFieldAriaInvalid('final_weight')}
									value={form.final_weight}
									disabled={isSubmitting}
									onChange={(e) => setField('final_weight', e.target.value)}
									inputMode='numeric'
								/>
							</label>

							<label>
								<span className='title'>수행 만점</span>
								<input
									className={getFieldInputClassName('performance_max')}
									aria-invalid={getFieldAriaInvalid('performance_max')}
									value={form.performance_max}
									disabled={isSubmitting}
									onChange={(e) => setField('performance_max', e.target.value)}
									inputMode='numeric'
								/>
							</label>

							<label>
								<span className='title'>수행 반영(%)</span>
								<input
									className={getFieldInputClassName('performance_weight')}
									aria-invalid={getFieldAriaInvalid('performance_weight')}
									value={form.performance_weight}
									disabled={isSubmitting}
									onChange={(e) => setField('performance_weight', e.target.value)}
									inputMode='numeric'
								/>
							</label>
						</div>
					</div>

					{errors.length > 0 && (
						<div className='modal_errors'>
							<div className='modal_errors_title'>입력 오류</div>
							<ul style={{ margin: 8 }}>
								{errors.map((e, i) => (
									<li key={i}>{e}</li>
								))}
							</ul>
						</div>
					)}

					{submitError && (
						<div className='modal_errors'>
							<div className='modal_errors_title'>업로드 오류</div>
							<div style={{ margin: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{submitError}</div>
						</div>
					)}

					<div className='modal_footer'>
						<button type='submit' disabled={!canSubmit}>
							{isSubmitting ? '처리 중...' : '업로드'}
						</button>
					</div>
				</form>

				{isSubmitting && <LoadingOverlay message='예측 결과를 생성하는 중입니다...' ariaLabel='업로드 처리 중' />}
			</div>
		</div>
	);
}
