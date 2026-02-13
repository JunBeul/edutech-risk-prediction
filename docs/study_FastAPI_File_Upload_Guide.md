# FastAPI 파일 업로드 가이드

이 가이드는 FastAPI에서 유저 입력을 처리할 때의 매개변수 차이점과 파일 업로드의 핵심 로직을 정리한 문서입니다.

---

## 1. 매개변수 전달 방식 비교

| 구분            | `save: int = 0`                      | `file: UploadFile = File(...)`          |
| :-------------- | :----------------------------------- | :-------------------------------------- |
| **위치**        | **Query Parameter** (URL 주소창)     | **Request Body** (HTTP 본문)            |
| **데이터 형식** | 단순 텍스트 (Key=Value)              | 바이너리/멀티파트 (multipart/form-data) |
| **주요 용도**   | 검색 필터, 설정 플래그, 페이지네이션 | 이미지, 영상, 문서, 대용량 데이터       |

---

## 2. 확장자 처리 (`UploadFile`)

FastAPI에서 모든 파일(이미지, 동영상, 음원 등)은 `UploadFile` 타입을 사용합니다.
확장자나 파일의 종류는 `file.content_type`을 통해 구분할 수 있습니다.

- **이미지**: `image/jpeg`, `image/png`
- **동영상**: `video/mp4`
- **음원**: `audio/mpeg`

---

## 3. 다중 파일 업로드 및 용량 제한 예제 코드

```python
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from typing import List

app = FastAPI()

# 최대 허용 용량 설정 (예: 10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

@app.post("/upload/")
async def upload_files(
    # List[UploadFile]를 사용하여 여러 파일을 동시에 받음
    files: List[UploadFile] = File(...),
    # 파일과 함께 보낼 일반 데이터는 Form으로 받음
    user_id: str = Form(...)
):
    results = []

    for file in files:
        # 1. 용량 제한 체크
        if file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"{file.filename} 파일이 너무 큽니다. (최대 10MB)"
            )

        # 2. 파일 정보 수집
        results.append({
            "filename": file.filename,
            "content_type": file.content_type,
            "size": f"{file.size / (1024*1024):.2f} MB"
        })

    return {
        "user": user_id,
        "total_files": len(files),
        "details": results
    }
```

---

## 4. 핵심 요약 (Cheat Sheet)

1. **기본 타입(`str`, `int`)**은 URL에 붙는 **Query Parameter**가 기본값이다.
2. **파일**은 URL에 담을 수 없으므로 반드시 **Request Body**를 사용하는 `File()`을 쓴다.
3. **여러 개**를 받으려면 `List[UploadFile]`로 감싼다.
4. **파일과 텍스트를 함께** Body로 받으려면 텍스트 변수에 `Form()`을 명시한다.
5. **보안**을 위해 서버 로직에서 `file.size` 검증은 필수다.
