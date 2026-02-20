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
const cloneRect = (rect: DOMRect) => new DOMRect(rect.x, rect.y, rect.width, rect.height);

const findHeaderCell = (column: string): HTMLElement | null => {
	const overlayHeaders = document.querySelectorAll<HTMLElement>('.dashboard_table_head_overlay th[data-col-key]');
	const overlayMatch = Array.from(overlayHeaders).find((el) => el.dataset.colKey === column);
	if (overlayMatch) return overlayMatch;

	const baseHeaders = document.querySelectorAll<HTMLElement>('.table_wrapper .dashboard_table thead th[data-col-key]');
	return Array.from(baseHeaders).find((el) => el.dataset.colKey === column) ?? null;
};

const getScrollContainers = (anchor: HTMLElement): HTMLElement[] => {
	const containers: HTMLElement[] = [];
	let node: HTMLElement | null = anchor.parentElement;

	while (node) {
		const style = window.getComputedStyle(node);
		const overflowValue = `${style.overflow}${style.overflowX}${style.overflowY}`;
		if (/(auto|scroll|overlay)/.test(overflowValue)) {
			containers.push(node);
		}
		node = node.parentElement;
	}

	return containers;
};

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
		let currentAnchor = anchorEl;
		const scrollContainers = new Set<HTMLElement>([...getScrollContainers(anchorEl)]);
		const tableScrollEl = document.querySelector<HTMLElement>('.table_scroll_x');
		if (tableScrollEl) {
			scrollContainers.add(tableScrollEl);
		}

		const updateAnchorRect = () => {
			if (rafId) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = 0;
				const resolvedAnchor = findHeaderCell(activeCol) ?? currentAnchor;
				if (!resolvedAnchor || !document.body.contains(resolvedAnchor)) {
					setActiveCol(null);
					setAnchorEl(null);
					setAnchorRect(null);
					return;
				}

				currentAnchor = resolvedAnchor;
				if (resolvedAnchor !== anchorEl) {
					setAnchorEl(resolvedAnchor);
				}
				setAnchorRect(cloneRect(resolvedAnchor.getBoundingClientRect()));
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
		scrollContainers.forEach((container) => container.addEventListener('scroll', handleViewportChange, { passive: true }));
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
			scrollContainers.forEach((container) => container.removeEventListener('scroll', handleViewportChange));
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
		setAnchorRect(cloneRect(target.getBoundingClientRect()));
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
