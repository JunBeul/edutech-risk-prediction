import { API_BASE_URL } from '../../shared/api';
import '../../styles/floatingNav.scss';

type Props = {
	onOpenUpload: () => void;
	onOpenColumns: () => void;
	reportUrl: string;
};

export default function MobileFloatingNav({ onOpenUpload, onOpenColumns, reportUrl }: Props) {
	const handleDownload = () => {
		const link = document.createElement('a');
		link.href = `${API_BASE_URL}${reportUrl}`;
		link.setAttribute('download', '');
		document.body.appendChild(link);
		link.click();
		link.remove();
	};

	return (
		<nav className='floating_nav'>
			<button className='floating_btn' onClick={onOpenUpload}>
				Upload
			</button>
			<button className='floating_btn' onClick={onOpenColumns}>
				Columns
			</button>
			<button className='floating_btn' onClick={handleDownload}>
				Download CSV
			</button>
		</nav>
	);
}
