# Python 예외 처리(Exception Handling) 가이드

파이썬에서 예외 처리는 단순히 에러를 막는 것이 아니라, **프로그램의 흐름을 의도대로 제어**하기 위한 핵심 기술입니다.

---

## 1. raise vs try-except: 역할의 차이

| 구분           | 역할                                     | 비유                          |
| :------------- | :--------------------------------------- | :---------------------------- |
| **try-except** | 발생한 예외를 잡아내어 수습함            | 날아오는 공을 잡는 **글러브** |
| **raise**      | 의도적으로 예외를 발생시켜 흐름을 중단함 | 공을 던지는 **투수**          |

---

## 2. 주요 내장 예외(Built-in Exceptions) 종류

상황에 맞는 에러를 사용하는 것은 코드의 가독성과 디버깅 효율을 높입니다.

- **`ValueError`**: 타입은 맞지만 값이 적절하지 않을 때 (예: 나이에 -1 입력)
- **`TypeError`**: 데이터 타입 자체가 잘못되었을 때 (예: 숫자 + 문자열 연산)
- **`IndexError`**: 리스트 등의 범위를 벗어난 인덱스 접근
- **`KeyError`**: 딕셔너리에 없는 키를 조회할 때
- **`AttributeError`**: 객체에 없는 속성/메서드를 호출할 때
- **`ZeroDivisionError`**: 0으로 나눌 때

---

## 3. 실전 코드 패턴

### 3.1. 기본 사용법 (Validation)

데이터가 조건에 맞지 않을 때 즉시 실행을 멈춥니다.

```python
def check_positive(number):
    if number < 0:
        raise ValueError(f"양수만 가능합니다. 입력값: {number}")
    return number

try:
    check_positive(-10)
except ValueError as e:
    print(f"[에러 알림] {e}")
```

### 3.2. 에러 다시 던지기 (Re-raising)

에러 로그만 남기고, 실제 에러 처리는 상위 함수에서 하도록 전달할 때 사용합니다.

```python
try:
    # 어떤 복잡한 로직
    result = 1 / 0
except ZeroDivisionError:
    print("로그 기록: 0으로 나누기 시도가 발생함.")
    raise  # 발생했던 에러를 그대로 다시 던짐
```

### 3.3. 웹 프레임워크 활용 (HTTPException)

FastAPI, Flask 등에서 클라이언트에게 특정 HTTP 상태 코드를 보낼 때 사용합니다.

```python
from fastapi import HTTPException

def get_item(item_id):
    item = db.find(item_id)
    if not item:
        # 클라이언트에게 404 상태와 메시지 전달
        raise HTTPException(status_code=404, detail="아이템을 찾을 수 없습니다.")
    return item
```

### 3.4. 커스텀 예외 (Custom Exception)

프로젝트만의 고유한 에러가 필요할 때 `Exception` 클래스를 상속받아 만듭니다.

```python
class InsufficientBalanceError(Exception):
    """잔액 부족 시 발생하는 예외"""
    pass

def withdraw(amount, balance):
    if amount > balance:
        raise InsufficientBalanceError(f"잔액이 {amount - balance}원 부족합니다.")
    return balance - amount
```

---

## 4. 요약 및 팁

1.  **입구 컷 하세요**: 함수 시작 부분에서 `raise`를 써서 잘못된 인자를 걸러내면 코드가 안전해집니다.
2.  **구체적으로 던지세요**: 그냥 `Exception`을 던지는 것보다 `ValueError`처럼 구체적인 이름을 쓰는 것이 매너입니다.
3.  **메시지를 친절하게**: `raise ValueError("Error!")`보다는 왜 에러가 났는지 상세히 적어주세요.
