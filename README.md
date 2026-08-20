# 이룸편입 LMS (E-ROOM Admissions LMS)

편입 영어 하이브리드 LMS — 관리자 · 강사 · 학생 3개 역할, 1,000+ 문항 문제은행(어휘·문법·독해·논리),
62개 대학 모집요강 데이터 기반 지원가능대학 분석, 출결 기반 태도 분석, 내장 AI 학습 코칭.

단일 정적 HTML 앱이며, 데이터는 브라우저 localStorage에 저장됩니다. (서버 DB 불필요)

## 데모 계정
| 역할 | 아이디 | 비밀번호 |
|------|--------|----------|
| 관리자 | `eroom_admin` | `admin1234` |
| 강사 | `instructor01` / `instructor02` | `1234` |
| 학생 | `s_choi` / `s_park` / `s_kim` | `1234` |
| 학생(신규·미배정) | `s_jung` | `1234` |

## 로컬 실행
```bash
npm start        # http://localhost:3000
```
의존성 없음(Node 18+ 내장 모듈만 사용). `node server.js` 로도 실행됩니다.

## GitHub 에 올리기 (독립 저장소)
```bash
git init
git add -A
git commit -m "이룸편입 LMS 초기 배포"
git branch -M main
# 1) GitHub 에서 빈 저장소 생성 (예: eroom-lms) 후 URL 복사
git remote add origin https://github.com/<YOUR_ID>/eroom-lms.git
git push -u origin main
```
GitHub CLI 가 있다면 한 번에:
```bash
gh repo create eroom-lms --private --source=. --remote=origin --push
```

## Railway 배포

### 방법 A — GitHub 연동 (권장)
1. 위 단계로 GitHub 저장소에 push
2. https://railway.app → **New Project** → **Deploy from GitHub repo** → `eroom-lms` 선택
3. Railway 가 `package.json` 을 감지해 자동 빌드(NIXPACKS) 후 `npm start` 실행
4. **Settings → Networking → Generate Domain** 클릭 → 공개 URL 발급
5. 이후 `git push` 할 때마다 자동 재배포

### 방법 B — Railway CLI
```bash
npm i -g @railway/cli
railway login
railway init           # 새 프로젝트 생성
railway up             # 현재 디렉터리 배포
railway domain         # 공개 도메인 발급
```

## 구성
| 파일 | 역할 |
|------|------|
| `public/index.html` | LMS 앱 전체(HTML+CSS+JS+데이터 임베드) |
| `server.js` | 의존성 없는 정적 파일 서버 (PORT 환경변수, /healthz 헬스체크) |
| `package.json` | `npm start` → `node server.js` |
| `railway.json` | Railway 빌드/배포/헬스체크 설정 |
| `Procfile` | `web: node server.js` |

## 데이터 갱신
문제은행/대학 데이터는 `public/index.html` 안에 `const QUESTIONS=...`, `const UNIVERSITIES=...` 로 임베드되어 있습니다.
교재가 갱신되면 해당 HTML 을 교체하고 다시 push 하면 됩니다.

## 배포 자동화 & 확인 (v1.1)

### GitHub → Railway 자동 배포 흐름
Railway 가 GitHub 저장소에 연결되어 있으면 **main 브랜치에 push 할 때마다 자동 재배포**됩니다.
이 저장소의 업데이트를 반영하려면 push 만 하면 됩니다.

```bash
# 최초 1회: 원격 저장소 연결 + 푸시
./push.sh https://github.com/<YOUR_ID>/<repo>.git
# 이후 업데이트마다
./push.sh "세부 요소별 분석 개편 반영"
```

### 배포 버전 확인 (클라이언트 렌더링 우회)
앱은 단일 HTML(JS 렌더링)이라 정적 fetch 로는 내용 확인이 어렵습니다.
그래서 `/version` JSON 엔드포인트를 추가했습니다.

```bash
curl https://eroom-transfer-production.up.railway.app/version
# → {"name":"eroom-lms","version":"1.1.0","builtAt":"2026-06-08"}
```
`version` 이 `1.1.0` 이면 세부 요소별 분석 개편본이 정상 배포된 것입니다.
`/version` 이 없거나 404(SPA fallback HTML)이면 아직 구버전이 배포된 상태입니다.

### GitHub Actions (선택)
`.github/workflows/verify-deploy.yml` 가 push 후 90초 뒤 `/version` 을 확인해 배포 성공 여부를 알려줍니다.

