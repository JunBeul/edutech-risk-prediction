import { useState } from 'react';
import UploadModal from '../components/upload/UploadModal';
import { DUMMY_CSV_URL } from '../shared/api';
import '../styles/landing.scss';

export default function LandingPage() {
	const [open, setOpen] = useState(false);

	const onDownloadDummy = async () => {
		try {
			const response = await fetch(DUMMY_CSV_URL);
			if (!response.ok) throw new Error('dummy file download failed');

			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = 'dummy_midterm_like_labeled.csv';
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(objectUrl);
		} catch {
			window.open(DUMMY_CSV_URL, '_blank', 'noopener,noreferrer');
		}
	};

	return (
		<div className='landing_page'>
			<section className='landing_hero'>
				<h1>최성보 신호등</h1>
				<h2>최소학력보장 지원 위험 예측 AI</h2>
				<p>
					학기 중간 시점의 학습/행동 데이터를 바탕으로
					<br />
					최소학력보장 지원 위험 학생을 조기에 식별하는 EduTech 프로젝트입니다.
				</p>
				<div className='landing_actions'>
					<button className='landing_btn landing_btn_primary' onClick={() => setOpen(true)}>
						파일 업로드
					</button>
					<button className='landing_btn landing_btn_secondary' onClick={onDownloadDummy}>
						더미 파일 다운로드
					</button>
				</div>
			</section>

			<section className='landing_section'>
				<h2>프로젝트 설명</h2>
				<ul>
					<li>학생별 위험 확률(`risk_proba`)과 위험 등급(`risk_level`)을 제공합니다.</li>
					<li>위험 진단 근거(`top_reasons`)와 권장 조치(`action`)를 함께 확인할 수 있습니다.</li>
					<li>교사 평가 기준(반영 비율, 총 수업 횟수, 임계값)을 입력해 학교 상황에 맞게 분석할 수 있습니다.</li>
				</ul>
			</section>

			<section className='landing_section'>
				<h2>사용 방법</h2>
				<ol>
					<li>
						<strong>CSV 파일 준비:</strong> 학생 학습 데이터 CSV를 준비합니다. 테스트는 `data/dummy` 예시 파일로 시작할 수 있습니다.
					</li>
					<li>
						<strong>파일 업로드 및 기준 입력:</strong> 업로드 모달에서 파일 선택 후 임계값, 만점, 반영 비율, 총 수업 횟수를 입력합니다.
					</li>
					<li>
						<strong>결과 확인:</strong> 대시보드에서 위험 학생 목록, 주요 사유, 추가 결석 가능 횟수 등을 확인하고 보고서를 내려받습니다.
					</li>
				</ol>
			</section>

			<section className='landing_section'>
				<h2>권장 입력 기준</h2>
				<p>중간/기말/수행 반영 비율의 합은 반드시 100이어야 하며, 임계값(`threshold`)은 보통 `0.4`부터 시작해 교육청 정책에 맞춰 조정하는 것을 권장합니다.</p>
			</section>

			{open && <UploadModal onClose={() => setOpen(false)} onSuccessNavigateTo='/dashboard' />}
		</div>
	);
}
