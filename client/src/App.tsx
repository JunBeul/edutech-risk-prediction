import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';

function RouteTitle() {
	const location = useLocation();

	useEffect(() => {
		const titleMap: Record<string, string> = {
			'/': '최성보 신호등',
			'/dashboard': '대시보드'
		};
		document.title = titleMap[location.pathname] ?? '최성보 신호등';
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
			</Routes>
		</BrowserRouter>
	);
}
