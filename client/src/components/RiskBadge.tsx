type Props = {
	level: string;
};

export default function RiskBadge({ level }: Props) {
	const colorMap: Record<string, string> = {
		High: '#ef4444',
		Medium: '#f59e0b',
		Low: '#22c55e'
	};

	return (
		<span
			style={{
				background: colorMap[level] ?? '#ccc',
				color: 'white',
				padding: '2px 8px',
				borderRadius: 6,
				fontSize: 12,
				fontWeight: 600
			}}
		>
			{level}
		</span>
	);
}
