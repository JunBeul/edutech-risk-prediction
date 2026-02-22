import { useId, useMemo, useRef } from 'react';
import { labelOf } from '../../shared/columnLabels';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useModalFocusManager } from '../../hooks/useModalFocusManager';

import '../../styles/filterPopover.scss';

type SortDir = 'asc' | 'desc';
const POPOVER_WIDTH = 260;
const VIEWPORT_PADDING = 8;

type Props = {
	colKey: string;
	anchorRect: DOMRect;
	values: string[];
	hiddenValues: Set<string>;
	onToggleValue: (v: string) => void;
	onSort: (dir: SortDir) => void;
	onHideColumn: () => void;
	onClose: () => void;
};

export default function FilterPopover({ colKey, anchorRect, values, hiddenValues, onToggleValue, onSort, onHideColumn, onClose }: Props) {
	const titleId = useId();
	const popoverRef = useRef<HTMLDivElement | null>(null);

	useEscapeClose(onClose);
	useModalFocusManager({
		containerRef: popoverRef
	});

	const style = useMemo(() => {
		const top = anchorRect.bottom + window.scrollY + 6;
		const rawLeft = anchorRect.left + window.scrollX;
		const minLeft = window.scrollX + VIEWPORT_PADDING;
		const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
		const scrollbarWidth = Math.max(0, window.innerWidth - viewportWidth);
		const maxLeft = window.scrollX + window.innerWidth - scrollbarWidth - POPOVER_WIDTH - VIEWPORT_PADDING;
		const safeMaxLeft = Math.max(minLeft, maxLeft);
		const left = Math.min(Math.max(rawLeft, minLeft), safeMaxLeft);
		return {
			position: 'absolute' as const,
			top,
			left
		};
	}, [anchorRect]);

	return (
		<div ref={popoverRef} className='filter_wapper' style={style} role='dialog' aria-labelledby={titleId} tabIndex={-1}>
			<div className='fillter_header'>
				<h4 id={titleId}>{labelOf(colKey)}</h4>
				<button onClick={onClose}>
					<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='currentColor'>
						<path d='M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708' />
					</svg>
				</button>
			</div>

			<div className='filter_srot'>
				<div className='filter_srot_header'>정렬</div>
				<div className='filter_srot_content'>
					<button onClick={() => onSort('asc')}>
						<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-sort-alpha-down-alt' viewBox='0 0 16 16'>
							<path d='M12.96 7H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645z' />
							<path fill-rule='evenodd' d='M10.082 12.629 9.664 14H8.598l1.789-5.332h1.234L13.402 14h-1.12l-.419-1.371zm1.57-.785L11 9.688h-.047l-.652 2.156z' />
							<path d='M4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293z' />
						</svg>
						<div className='btn_text'>오름차순</div>
					</button>
					<button onClick={() => onSort('desc')}>
						<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-sort-alpha-down' viewBox='0 0 16 16'>
							<path fill-rule='evenodd' d='M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371zm1.57-.785L11 2.687h-.047l-.652 2.157z' />
							<path d='M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293z' />
						</svg>
						<div className='btn_text'>내림차순</div>
					</button>
				</div>
			</div>

			<div className='filter_rowDel'>
				<div className='filter_rowDel_header'>값 숨기기</div>
				<div className='filter_rowDel_content'>
					{values.map((v) => {
						const checked = !hiddenValues.has(v);
						return (
							<label key={v}>
								<input type='checkbox' checked={checked} onChange={() => onToggleValue(v)} />
								<span>{v === '' ? '(빈값)' : v}</span>
							</label>
						);
					})}
				</div>
			</div>

			<div className='filter_colDel'>
				<button onClick={onHideColumn}>
					<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-trash3-fill' viewBox='0 0 16 16'>
						<path d='M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5' />
					</svg>
				</button>
			</div>
		</div>
	);
}
