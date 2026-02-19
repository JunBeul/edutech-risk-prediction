import { useCallback, useEffect, useMemo, useState } from 'react';

type SortDir = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir } | null;

type UseTableFilterPopoverResult = {
	filteredRows: Record<string, unknown>[];
	activeValues: string[];
	activeCol: string | null;
	anchorRect: DOMRect | null;
	hiddenValuesForActiveCol: Set<string>;
	openFilter: (column: string, target: HTMLElement) => void;
	closeFilter: () => void;
	toggleActiveValue: (value: string) => void;
	sortActiveColumn: (dir: SortDir) => void;
	hideActiveColumn: (onHide: (column: string) => void) => void;
};

const EMPTY_HIDDEN_SET = new Set<string>();
const asText = (row: Record<string, unknown>, key: string) => String(row[key] ?? '');

export function useTableFilterPopover(sourceData: Record<string, unknown>[]): UseTableFilterPopoverResult {
	const [activeCol, setActiveCol] = useState<string | null>(null);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
	const [hiddenMap, setHiddenMap] = useState<Record<string, Set<string>>>({});
	const [sortState, setSortState] = useState<SortState>(null);

	const filteredRows = useMemo(() => {
		let rows = [...sourceData];

		rows = rows.filter((row) => {
			for (const [col, hiddenSet] of Object.entries(hiddenMap)) {
				const value = asText(row, col);
				if (hiddenSet?.has(value)) return false;
			}
			return true;
		});

		if (sortState) {
			const { key, dir } = sortState;
			rows.sort((a, b) => {
				const av = asText(a, key);
				const bv = asText(b, key);
				if (av === bv) return 0;
				return dir === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
			});
		}

		return rows;
	}, [sourceData, hiddenMap, sortState]);

	const activeValues = useMemo(() => {
		if (!activeCol) return [];
		const values = new Set<string>();
		for (const row of sourceData) {
			values.add(asText(row, activeCol));
		}
		return Array.from(values).sort();
	}, [activeCol, sourceData]);

	const hiddenValuesForActiveCol = useMemo(() => {
		if (!activeCol) return EMPTY_HIDDEN_SET;
		return hiddenMap[activeCol] ?? EMPTY_HIDDEN_SET;
	}, [activeCol, hiddenMap]);

	useEffect(() => {
		if (!anchorEl || !activeCol) return;

		let rafId = 0;
		let settleTimer = 0;
		const updateAnchorRect = () => {
			if (rafId) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = 0;
				if (!document.body.contains(anchorEl)) {
					setActiveCol(null);
					setAnchorEl(null);
					setAnchorRect(null);
					return;
				}
				setAnchorRect(anchorEl.getBoundingClientRect());
			});
		};

		const updateAfterHeaderTransition = () => {
			if (settleTimer) {
				window.clearTimeout(settleTimer);
			}
			settleTimer = window.setTimeout(() => {
				updateAnchorRect();
			}, 240);
		};

		const handleViewportChange = () => {
			updateAnchorRect();
			updateAfterHeaderTransition();
		};

		const headerEl = document.querySelector<HTMLElement>('.dashboard_header');
		updateAnchorRect();
		window.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });
		window.addEventListener('resize', handleViewportChange, { passive: true });
		headerEl?.addEventListener('transitionend', handleViewportChange);

		return () => {
			if (rafId) {
				window.cancelAnimationFrame(rafId);
			}
			if (settleTimer) {
				window.clearTimeout(settleTimer);
			}
			window.removeEventListener('scroll', handleViewportChange, true);
			window.removeEventListener('resize', handleViewportChange);
			headerEl?.removeEventListener('transitionend', handleViewportChange);
		};
	}, [anchorEl, activeCol]);

	const closeFilter = useCallback(() => {
		setActiveCol(null);
		setAnchorEl(null);
		setAnchorRect(null);
	}, []);

	const openFilter = useCallback((column: string, target: HTMLElement) => {
		setActiveCol(column);
		setAnchorEl(target);
		setAnchorRect(target.getBoundingClientRect());
	}, []);

	const toggleActiveValue = useCallback(
		(value: string) => {
			if (!activeCol) return;
			setHiddenMap((prev) => {
				const next = { ...prev };
				const nextSet = new Set(next[activeCol] ?? []);
				if (nextSet.has(value)) nextSet.delete(value);
				else nextSet.add(value);
				next[activeCol] = nextSet;
				return next;
			});
		},
		[activeCol]
	);

	const sortActiveColumn = useCallback(
		(dir: SortDir) => {
			if (!activeCol) return;
			setSortState({ key: activeCol, dir });
		},
		[activeCol]
	);

	const hideActiveColumn = useCallback(
		(onHide: (column: string) => void) => {
			if (!activeCol) return;
			onHide(activeCol);
			closeFilter();
		},
		[activeCol, closeFilter]
	);

	return {
		filteredRows,
		activeValues,
		activeCol,
		anchorRect,
		hiddenValuesForActiveCol,
		openFilter,
		closeFilter,
		toggleActiveValue,
		sortActiveColumn,
		hideActiveColumn
	};
}
