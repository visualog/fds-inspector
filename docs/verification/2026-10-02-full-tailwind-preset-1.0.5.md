# FDS Tailwind preset 확장 — 1.0.5

## 적용 범위

설치된 `@mis/fe-tokens 0.0.11`의 `tailwindPreset` 전체 데이터를 수집한다. 기준 소스는 `/Users/im_018/Documents/GitHub/Project/Fasoo-Books-React/node_modules/@mis/fe-tokens`이며, fe-ui 0.6.0과 fe-icons 0.1.1의 기존 정적 참고 정보도 유지한다.

- preset 10개 영역: colors, fontFamily, fontSize, fontWeight, spacing, screens, borderRadius, keyframes, animation, boxShadow
- 색상 정의 190개, fontSize·타이포그래피 정의 32개
- 기본 유틸리티 속성 참고 매핑 2,284개
- 미매핑 영역 0개, 미해결 토큰 참조 0개
- CSS 변수 286개, Button·Input 정적 정의, 아이콘 목록 323개와 대표 아이콘 메타데이터 3개

이는 **FDS preset 전체 데이터**이지 Tailwind 전체 클래스 지원을 의미하지 않는다. Tailwind 기본 theme, 대상 앱의 사용자 설정·플러그인, 반응형·상태 변형의 최종 CSS는 포함하지 않는다. screens와 keyframes는 데이터로 보존하며 컴파일된 selector로 가장하지 않는다. 실제 판정에서는 CSS cascade와 작성된 선언의 증거가 필요하다. 매핑이나 클래스명이 일치해도 공식 컴포넌트 출처로 단정하거나 자동 면제하지 않는다.

패키지 유틸리티 매핑은 오래된 Storybook 매핑보다 우선하며, Storybook 문서 링크는 유지한다. 검사 결과의 접힌 ‘패키지 검사 기준’에 커버리지와 한계를 표시한다.

## 생성 방식과 안전장치

기존 정적 추출만으로 얻을 수 없던 함수 생성 색상·타이포그래피를 수집하기 위해, 빌드 시 로컬 패키지 모듈을 제한된 별도 Node 프로세스에서 평가한다. Node 25 이상이 필요하다. 읽기 허용은 모듈 디렉터리로 제한하고 쓰기·네트워크·자식 프로세스 권한은 부여하지 않는다. 환경 변수는 제거하며 5초 제한, 출력 2 MiB 제한과 직렬화 검증을 적용한다. 이는 신뢰된 로컬 패키지 평가의 제한 장치이며 절대적인 악성 코드 샌드박스라는 보장은 아니다.

런타임 확장앱에는 생성된 JSON 참고 정보만 탑재한다. 패키지의 생성 함수를 실행하거나 대상 앱 버전을 자동 탐지하지 않는다. Button·Input과 아이콘 정보의 추출 방식은 변경하지 않았다.

재생성:

```sh
npm run sync:packages -- /Users/im_018/Documents/GitHub/Project/Fasoo-Books-React --write
npm test
npm run build:extension
```

## 검증

- TDD: 동적 preset·매핑 테스트의 실패를 확인한 뒤 구현했다.
- `npm test`: 319개 성공, 실패 0개.
- 쓰기·네트워크·자식 프로세스 거부, 환경 변수 제거, 직렬화 불가 값 거부 테스트 성공.
- 실제 설치 패키지 preset과 생성 snapshot의 전체 데이터 동등성 확인.
- 빌드에 복사된 registry와 소스 registry의 동등성 확인.
- 확장앱 빌드 성공: runtime 파일 51개, 버전 1.0.5.
- Ego 에이전트 전용 fixture에서 런타임 shim으로 검사 UI 확인: 1.0.5 표시, preset 10개 영역, 매핑 2284개, 미매핑·미해결 0개 표시, 기준 정보의 가로 잘림 없음.
- 브라우저 확인은 **설치된 Chrome 확장앱의 end-to-end 테스트가 아니다**. 실제 설치 환경에서는 확장앱 새로고침 후 대상 페이지도 새로고침하고 재검사해야 한다.

대상 앱 코드·Figma·Git 원격은 변경하지 않았다. 기존 다른 변경과 삭제 파일도 그대로 보존했다.
