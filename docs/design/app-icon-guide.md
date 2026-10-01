# FDS Inspector App Icon Guide

이 문서는 FDS Inspector 앱/확장 아이콘을 제작할 때 담아야 할 의미, 시각 방향, 권장 사이즈, 산출물 기준을 정리한다.

## Icon Role

FDS Inspector는 Fasoo Design System을 실제 화면 위에서 검사하고, 디자인 토큰과 UI 규칙의 차이를 빠르게 발견하도록 돕는 검증 도구다. 앱 아이콘은 단순한 장식보다 “디자인 시스템을 정확하게 검사하는 도구”라는 역할이 즉시 읽혀야 한다.

아이콘이 전달해야 할 핵심 인상은 다음과 같다.

- 신뢰: 검사 결과가 기준에 근거해 나온다는 느낌
- 정밀함: spacing, color, typography 같은 작은 차이를 잡아내는 도구라는 느낌
- 디자인 시스템: 개별 화면보다 규칙, 토큰, 컴포넌트 체계를 다룬다는 느낌
- 실행성: 보고서용 상징이 아니라 실제 페이지 위에서 켜고 쓰는 검사 도구라는 느낌

## Recommended Meaning

앱 아이콘에는 아래 세 가지 의미를 우선순위로 담는다.

### 1. Inspect

검사, 스캔, 확인을 나타내는 형태가 중심이 되어야 한다.

좋은 표현:

- 확대경
- 체크 마크
- 포커스 프레임
- 선택 박스 또는 측정 가이드

피해야 할 표현:

- 보안 방패만 강조한 형태
- 일반적인 설정 기어
- 추상적인 알파벳 조합만 있는 형태

### 2. Design System

FDS Inspector가 디자인 시스템 검증 도구라는 점을 드러내기 위해 토큰, 그리드, 컴포넌트 구조를 암시한다.

좋은 표현:

- 작은 토큰 점 또는 컬러 스와치
- 4px 그리드를 연상시키는 정렬된 점/선
- 카드, 버튼, 텍스트 라인을 단순화한 UI 레이어
- FDS의 브랜드 블루를 작은 강조색으로 사용

피해야 할 표현:

- 복잡한 대시보드 축소판
- 지나치게 많은 UI 요소
- 아이콘 안에 긴 텍스트를 넣는 방식

### 3. Issue Detection

검사 도구의 실질적 가치인 “문제를 찾아 알려준다”는 의미를 작게 포함한다.

좋은 표현:

- 작고 명확한 경고 점
- 검사 프레임 안의 강조 포인트
- 정상/오류 상태를 구분하는 작은 배지

피해야 할 표현:

- 큰 느낌표가 중심이 되는 경고 앱처럼 보이는 형태
- 빨간색이 전체를 지배하는 오류 중심 아이콘
- 실패나 위험을 과장하는 표현

## Concept Directions

아래 중 하나를 메인 방향으로 선택한다. 한 아이콘 안에 모든 콘셉트를 섞지 않는다.

### Direction A: Focus Frame + Token Dot

검사 프레임 안에 작은 토큰 점이나 스와치를 배치한다.

의미:

- 화면 요소를 선택해 검사한다
- 디자인 토큰 기준으로 확인한다
- Chrome 확장 아이콘처럼 작은 크기에서도 읽기 쉽다

추천도: 높음

### Direction B: Magnifier + Component Layer

확대경 안쪽에 단순화한 UI 컴포넌트 레이어를 넣는다.

의미:

- 실제 화면을 살펴본다
- 컴포넌트 구조를 분석한다
- 일반 사용자도 검사 도구임을 빠르게 이해한다

추천도: 중간

주의:

- 16px, 32px에서는 확대경 손잡이와 내부 레이어가 뭉칠 수 있다.

### Direction C: FDS Monogram + Check Grid

FDS의 첫 글자 또는 간단한 심볼을 그리드/체크와 결합한다.

의미:

- 브랜드 식별성이 높다
- 디자인 시스템 기준을 통과한다는 인상을 준다

추천도: 중간

주의:

- 작은 크기에서는 글자가 흐려질 수 있으므로 `FDS` 전체 텍스트보다 단일 심볼을 권장한다.

## Visual Style

FDS Inspector의 앱 아이콘은 업무용 도구답게 조용하고 선명해야 한다. 화려한 그라디언트, 복잡한 그림, 과한 3D 표현보다 작은 크기에서 읽히는 명확한 실루엣을 우선한다.

Chrome Extension의 toolbar/action 아이콘은 일반 모바일 앱 아이콘처럼 전체를 채운 라운드 사각형 타일보다, 투명 PNG 위에 명확한 심볼을 올리는 방식이 우선이다. 검은 라운드 사각형 배경은 홍보 이미지, 문서 썸네일, 큰 프리뷰용 후보로만 사용하고, manifest에 연결할 기본 아이콘 세트는 투명 배경으로 제작한다.

권장 스타일:

