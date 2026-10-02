# FDS Inspector 1.0.4 — 설치 패키지 검사 기준

## 포함된 기준

| 기준 패키지 | 버전 | 수집 범위 |
| --- | --- | --- |
| @mis/fe-tokens | 0.0.11 | globals.css의 정적 :root 변수 286개, Tailwind spacing/borderRadius scale |
| @mis/fe-ui | 0.6.0 | Button·Input 첫 번째 정적 CVA의 기본 클래스, variants, compoundVariants, defaultVariants |
| @mis/fe-icons | 0.1.1 | 이름·line/fill·소스 경로 323개, IActivity/IAddDocument/IAlertCircle 기본 크기·viewBox |

`fds-package-registry.js`에 기준 버전, 수집 시각, 입력 파일 SHA-256을 함께 저장한다. 로컬 설치 패키지에서 추출한 스냅샷이며 Storybook의 패키지 버전이나 검사 대상 웹사이트의 패키지 버전을 증명하지 않는다.

## 생성과 갱신

네트워크 접근, 패키지 설치, 패키지 코드 실행 없이 정적 파일만 읽는다.

```sh
npm run sync:packages -- /absolute/path/to/project --write
npm test
npm run build:extension
```

프로젝트의 `node_modules/@mis`에 세 패키지가 설치되어 있어야 한다. 생성기는 모든 입력을 검증한 후 임시 파일을 rename하여 기준 파일을 갱신한다. 구조가 지원되지 않거나 원본이 누락되면 오류로 중단한다. 기존 소스/기준을 임의의 값으로 대체하지 않는다. --write를 생략하면 생성한 JavaScript를 stdout으로 출력한다.

## 검사 연결

- 런타임 주입과 배포 ZIP에 패키지 기준/유틸리티 두 파일을 포함한다.
- 패키지 변수는 번들 Storybook 변수와 병합하고 같은 이름은 패키지 기준을 우선한다. Storybook 문서 링크와 CSS 유틸리티 목록은 기존 스냅샷을 유지한다.
- 컬러 토큰 조회, 간격/라운드 토큰 매핑, authored variable 판정에 병합 기준을 사용한다. 현재 직접 입력/가져오기 경로는 유지한다.
- 검사 결과의 ‘패키지 검사 기준’을 펼치면 기준 버전과 수집 범위, 실행 앱 버전 미확인 안내를 볼 수 있다.
- 직접 6px gap, 10px padding 등은 실제로 같은 속성군의 정적 클래스가 정의된 컴포넌트 참고 정보를 상세 가이드에 제공한다. 이 정보는 `definition-only`이며 요소의 소유 출처 증거나 자동 면제 규칙이 아니다.

## 중요한 한계

- 라이브러리 출처 자동 식별/자동 정상 판정은 하지 않는다. 패키지 정의와 DOM 클래스가 같아도 앱 작성 코드일 수 있다.
- Tailwind 기본 rounded-lg/md 수치는 fe-tokens의 선언으로 추가하지 않았다. 해당 변수의 출처가 확인되지 않으면 기존처럼 review로 유지한다.
- CVA 첫 번째 정적 선언의 스타일 정의만 수집했다. 런타임 props, 후속 클래스 병합, 사용자 override, 컴포넌트 전체 동작 계약은 검사하지 않는다.
- 아이콘은 기준 정보를 포함하지만 이름·형태 자동 식별, 잘림/크기 위반 판정은 아직 구현하지 않았다. 기본 크기는 변경 가능한 기본값이지 필수 크기가 아니다.
- 조건부 테마, 동적 CSS 계산, 생성되는 전체 Tailwind utility 목록은 정적 :root 변수 수집 범위 밖이다. 사용자 기준과 번들 패키지가 다른 버전이면 별도 기준 관리가 필요하다.
- 장기적인 FDS 배포 파이프라인 연동은 패키지 저장소 측 작업이다. 이 작업에서 변경하지 않았다.

## 검증과 전달

- 312개 Node 테스트 통과: 정적 추출, 동적 코드 거부, escaped decimal 토큰, 패키지 기준 우선순위, 기준/실행 버전 구분, 속성군별 공식 정의 참고, 런타임 파일 주입 순서 포함.
- 실제 설치 패키지에서 다시 추출한 결과와 번들 기준의 버전/정의/해시가 일치함을 확인했다. 수집 시각만 비교에서 제외했다.
- Ego의 agent-owned 실제 UI System 탭에 테스트 runtime/storage shim과 최신 소스를 주입했다. ‘패키지 검사 기준’을 펼쳐 세 버전, 토큰/컴포넌트/아이콘 범위, 실행 앱 버전 미확인과 자동 식별 없음 안내를 확인했다. 가로 텍스트 잘림은 없었다. 이 검증은 설치된 확장앱 검증을 대신하지 않는다.
- 빌드 결과: dist/fds-inspector, dist/fds-inspector.zip, 런타임 파일 51개.
- 사용자 설치 확장앱의 재로드·재검사는 별도 단계이다. 앱/외부 패키지/Figma/원격 저장소는 변경하지 않았다.
