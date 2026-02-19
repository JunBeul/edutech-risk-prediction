import type { RefObject } from 'react';
import { labelOf } from '../../shared/columnLabels';
import RiskBadge from './RiskBadge';
import type { FixedHeaderState } from '../../hooks/useFixedTableHeader';

type Props = {
	visibleColumns: string[];
	rows: Record<string, unknown>[];
	fixedHeader: FixedHeaderState | null;
	tableScrollRef: RefObject<HTMLDivElement | null>;
	tableRef: RefObject<HTMLTableElement | null>;
	overlayTableRef: RefObject<HTMLTableElement | null>;
	onHeaderClick: (column: string, target: HTMLElement) => void;
	onRowClick: (row: Record<string, unknown>) => void;
};

const getCellContent = (column: string, value: unknown) => {
	if (column === 'risk_level') {
		return <RiskBadge level={String(value)} />;
	}

	if (column === 'risk_proba') {
		return `${(Number(value) * 100).toFixed(1)}%`;
	}

	return String(value ?? '');
};

export default function DashboardTable({ visibleColumns, rows, fixedHeader, tableScrollRef, tableRef, overlayTableRef, onHeaderClick, onRowClick }: Props) {
	return (
		<>
			<div className='table_wrapper'>
				<div className='table_scroll_x' ref={tableScrollRef}>
					<table className='dashboard_table' ref={tableRef}>
						<thead>
							<tr>
								{visibleColumns.map((column) => (
									<th
										key={column}
										onClick={(e) => onHeaderClick(column, e.currentTarget as HTMLElement)}
										style={{ cursor: 'pointer' }}
									>
										{labelOf(column)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row, rowIndex) => (
								<tr key={rowIndex} onClick={() => onRowClick(row)} style={{ cursor: 'pointer' }}>
									{visibleColumns.map((column) => (
										<td key={column}>{getCellContent(column, row[column])}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{fixedHeader && (
				<div
					className='dashboard_table_head_overlay'
					style={{
						top: fixedHeader.top,
						left: fixedHeader.left,
						width: fixedHeader.viewportWidth
					}}
				>
					<table
						className='dashboard_table dashboard_table_overlay'
						ref={overlayTableRef}
						style={{
							width: fixedHeader.tableWidth,
							minWidth: fixedHeader.tableWidth
						}}
					>
						<thead>
							<tr>
								{visibleColumns.map((column, index) => {
									const width = fixedHeader.colWidths[index];
									return (
										<th
											key={`overlay_${column}`}
											onClick={(e) => onHeaderClick(column, e.currentTarget as HTMLElement)}
											style={{
												cursor: 'pointer',
												width,
												minWidth: width,
												maxWidth: width
											}}
										>
											{labelOf(column)}
										</th>
									);
								})}
							</tr>
						</thead>
					</table>
				</div>
			)}
		</>
	);
}
