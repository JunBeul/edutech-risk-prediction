import { useEffect } from 'react';
import { labelOf } from '../shared/columnLabels';
import '../styles/modal.scss';

type Props = {
	allColumns: string[];
	visibleColumns: string[];
	onChange: (cols: string[]) => void;
	onClose: () => void;
};

export default function ColumnSelectorModal({ allColumns, visibleColumns, onChange, onClose }: Props) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const toggle = (col: string) => {
		if (visibleColumns.includes(col)) {
			onChange(visibleColumns.filter((c) => c !== col));
			return;
		}

		onChange([...visibleColumns, col]);
	};

	return (
		<div className='modal_wapper' onClick={onClose}>
			<div className='modal_container' onClick={(e) => e.stopPropagation()}>
				<div className='modal_header'>
					<h3>컬럼 선택</h3>
					<button onClick={onClose}>닫기</button>
				</div>
				<div className='modal_body'>
					{allColumns.map((col) => (
						<label key={col} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<input type='checkbox' checked={visibleColumns.includes(col)} onChange={() => toggle(col)} />
							{labelOf(col)}
						</label>
					))}
				</div>
			</div>
		</div>
	);
}
