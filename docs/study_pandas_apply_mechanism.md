# Pandas apply의 함수 전달 매뉴얼: "호출"이 아니라 "위임"이다

## 1. 문제 상황

Pandas의 apply 메서드를 사용할 때, 정의된 함수에는 매개변수가 있는데 호출부에서는 인자(Argument)를 전달하지 않는 것처럼 보여 혼란이 생김.

예시코드:

```python
# 정의: row라는 매개변수가 있음
def build_reasons(row: pd.Series) -> str:
    return "Some Reason"

# 호출: 인자 없이 함수 이름만 씀
df.apply(build_reasons, axis=1)
```

---

## 2. 핵심 원리

함수의 실행 권한 위임이것은 함수를 지금 당장 실행하는 것이 아니라, 함수라는 '설명서'를 전달하는 방식임.

- 직접 호출 f(x): 내가 직접 데이터를 넣고 결과를 즉시 받음.
- apply 전달 apply(f): Pandas에게 "함수 설명서"를 넘겨주고, Pandas가 내부적으로 루프를 돌며 각 행(row)을 함수에 하나씩 넣어 실행함.

---

## 3. 매개변수 확장 (args vs 키워드 인자)

함수에 row 데이터 외에 추가적인 값이 필요할 때, 가독성을 높이는 두 가지 방법이 있음.

### A. args (튜플 방식)

순서대로 값을 전달함. 짧지만 어떤 값인지 명확하지 않을 수 있음.

```python
df.apply(build_reasons, axis=1, args=(70, "Confirmed"))
```

### B. 키워드 인자 (명시적 방식) - 권장

매개변수 이름을 직접 지정하여 전달함. 가독성이 가장 좋음.

```python
# 함수 정의: def build_reasons(row, threshold, suffix):
df.apply(
    build_reasons,
    axis=1,
    threshold=70,
    suffix="Confirmed"
)
```

---

## 4. 요약 및 비교

| 방식             | 코드 가독성                | 특징함수                              |
| ---------------- | -------------------------- | ------------------------------------- |
| 함수 이름만 전달 | 낮음 (동작 원리 이해 필요) | apply가 행 데이터를 자동으로 주입함.  |
| args 사용        | 보통                       | 추가 인자를 순서대로(Tuple) 전달함.   |
| 키워드 인자 사용 | 매우 높음                  | 매개변수의 의미를 코드에 직접 명시함. |

---

## 5. 참고 자료

- [Pandas 공식 문서 - DataFrame.apply](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.apply.html)
- [Python 공식 문서 - 함수 정의와 호출](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)
- [Stack Overflow - Pandas apply에 추가 인자 전달하기](https://stackoverflow.com/questions/16978193/pandas-apply-with-multiple-arguments)

---
