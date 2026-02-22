// Vite 환경변수에서 백엔드 기본 주소와 더미 CSV 주소를 읽어옵니다.
// 값이 없을 수 있으므로 빈 문자열로 대체한 뒤 trim 처리합니다.
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const rawDummyCsvUrl = (import.meta.env.VITE_DUMMY_CSV_URL ?? '').trim();

// 뒤에 붙은 슬래시(`/`)를 제거해 URL 결합 시 `//`가 생기지 않도록 정규화합니다.
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export function buildApiUrl(path: string): string {
	// 이미 절대 URL이면 그대로 사용합니다. (예: https://example.com/api)
	if (/^https?:\/\//i.test(path)) return path;

	// 상대 경로는 항상 `/`로 시작하도록 맞춥니다.
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	// API_BASE_URL이 있으면 붙이고, 없으면 현재 origin 기준 상대경로로 요청합니다.
	// 예: '/api/predict' -> 같은 서버/프록시로 요청
	return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

// 더미 CSV 다운로드 URL:
// 1) 명시된 환경변수가 있으면 그것을 사용
// 2) 없으면 백엔드의 샘플 CSV 엔드포인트로 자동 연결
export const DUMMY_CSV_URL = rawDummyCsvUrl || buildApiUrl('/api/sample/dummy-midterm-like-labeled');

// CSV 예측 요청에 필요한 입력값 타입입니다.
interface PredictCsvParams {
	file: File;
	// 정책 설정 객체(프론트에서 만든 설정값)를 그대로 전달하고,
	// 전송 직전에 JSON 문자열로 변환합니다.
	policyObj: unknown;
	// 백엔드 응답 모드(full/compact 등). 기본값은 full.
	mode?: string;
}

export async function predictCsv({ file, policyObj, mode = 'full' }: PredictCsvParams): Promise<unknown> {
	// 파일 업로드 + 정책 JSON을 함께 보내기 위해 multipart/form-data를 사용합니다.
	const formData = new FormData();
	formData.append('file', file);
	formData.append('policy', JSON.stringify(policyObj));

	// 쿼리 파라미터 mode를 포함한 예측 API URL을 생성합니다.
	const url = buildApiUrl(`/api/predict?mode=${encodeURIComponent(mode)}`);

	// 백엔드에 CSV 예측 요청을 보냅니다.
	const res = await fetch(url, {
		method: 'POST',
		body: formData
	});

	// 실패 응답이면 서버 메시지를 읽어 에러로 던집니다.
	// 호출한 화면/훅에서 이 에러를 받아 사용자에게 안내할 수 있습니다.
	if (!res.ok) {
		const errText = await res.text();
		throw new Error(errText || 'Request failed');
	}

	// 성공 시 JSON 응답 본문(예측 결과/리포트 URL 등)을 반환합니다.
	return res.json();
}
