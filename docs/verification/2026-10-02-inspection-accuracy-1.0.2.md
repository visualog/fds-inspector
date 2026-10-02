# FDS Inspector 1.0.2 검증

## 수정 사항

- CSSOM이 border-color와 gap 축약 선언을 빈 pending-substitution longhand로 노출하는 경우, 원래 축약 선언을 복원.
- row-gap / column-gap 및 보더 색상 방향별 조회 유지. 같은 계산값이어도 다른 방향의 literal override를 숨기지 않음.
- 등록되지 않았거나 등록값과 일치하지 않는 radius 변수는 통과시키지 않고 `변수 출처 확인 필요`로 표시. metadata에는 authored/computed/status를 기록.
- 출처 검토가 있는 요약의 warning 카드는 `토큰 검토`로 표시. 직접 지정한 원시값만 있으면 기존 `원시값` 유지.
- 요약에 설치 런타임의 manifest version과 Storybook registry capturedAt 표시.
- package/manifest 1.0.2, 인스펙터 UI build marker 2026-10-02-1.0.2.

## 검증

- 전체 Node 테스트 292개 통과. npm의 기존 always-auth 설정 경고는 발생함.
- Ego 브라우저 TaskSpace 6에서 현재 체크아웃 모듈을 로드.
- Fixture에서 등록된 border-color/gap token 통과, literal 및 13px override 검출 유지.
- 실제 로컬 앱의 `.border-border-primary`, `.mr-auto.grid.gap-1` 토큰 판정 true 확인.
- `--radius-lg`는 현재 FDS registry에 없어 통과 처리하지 않음.
- 테스트 전용 runtime shim으로 전체 overlay 렌더링 검증. manifest 1.0.2 및 capturedAt 표시,
  토큰 검토 카드 표시, provenance 가로 줄넘침 없음.
- 테스트 overlay 결과: 검사 314 / 제외 20, 컬러 경고 없음, 간격 영향 8 요소,
  라운드 영향 119 요소. 토큰 source는 테스트 전용 baseline이고 화면 펼침 상태도 다르므로
  사용자 사이드바의 이전 310 / 26 및 32 / 47 / 120 결과와 직접 비교하지 않는다.
- 임시 overlay 스캔 약 44.8초. 정확도 검증과 별개로 반복 CSS 탐색 비용의 성능 개선이 남아 있다.
- dist/fds-inspector 및 dist/fds-inspector.zip 생성 (49 runtime files).

## 적용 및 한계

사용자 설치 확장앱의 1.0.2 업데이트/재검사는 아직 수행하지 않았다.
Chrome 확장앱 새로고침 및 대상 페이지 새로고침 후 동일 URL/viewport/펼침 상태로 재검사해야 한다.
앱 및 Figma 수정, Git push는 하지 않았다.

이번 출처 검토 UI는 radius에 우선 적용했다. 다른 카테고리의 미등록 변수/읽을 수 없는 CSS를
별도 review 상태로 구분하는 작업, radius semantic 매핑 정책, 복잡한 cascade 및 성능은 후속 과제다.
review는 '위반 확정' 또는 '통과'를 뜻하지 않으며 임의 자동 수정의 근거로 사용하면 안 된다.
