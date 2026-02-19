import { useEffect, useRef, useState } from 'react';

export type FixedHeaderState = {
	top: number;
	left: number;
	viewportWidth: number;
	tableWidth: number;
	colWidths: number[];
};

const MOBILE_BREAKPOINT = 768;

export function useFixedTableHeader(visibleColumnsKey: string, rowCount: number) {
	const [fixedHeader, setFixedHeader] = useState<FixedHeaderState | null>(null);
	const tableScrollRef = useRef<HTMLDivElement | null>(null);
	const tableRef = useRef<HTMLTableElement | null>(null);
	const overlayTableRef = useRef<HTMLTableElement | null>(null);

	useEffect(() => {
		let rafId = 0;

		const nearlyEqual = (a: number, b: number) => Math.abs(a - b) < 0.5;
		const sameWidths = (a: number[], b: number[]) => {
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i += 1) {
				if (!nearlyEqual(a[i], b[i])) return false;
			}
			return true;
		};

		const updateFixedHeader = () => {
			rafId = 0;
			const tableScrollEl = tableScrollRef.current;
			const tableEl = tableRef.current;
			if (!tableScrollEl || !tableEl) {
				setFixedHeader(null);
				return;
			}

			const headRow = tableEl.tHead?.rows[0];
			const bodyEl = tableEl.tBodies[0];
			if (!headRow || !bodyEl) {
				setFixedHeader(null);
				return;
			}

			const headerEl = document.querySelector<HTMLElement>('.dashboard_header');
			const topOffset = Math.round(headerEl?.getBoundingClientRect().height ?? (window.innerWidth <= MOBILE_BREAKPOINT ? 40 : 60));

			const tableRect = tableEl.getBoundingClientRect();
			const tbodyRect = bodyEl.getBoundingClientRect();
			const scrollRect = tableScrollEl.getBoundingClientRect();
			const headHeight = headRow.getBoundingClientRect().height;

			const shouldFix = tableRect.top <= topOffset && tbodyRect.bottom > topOffset + headHeight;
			if (!shouldFix) {
				setFixedHeader((prev) => (prev ? null : prev));
				return;
			}

			if (overlayTableRef.current) {
				overlayTableRef.current.style.transform = `translate3d(-${tableScrollEl.scrollLeft}px, 0, 0)`;
			}

			const colWidths = Array.from(headRow.cells).map((cell) => cell.getBoundingClientRect().width);
			const next: FixedHeaderState = {
				top: topOffset,
				left: scrollRect.left,
				viewportWidth: scrollRect.width,
				tableWidth: tableRect.width,
				colWidths
			};

			setFixedHeader((prev) => {
				if (!prev) return next;
				if (!nearlyEqual(prev.top, next.top)) return next;
				if (!nearlyEqual(prev.left, next.left)) return next;
				if (!nearlyEqual(prev.viewportWidth, next.viewportWidth)) return next;
				if (!nearlyEqual(prev.tableWidth, next.tableWidth)) return next;
				if (!sameWidths(prev.colWidths, next.colWidths)) return next;
				return prev;
			});
		};

		const requestUpdate = () => {
			if (rafId) return;
			rafId = window.requestAnimationFrame(updateFixedHeader);
		};

		const tableScrollEl = tableScrollRef.current;
		const headerEl = document.querySelector<HTMLElement>('.dashboard_header');

		window.addEventListener('scroll', requestUpdate, { passive: true, capture: true });
		window.addEventListener('resize', requestUpdate, { passive: true });
		tableScrollEl?.addEventListener('scroll', requestUpdate, { passive: true });
		headerEl?.addEventListener('transitionend', requestUpdate);
		requestUpdate();

		return () => {
			if (rafId) {
				window.cancelAnimationFrame(rafId);
			}
			window.removeEventListener('scroll', requestUpdate, true);
			window.removeEventListener('resize', requestUpdate);
			tableScrollEl?.removeEventListener('scroll', requestUpdate);
			headerEl?.removeEventListener('transitionend', requestUpdate);
		};
	}, [visibleColumnsKey, rowCount]);

	useEffect(() => {
		if (!fixedHeader || !overlayTableRef.current || !tableScrollRef.current) return;
		overlayTableRef.current.style.transform = `translate3d(-${tableScrollRef.current.scrollLeft}px, 0, 0)`;
	}, [fixedHeader]);

	return {
		fixedHeader,
		tableScrollRef,
		tableRef,
		overlayTableRef
	};
}
