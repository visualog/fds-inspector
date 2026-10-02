# FDS Inspector 검사 정확도 보완 — 2026-10-02

## 범위

Fasoo Books 앱과 Figma는 수정하지 않았다. 기존 사이드바 검사 상태도 유지했다.
현재 체크아웃의 검사 모듈을 별도 Ego 브라우저 페이지에 로드해 검증했다.
이는 사용자 브라우저에 설치된 확장앱을 업데이트했다는 증거가 아니다.

## 수정

- padding/margin 논리 속성을 direction과 writing-mode에 따라 물리 방향으로 대응.
- CSSOM의 var() shorthand pending-substitution longhand에서 원래 선언 복원.
- 부모의 color 상속 추적, 자식 literal override는 계속 검출.
- CSS 레이어의 기본 순서, 일반 선택자의 specificity, !important, inline 우선순위 반영.
- 중첩 CSS 선택자에서 부모 선택자를 결합해 무관한 규칙을 빌리지 않도록 보완.
- escaped decimal custom property 이름과 Storybook 레지스트리 추출 보완.
- 등록된 길이 변수의 rem/px 값은 문서 root font-size 기준으로 비교.
- auto 마진은 고정 간격 위반에서 제외하고 소수 px는 절삭하지 않음.
- 동일 패딩 값에서 한 방향의 token이 다른 방향 literal을 가리지 않도록 보완.
- counts는 문제 건수, affectedElementCounts는 필터별 중복 제거 요소 수.
- 툴바 및 요약의 영향 요소 수는 중복 요소를 제거. 문제 그룹별 요소 수는 그룹 범위 집계이므로 서로 더하면 안 됨.

## 브라우저 검증

`scripts/qa-inspection-accuracy.mjs`를 Ego browser TaskSpace 5의 임시 페이지에서 실행했다.

Fixture:

- 논리 padding token: 이슈 없음.
- 토큰을 덮어쓴 13px: 미등록 검출.
- literal 12px: 원시값 검출 유지.
- auto margin 계산값 523.328px: 이슈 없음.
- literal 8.5px: 8px로 절삭하지 않고 미등록 검출.
- 상속 color token: 인식. 동일 색 literal 자식: token으로 인정하지 않음.

실제 URL: http://localhost:5173/ui-system?view=fds&audience=service

`Selection colors` 링크와 내부 span:

- padding-left 12px / padding-top 10px.
- --spacing-3 및 --spacing-2.5 등록된 FDS 변수로 인식.
- 내부 span의 상속 color token 인식.
- mr-auto authored 값 auto 확인 (해당 검증 창 계산값 845.469px).
- --radius-lg는 현재 레지스트리에 없음. 자동으로 FDS 변수로 인정하지 않음.

Storybook 동기화: 261 variables, 341 utilities, 54 docs.
출처 URL, 수집 시각, CSS hash는 storybook-registry.js에 기록된다.

## 한계와 후속 확인

- 현재 브라우저의 155/507/120 표시값은 이전 실행 결과이며 새 패키지 설치 후 재검사해야 한다.
- 전체 화면의 개선 후 수치를 이 검증에서 주장하지 않는다. 대표 요소와 fixture를 대조했다.
- CORS로 읽을 수 없는 stylesheet, Shadow DOM, animation/transition, @scope, container query,
  복잡한 함수 선택자 specificity, nested layer ordering은 완전한 browser cascade 구현이 아니다.
- Tailwind 기본 변수를 전부 FDS로 인정하지 않는다. radius-lg 같은 미등록 변수는
  FDS 정책/매핑 검토가 필요하다. 기존 radius 경고의 원시값 문구는 이 경우 엄밀하지 않으며
  별도 '변수 출처 확인 필요' 상태 설계가 후속으로 필요하다.
- FDS 컴포넌트 내부를 통째로 제외하지 않았다. 실제 override 위반이 숨겨지면 안 된다.
- 인터뷰, 추적 설치, 자동 CSS 수정, Git push는 수행하지 않았다.

## 사용자 적용

Chrome 확장 관리에서 새 unpacked 폴더 `dist/fds-inspector`를 사용하거나 기존 경로의
확장앱을 새로고침한다. 대상 웹 페이지도 새로고침한 뒤 검사를 다시 실행한다.
기존 검사 결과와 새로운 검사 결과를 동일 URL, viewport, 펼침 상태에서 비교해야 한다.
