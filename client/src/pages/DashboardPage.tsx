import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFixedTableHeader } from '../hooks/useFixedTableHeader';
import { useTableFilterPopover } from '../hooks/useTableFilterPopover';
import UploadModal from '../components/upload/UploadModal';
import ColumnSelectorModal from '../components/dashboard/ColumnSelectorModal';
import DetailDrawer from '../components/dashboard/DetailDrawer';
import DashboardTable from '../components/dashboard/DashboardTable';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MobileFloatingNav from '../components/dashboard/MobileFloatingNav';
import FilterPopover from '../components/dashboard/FilterPopover';

import '../styles/table.scss';

type PredictResponse = {
	rows: number;
	report_filename: string;
	report_url: string;
	data: Record<string, unknown>[];
};

type DashboardLocationState = {
	result?: PredictResponse;
};

const PRIORITY_COLUMNS = ['student_id', 'risk_proba', 'risk_level', 'top_reasons', 'remaining_absence_allowance'];

export default function DashboardPage() {
	const location = useLocation();

	// 모달/드로어 열림 상태
	const [UploadModalOpen, setOpen] = useState(false);
	const [colModalOpen, setColModalOpen] = useState(false);

	// 보고서별로 "사용자가 마지막에 선택한 표시 컬럼"을 기억하기 위한 상태
	const [columnState, setColumnState] = useState<{ reportKey: string; cols: string[] }>({
		reportKey: '',
		cols: []
	});
	const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

	// 라우터 state로 전달된 예측 결과(대시보드 진입 데이터)
	// UploadModal -> navigate('/dashboard', { state: { result } })로 넘어온 값입니다.
	const result = (location.state as DashboardLocationState | null)?.result;
	// result 참조가 바뀔 때만 데이터 배열을 갱신
	const sourceData = useMemo(() => result?.data ?? [], [result]);
	// 필터 팝오버 관련 상태/핸들러(정렬, 값 숨김, 앵커 위치 계산)를 훅으로 분리
	const { filteredRows, activeValues, activeCol, anchorRect, hiddenValuesForActiveCol, openFilter, closeFilter, toggleActiveValue, sortActiveColumn, hideActiveColumn } =
		useTableFilterPopover(sourceData);

	// 원본 데이터의 첫 row를 기준으로 전체 컬럼 키를 추출
	const allColumns = useMemo(() => {
		return Object.keys(sourceData[0] ?? {});
	}, [sourceData]);

	// 우선순위 컬럼 중 실제 데이터에 존재하는 컬럼만 기본 표시 컬럼으로 사용
	const defaultCols = useMemo(() => {
		return PRIORITY_COLUMNS.filter((column) => allColumns.includes(column));
	}, [allColumns]);

	const reportKey = result?.report_filename ?? '';
	// 같은 report면 사용자가 고른 컬럼을 유지, report가 바뀌면 기본 컬럼으로 초기화
	const visibleColumns = columnState.reportKey === reportKey ? columnState.cols : defaultCols;
	// 고정 헤더 훅 의존성 비교를 단순화하기 위해 문자열 키로 변환
	const visibleColumnsKey = useMemo(() => visibleColumns.join('|'), [visibleColumns]);
	const isScrollLockOpen = UploadModalOpen || colModalOpen || !!selectedRow;
	// 스크롤 시 헤더를 fixed 오버레이로 동기화하는 훅
	const { fixedHeader, tableScrollRef, tableRef, overlayTableRef } = useFixedTableHeader(visibleColumnsKey, filteredRows.length);

	// 모달이 열리면 body 스크롤을 잠가 배경 스크롤을 방지
	useBodyScrollLock(isScrollLockOpen);

	const handleColumnsChange = (cols: string[]) => {
		setColumnState({ reportKey, cols });
	};

	// 직접 URL 진입 등으로 데이터가 없으면 홈으로 보냄
	// (현재 구조는 서버 재조회 없이 라우터 state를 사용하는 방식)
	if (!result) {
		return <Navigate to='/' replace />;
	}

	return (
		<div>
			{/* 상단 고정 헤더: 업로드/컬럼선택/다운로드 액션 */}
			{/* reportUrl은 백엔드 /api/predict 응답의 report_url 값 */}
			<DashboardHeader onOpenUpload={() => setOpen(true)} onOpenColumns={() => setColModalOpen(true)} reportUrl={result.report_url} />

			<section>
				<p style={{ margin: '6px 12px' }}>rows: {filteredRows.length}</p>
				{/* 본문 테이블 + fixed 헤더 오버레이 렌더링 */}
				<DashboardTable
					visibleColumns={visibleColumns}
					rows={filteredRows}
					fixedHeader={fixedHeader}
					tableScrollRef={tableScrollRef}
					tableRef={tableRef}
					overlayTableRef={overlayTableRef}
					onHeaderClick={openFilter}
					onRowClick={setSelectedRow}
				/>
			</section>
			{/* 모바일에서 하단 FAB 네비게이션 */}
			{/* 데스크톱 헤더와 동일하게 report_url 다운로드 액션을 제공 */}
			<MobileFloatingNav onOpenUpload={() => setOpen(true)} onOpenColumns={() => setColModalOpen(true)} reportUrl={result.report_url} />

			{/* 모달/드로어 계층 */}
			{/* 대시보드에서도 재업로드 가능: 새 예측 결과로 같은 /dashboard 라우트를 다시 갱신 */}
			{UploadModalOpen && <UploadModal onClose={() => setOpen(false)} onSuccessNavigateTo='/dashboard' />}
			{colModalOpen && <ColumnSelectorModal allColumns={allColumns} visibleColumns={visibleColumns} onChange={handleColumnsChange} onClose={() => setColModalOpen(false)} />}
			{selectedRow && <DetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />}

			{/* 컬럼 헤더 클릭 시 뜨는 필터 팝오버 */}
			{activeCol && anchorRect && (
				<FilterPopover
					colKey={activeCol}
					anchorRect={anchorRect}
					values={activeValues}
					hiddenValues={hiddenValuesForActiveCol}
					onToggleValue={toggleActiveValue}
					onSort={sortActiveColumn}
					onHideColumn={() => {
						// "컬럼 숨기기"는 현재 활성 컬럼을 visibleColumns에서 제거
						hideActiveColumn((column) => {
							setColumnState((prev) => {
								const currentCols = prev.reportKey === reportKey ? prev.cols : defaultCols;
								return { reportKey, cols: currentCols.filter((x) => x !== column) };
							});
						});
					}}
					onClose={closeFilter}
				/>
			)}
		</div>
	);
}
