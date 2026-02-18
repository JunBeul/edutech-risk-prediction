import { useEscapeClose } from '../../hooks/useEscapeClose';
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
			<div className='drawer_header'>
				<h3 className='drawer_title'>{studentId} 학생 상세정보</h3>
				<button onClick={onClose}>닫기</button>
			</div>

			<div className='drawer_body'>
				{Object.entries(row).map(([key, value]) => (
					<div key={key} style={{ marginBottom: 8 }}>
						<div>
							<strong>{key}</strong>
						</div>
						<div>{String(value ?? '')}</div>
					</div>
				))}
			</div>
		</div>
	);
}
