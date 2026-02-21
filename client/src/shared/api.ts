const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const rawDummyCsvUrl = (import.meta.env.VITE_DUMMY_CSV_URL ?? '').trim()

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '')

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

export const DUMMY_CSV_URL =
  rawDummyCsvUrl || buildApiUrl('/api/sample/dummy-midterm-like-labeled')

interface PredictCsvParams {
  file: File
  policyObj: unknown
  mode?: string
}

export async function predictCsv({
  file,
  policyObj,
  mode = 'full',
}: PredictCsvParams): Promise<unknown> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('policy', JSON.stringify(policyObj))

  const url = buildApiUrl(`/api/predict?mode=${encodeURIComponent(mode)}`)

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || 'Request failed')
  }

  return res.json()
}
