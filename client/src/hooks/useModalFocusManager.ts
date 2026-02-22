import { useEffect, useRef, type RefObject } from 'react';

type Options = {
	containerRef: RefObject<HTMLElement | null>;
	initialFocusRef?: RefObject<HTMLElement | null>;
	enabled?: boolean;
	restoreFocus?: boolean;
};

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]'
].join(', ');

function isVisible(el: HTMLElement): boolean {
	if (el.getClientRects().length === 0) return false;
	const style = window.getComputedStyle(el);
	return style.visibility !== 'hidden' && style.display !== 'none';
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
		if (el.getAttribute('aria-hidden') === 'true') return false;
		if (!isVisible(el)) return false;
		return true;
	});
}

export function useModalFocusManager({ containerRef, initialFocusRef, enabled = true, restoreFocus = true }: Options): void {
	const previousActiveRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!enabled) return;

		const container = containerRef.current;
		if (!container) return;

		previousActiveRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

		const focusInitial = () => {
			const preferred = initialFocusRef?.current;
			if (preferred && !preferred.hasAttribute('disabled')) {
				preferred.focus();
				return;
			}

			const firstFocusable = getFocusableElements(container)[0];
			if (firstFocusable) {
				firstFocusable.focus();
				return;
			}

			container.focus();
		};

		const rafId = window.requestAnimationFrame(focusInitial);

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Tab') return;

			const currentContainer = containerRef.current;
			if (!currentContainer) return;

			const focusables = getFocusableElements(currentContainer);
			if (focusables.length === 0) {
				event.preventDefault();
				currentContainer.focus();
				return;
			}

			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			const activeInside = !!active && currentContainer.contains(active);

			if (!activeInside) {
				event.preventDefault();
				first.focus();
				return;
			}

			if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
				return;
			}

			if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
			}
		};

		container.addEventListener('keydown', onKeyDown);

		return () => {
			window.cancelAnimationFrame(rafId);
			container.removeEventListener('keydown', onKeyDown);

			if (!restoreFocus) return;

			const previousActive = previousActiveRef.current;
			if (previousActive && document.contains(previousActive)) {
				previousActive.focus();
			}
		};
	}, [containerRef, enabled, initialFocusRef, restoreFocus]);
}
