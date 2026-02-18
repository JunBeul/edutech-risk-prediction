import { useEffect } from 'react';

export function useBodyScrollLock(locked: boolean): void {
	useEffect(() => {
		const prevOverflow = document.body.style.overflow;

		if (locked) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = prevOverflow;
		};
	}, [locked]);
}
