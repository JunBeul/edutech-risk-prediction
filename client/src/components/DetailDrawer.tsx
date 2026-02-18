type Props = {
	row: Record<string, unknown>;
	onClose: () => void;
};

export default function DetailDrawer({ row, onClose }: Props) {
	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				right: 0,
				height: '100%',
				width: 'min(420px, 100vw)',
				background: 'white',
				boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
				padding: 16,
				overflowY: 'auto',
				zIndex: 1000
			}}
		>
			<header style={{ display: 'flex', justifyContent: 'space-between' }}>
				<h3>학생 상세 정보</h3>
				<button onClick={onClose}>닫기</button>
			</header>

			<section style={{ marginTop: 12 }}>
				{Object.entries(row).map(([key, value]) => (
					<div key={key} style={{ marginBottom: 8 }}>
						<strong>{key}</strong>
						<div>{String(value ?? '')}</div>
					</div>
				))}
			</section>
		</div>
	);
}
