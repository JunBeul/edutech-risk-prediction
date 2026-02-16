export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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

  const url = `${API_BASE_URL}/predict?mode=${encodeURIComponent(mode)}`

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
