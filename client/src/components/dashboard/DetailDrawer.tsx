import { useId, useRef } from 'react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useModalFocusManager } from '../../hooks/useModalFocusManager';
import { labelOf } from '../../shared/columnLabels';
import OverlayHeader from '../common/OverlayHeader';
import '../../styles/detailDrawer.scss';

type Props = {
	row: Record<string, unknown>;
	onClose: () => void;
};

export default function DetailDrawer({ row, onClose }: Props) {
	const studentId = String(row.student_id ?? '');
	const titleId = useId();
	const drawerRef = useRef<HTMLDivElement | null>(null);

	useEscapeClose(onClose);
	useModalFocusManager({
		containerRef: drawerRef
	});

	return (
		<div className='drawer_wapper' onClick={onClose}>
			<div
				ref={drawerRef}
				className='drawer_container'
				onClick={(e) => e.stopPropagation()}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<OverlayHeader title={studentId + ' 학생 정보'} titleId={titleId} onClose={onClose} className='drawer_header' />
				<div className='drawer_body'>
					{Object.entries(row).map(([key, value]) => (
						<div key={key} style={{ marginBottom: 8 }} className={`drawer_row ${'row_' + key}`}>
							<div className='key'>{labelOf(key)}</div>
							<div className='value'>{String(value ?? '')}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
