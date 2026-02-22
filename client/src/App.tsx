import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

function RouteTitle() {
	const location = useLocation();

	useEffect(() => {
		const titleMap: Record<string, string> = {
			'/': '최성보 신호등',
			'/dashboard': '대시보드'
		};
		document.title = titleMap[location.pathname] ?? '페이지를 찾을 수 없음';
	}, [location.pathname]);

	return null;
}

export default function App() {
	return (
		<BrowserRouter>
			<RouteTitle />
			<Routes>
				<Route path='/' element={<LandingPage />} />
				<Route path='/dashboard' element={<DashboardPage />} />
				<Route path='*' element={<NotFoundPage />} />
			</Routes>
		</BrowserRouter>
	);
}
