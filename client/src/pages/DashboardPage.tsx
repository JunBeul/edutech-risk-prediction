import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import ColumnSelectorModal from '../components/ColumnSelectorModal';
import DetailDrawer from '../components/DetailDrawer';

type PredictResponse = {
	rows: number;
	report_filename: string;
	report_url: string;
	data: Record<string, unknown>[];
};

type DashboardLocationState = {
	result?: PredictResponse;
};

const PRIORITY_COLUMNS = ['student_id', 'risk_proba', 'risk_level', 'top_reasons', 'action', 'score_guidance', 'remaining_absence_allowance'];

export default function DashboardPage() {
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const [colModalOpen, setColModalOpen] = useState(false);
	const [columnState, setColumnState] = useState<{ reportKey: string; cols: string[] }>({
		reportKey: '',
		cols: []
	});
	const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

	const result = (location.state as DashboardLocationState | null)?.result;

	const allColumns = useMemo(() => {
		if (!result) return [];
		return Object.keys(result.data[0] ?? {});
	}, [result]);

	const defaultCols = useMemo(() => {
		return PRIORITY_COLUMNS.filter((column) => allColumns.includes(column));
	}, [allColumns]);

	const reportKey = result?.report_filename ?? '';
	const visibleColumns = columnState.reportKey === reportKey ? columnState.cols : defaultCols;

	const handleColumnsChange = (cols: string[]) => {
		setColumnState({ reportKey, cols });
	};

	if (!result) {
		return <Navigate to='/' replace />;
	}

	return (
		<div>
			<header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
				<h2 style={{ marginRight: 'auto' }}>대시보드</h2>

				<button onClick={() => setOpen(true)}>파일 업로드</button>

				<a href={`http://127.0.0.1:8000${result.report_url}`} download>
					CSV 다운로드
				</a>

				<button onClick={() => setColModalOpen(true)}>+ 컬럼</button>
			</header>

			<section>
				<p>rows: {result.rows}</p>

				<table>
					<thead>
						<tr>
							{visibleColumns.map((column) => (
								<th key={column}>{column}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{result.data.map((row, i) => (
							<tr key={i} onClick={() => setSelectedRow(row)} style={{ cursor: 'pointer' }}>
								{visibleColumns.map((c) => (
									<td key={c}>{String((row as any)[c] ?? '')}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</section>

			{open && <UploadModal onClose={() => setOpen(false)} onSuccessNavigateTo='/dashboard' />}
			{colModalOpen && <ColumnSelectorModal allColumns={allColumns} visibleColumns={visibleColumns} onChange={handleColumnsChange} onClose={() => setColModalOpen(false)} />}
			{selectedRow && <DetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />}
		</div>
	);
}
