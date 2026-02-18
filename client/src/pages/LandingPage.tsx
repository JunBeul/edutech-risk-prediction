import { useState } from 'react';
import UploadModal from '../components/upload/UploadModal';

export default function LandingPage() {
	const [open, setOpen] = useState(false);

	return (
		<div>
			<h1>최소성취수준(최성보) 위험군 예측</h1>
			<p>CSV 업로드 후 위험군 결과를 대시보드에서 확인하십시오.</p>

			<button onClick={() => setOpen(true)}>파일 업로드</button>

			{open && <UploadModal onClose={() => setOpen(false)} onSuccessNavigateTo='/dashboard' />}
		</div>
	);
}
