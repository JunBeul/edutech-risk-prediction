import { useId, useRef } from 'react';
import { labelOf } from '../../shared/columnLabels';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useModalFocusManager } from '../../hooks/useModalFocusManager';
import OverlayHeader from '../common/OverlayHeader';
import '../../styles/modal.scss';

type Props = {
	allColumns: string[];
	visibleColumns: string[];
	onChange: (cols: string[]) => void;
	onClose: () => void;
};

export default function ColumnSelectorModal({ allColumns, visibleColumns, onChange, onClose }: Props) {
	const titleId = useId();
	const modalRef = useRef<HTMLDivElement | null>(null);
	const firstCheckboxRef = useRef<HTMLInputElement | null>(null);

	useEscapeClose(onClose);
	useModalFocusManager({
		containerRef: modalRef,
		initialFocusRef: firstCheckboxRef
	});

	const toggle = (col: string) => {
		if (visibleColumns.includes(col)) {
			onChange(visibleColumns.filter((c) => c !== col));
			return;
		}

		onChange([...visibleColumns, col]);
	};

	return (
		<div className='modal_wapper' onClick={onClose}>
			<div
				ref={modalRef}
				className='modal_container'
				onClick={(e) => e.stopPropagation()}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<OverlayHeader title='컬럼 선택' titleId={titleId} onClose={onClose} className='modal_header' />
				<div className='modal_body'>
					{allColumns.map((col, index) => (
						<label key={col} className='modal_list_item'>
							<input ref={index === 0 ? firstCheckboxRef : undefined} type='checkbox' checked={visibleColumns.includes(col)} onChange={() => toggle(col)} />
							{labelOf(col)}
						</label>
					))}
				</div>
			</div>
		</div>
	);
}
