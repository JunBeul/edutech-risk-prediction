import { labelOf } from '../../shared/columnLabels';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import OverlayHeader from '../common/OverlayHeader';
import '../../styles/modal.scss';

type Props = {
	allColumns: string[];
	visibleColumns: string[];
	onChange: (cols: string[]) => void;
	onClose: () => void;
};

export default function ColumnSelectorModal({ allColumns, visibleColumns, onChange, onClose }: Props) {
	useEscapeClose(onClose);

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
				<OverlayHeader title='컬럼 선택' onClose={onClose} className='modal_header' />
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

