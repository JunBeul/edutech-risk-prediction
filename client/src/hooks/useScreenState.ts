import { useEffect, useMemo, useState } from 'react';
import { BREAKPOINT_DESKTOP, BREAKPOINT_MOBILE, BREAKPOINT_TABLET, type ScreenType } from '../shared/breakpoints';

type ScreenState = {
	width: number;
	screenType: ScreenType;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isWide: boolean;
};

function getWindowWidth(): number {
	if (typeof window === 'undefined') return BREAKPOINT_DESKTOP;
	return window.innerWidth;
}

function getScreenType(width: number): ScreenType {
	if (width <= BREAKPOINT_MOBILE) return 'mobile';
	if (width <= BREAKPOINT_TABLET) return 'tablet';
	if (width <= BREAKPOINT_DESKTOP) return 'desktop';
	return 'wide';
}

export function useScreenState(): ScreenState {
	const [width, setWidth] = useState<number>(getWindowWidth);

	useEffect(() => {
		const handleResize = () => setWidth(window.innerWidth);

		handleResize();
		window.addEventListener('resize', handleResize, { passive: true });

		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return useMemo(() => {
		const screenType = getScreenType(width);
		return {
			width,
			screenType,
			isMobile: screenType === 'mobile',
			isTablet: screenType === 'tablet',
			isDesktop: screenType === 'desktop',
			isWide: screenType === 'wide'
		};
	}, [width]);
}
