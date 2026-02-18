import { API_BASE_URL } from '../../shared/api';

type Props = {
	onOpenUpload: () => void;
	onOpenColumns: () => void;
	reportUrl: string;
};

export default function DashboardHeader({ onOpenUpload, onOpenColumns, reportUrl }: Props) {
	return (
		<header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
			<h2 style={{ marginRight: 'auto' }}>대시보드</h2>

			<button onClick={onOpenUpload}>파일 업로드</button>
			<button onClick={onOpenColumns}>+ 컬럼</button>

			<a href={`${API_BASE_URL}${reportUrl}`} download>
				CSV 다운로드
			</a>
		</header>
	);
}