## AI 고도화 (하이브리드: Claude API + 내장 로직)
- 점수/반배정/세부분석/추천 같은 **결정적 계산은 항상 브라우저 내장 로직**으로 무료·오프라인 동작.
- **AI 튜터 답변, 오답 상세 해설, 종합 코칭** 등 자연어 응답만 서버 프록시(`/api/ai`)를 통해 Claude가 생성.
- API 키가 없거나 호출이 실패하면 **자동으로 내장 로직으로 폴백** → 어떤 경우에도 앱이 멈추지 않음.
- 키는 **서버 환경변수에만** 두며 브라우저로 절대 전송되지 않음.

### 켜는 법
1. Railway 프로젝트 → **Variables** 탭 → `ANTHROPIC_API_KEY` 추가 (값: Anthropic 콘솔의 API 키)
2. (선택) `ANTHROPIC_MODEL` 추가 (기본 `claude-3-5-haiku-latest`)
3. 저장하면 재배포되고, 사이드바 배지가 **"AI: Claude 연동"** 으로 바뀜.
4. 확인: `curl https://eroom-transfer-production.up.railway.app/version` → `"ai":"claude"`

키를 안 넣으면 배지가 **"AI: 내장 로직"** 으로 표시되고 규칙 기반으로 동작합니다.

## 기기 간 데이터 공유 / 데이터 영구 저장 (중요)

v2.5.0부터 모든 시험·학생 데이터는 **서버 공용 저장소**(`/api/state`)에 저장되어,
어느 PC에서 접속하든 같은 데이터가 보입니다. (이전에는 각 PC 브라우저에만 저장되어
다른 PC에서 안 보였습니다.)

서버는 데이터를 JSON 파일(`eroom_state.json`)에 저장합니다. 환경변수:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DATA_DIR` | 앱 폴더 | 저장 폴더. Railway에서는 **반드시 볼륨 경로(/data)** 로 지정 |
| `DATA_FILE` | `DATA_DIR/eroom_state.json` | 저장 파일 전체 경로(선택) |

### Railway에서 재배포 후에도 데이터 유지하기 — Volume 연결
Railway 컨테이너의 일반 디스크는 **재배포 시 초기화**됩니다. 데이터를 유지하려면:

1. Railway 프로젝트 → 서비스 → **Variables** 탭에서 `DATA_DIR = /data` 추가
2. 서비스 → **Settings → Volumes → New Volume**, Mount path를 `/data` 로 지정
3. Redeploy

이렇게 하면 시험 결과·학생 정보가 재배포·재시작 후에도 그대로 유지됩니다.
볼륨을 연결하지 않아도 같은 배포가 떠 있는 동안에는 여러 PC가 데이터를 공유하지만,
다음 배포 때 초기화되므로 실서비스에서는 볼륨 연결을 권장합니다.

> 참고: `/api/state` 는 현재 별도 인증이 없습니다(클라이언트형 LMS 구조). 외부 노출이
> 우려되면 Railway의 접근 제한이나 별도 인증 도입을 검토하세요.

## 재배포(업데이트) 안전 절차 — 데이터 유실 방지 (중요)

데이터(eroom_state.json)는 **앱 폴더 밖**(`/root/eroom-data`)에 저장되어 재배포해도 보존됩니다.
업데이트 시 아래 절차를 지키면 데이터가 롤백되지 않습니다.

1. 새 파일을 서버에 반영 (둘 중 하나)
   - git: `cd /root/eroom-app && git pull`
   - 또는 SFTP로 `server.js`·`public/` 덮어쓰기
2. 항상 ecosystem 설정으로 재시작(환경변수 누락 방지):
   ```
   cd /root/eroom-app
   pm2 delete eroom 2>/dev/null
   pm2 start ecosystem.config.js
   pm2 save
   ```
3. 확인: `http://서버/version` 의 `dataFile`이 `/root/eroom-data/...` 인지, `counts`가 유지되는지 확인.

주의
- `pm2 start server.js` 를 환경변수 없이 실행하지 마세요(과거 데이터 롤백 원인). 반드시 `ecosystem.config.js` 사용.
- 데이터 백업: `/root/eroom-data/eroom_state.json` (와 `.bak`)를 주기적으로 복사해 두면 안전합니다.
