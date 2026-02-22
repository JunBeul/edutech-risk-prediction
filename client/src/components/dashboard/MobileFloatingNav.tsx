import { buildApiUrl } from '../../shared/api'
import '../../styles/floatingNav.scss'

type Props = {
  onOpenUpload: () => void
  onOpenColumns: () => void
  reportUrl: string
}

export default function MobileFloatingNav({ onOpenUpload, onOpenColumns, reportUrl }: Props) {
  const handleDownload = () => {
    const link = document.createElement('a')
    // 모바일도 데스크톱 헤더와 동일하게 report_url -> 실제 다운로드 URL로 변환
    link.href = buildApiUrl(reportUrl)
    link.setAttribute('download', '')
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <nav className='floating_nav'>
      <button className='floating_btn' onClick={onOpenUpload}>
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-upload' viewBox='0 0 16 16'>
          <path d='M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5' />
          <path d='M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z' />
        </svg>
      </button>
      <button className='floating_btn' onClick={handleDownload}>
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-download' viewBox='0 0 16 16'>
          <path d='M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5' />
          <path d='M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z' />
        </svg>
      </button>
      <button className='floating_btn' onClick={onOpenColumns}>
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-filter' viewBox='0 0 16 16'>
          <path d='M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5' />
        </svg>
      </button>
    </nav>
  )
}