- 단순한 기하 형태
- 1개의 중심 상징과 1개의 보조 의미
- 투명 배경 위에 높은 대비의 foreground 심볼
- 작은 크기에서 사라지지 않는 두꺼운 stroke

색상 방향:

- 기본 배경: transparent
- 주요 심볼: white 또는 near-white
- 브랜드 강조: `#2F6FF3`
- 상태 강조: success `#43C971`, warning `#FFBB3D`, error `#FF5B5B` 중 1개만 제한적으로 사용

피해야 할 스타일:

- 여러 색을 동일 비중으로 쓰는 무지개형 아이콘
- 얇은 1px 라인 중심 아이콘
- 텍스트가 읽혀야만 의미가 전달되는 아이콘
- 앱 아이콘 전체가 경고색으로 보이는 구성
- 캡처 이미지의 흰색/회색 여백을 아이콘 배경처럼 반영하는 구성
- toolbar/action 아이콘에 검은 앱 타일을 그대로 넣는 구성

## Composition Rules

아이콘 제작 시 아래 규칙을 따른다.

- 원본은 `1024 x 1024px` 정사각형 아트보드로 제작한다.
- 핵심 심볼은 전체 아트보드의 60-72% 안에 배치한다.
- 가장자리 안전 영역은 최소 12.5% 확보한다.
- 16px에서도 중심 형태가 뭉치지 않아야 한다.
- 문자형 마크를 사용할 경우 `FDS` 전체보다 `FI`처럼 짧고 작은 크기에서 읽히는 조합을 사용한다.
- 배경과 심볼의 대비는 충분히 높게 유지한다.
- 작은 크기용 아이콘은 자동 축소본만 쓰지 말고 stroke와 간격을 별도로 보정한다.
- manifest용 PNG는 alpha channel을 유지한다.

## Required Sizes

Chrome Extension 기준으로 최소 아래 PNG 파일을 준비한다. 모든 파일은 정사각형 PNG이며, manifest용 파일은 투명 배경을 유지한다.

| Size | Use | Required |
| --- | --- | --- |
| `16 x 16` | Chrome toolbar, browser UI | Yes |
| `32 x 32` | 고해상도 toolbar 보조 | Recommended |
| `48 x 48` | 확장 관리 페이지 | Yes |
| `128 x 128` | Chrome Web Store, install surface | Yes |

`manifest.json`에 아이콘을 연결할 때는 다음 구조를 권장한다.

```json
{
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png"
    }
  }
}
```

## Master And Export Sizes

제작 원본과 배포용 산출물은 분리한다.

| Asset | Size | Format | Purpose |
| --- | --- | --- | --- |
| Master icon | `1024 x 1024` | Figma, SVG, or source design file | 원본 편집용 |
| App icon large | `512 x 512` | PNG | 문서, README, 외부 공유 |
| Store icon | `128 x 128` | PNG | Chrome Web Store / extension install |
| Extension management | `48 x 48` | PNG | Chrome extensions page |
| Toolbar high-density | `32 x 32` | PNG | 고해상도 toolbar |
| Toolbar base | `16 x 16` | PNG | Chrome toolbar |

가능하면 `256 x 256`도 함께 export해 내부 문서, macOS finder preview, 디자인 검토용으로 사용한다.

## File Naming

권장 저장 위치:

```text
icons/
  icon-master.svg
  icon-16.png
  icon-32.png
  icon-48.png
  icon-128.png
  icon-256.png
  icon-512.png
```

임시 시안은 실제 배포 파일과 섞지 않는다.

```text
docs/design/icon-exploration/
  concept-a-focus-frame.png
  concept-b-magnifier-layer.png
  concept-c-monogram-grid.png
```

## Quality Checklist

제작 완료 전 아래 항목을 확인한다.

- `16 x 16`에서 아이콘의 중심 의미가 알아보인다.
- `48 x 48`에서 배경, 심볼, 보조 강조가 서로 분리되어 보인다.
- `128 x 128`에서 브랜드 인상과 도구 성격이 모두 드러난다.
- 흰색/어두운색 브라우저 테마에서 모두 식별된다.
- FDS Inspector가 “검사 도구”라는 점이 앱 이름 없이도 어느 정도 전달된다.
- 경고 앱, 보안 앱, 설정 앱, 일반 디자인 앱처럼 오해되지 않는다.
- `manifest.json`의 `icons`와 `action.default_icon` 경로가 실제 파일과 일치한다.

## Recommended First Draft

첫 manifest용 시안은 `FI Transparent Monogram`으로 제작한다.

구성:

- 투명 배경
- `F`는 밝은 pearl/holographic glass 스타일
- `I`는 FDS blue glass 스타일이며 세리프 형태로 차이를 준다
- 우상단에 작은 sparkle을 유지해 레퍼런스의 세련된 신호만 반영한다
- 검은 앱 타일은 preview/mockup 용도로만 별도 제작한다

이 방향은 작은 Chrome toolbar 크기에서도 `FI`가 읽히며, FDS Inspector의 제품명과 역할을 직접적으로 전달한다.
