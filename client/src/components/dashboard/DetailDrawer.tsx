import { useEscapeClose } from '../../hooks/useEscapeClose';
import { labelOf } from '../../shared/columnLabels';
import OverlayHeader from '../common/OverlayHeader';
import '../../styles/detailDrawer.scss';

type Props = {
	row: Record<string, unknown>;
	onClose: () => void;
};

export default function DetailDrawer({ row, onClose }: Props) {
	const studentId = String(row.student_id ?? '');

	useEscapeClose(onClose);

	return (
		<div className='drawer_container'>
			<OverlayHeader title={studentId + ' 학생 상세정보'} onClose={onClose} className='drawer_header' />
			<div className='drawer_body'>
				{Object.entries(row).map(([key, value]) => (
					<div key={key} style={{ marginBottom: 8 }} className={`drawer_row ${'row_' + key}`}>
						<div className='key'>{labelOf(key)}</div>
						<div className='value'>{String(value ?? '')}</div>
					</div>
				))}
			</div>
		</div>
	);
}

