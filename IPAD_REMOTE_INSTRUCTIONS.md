# 📱 iPad 원격 Claude Code 작업 지시서

> **사용법:** iPad에서 새 Claude 세션 시작할 때 — 아래 "**시작 메시지**" 섹션을
> 통째로 복사해서 첫 메시지로 붙여넣으세요. 그러면 어떤 환경(Claude.ai 앱 /
> 원격 Claude Code SSH / 모바일 웹)이든 즉시 컨텍스트가 잡힙니다.

---

## 🚀 시작 메시지 (이거 통째로 복사 → 붙여넣기)

```
I'm continuing work on the AXVELA / ARTXPARK suite from my iPad.

Before any work:
1. WebFetch this context document and read it fully:
   https://github.com/jayjay9824/artena-ai/blob/main/AXVELA_AI_CONTEXT.md

2. Recognize these trigger words and switch project context
   accordingly:
   - "AXVELA-AI"      → consumer scanner @ axvela.com
                        (local: C:\Users\jayja\OneDrive\Desktop\artena-ai)
                        (repo:  github.com/jayjay9824/artena-ai)
   - "AXVELA-GALLERY" → gallery operating console @ artena-ai.com
                        (local: C:\Users\jayja\artena-console)
                        (no public GitHub — direct vercel deploys)
   - "ARTXPARK"       → marketing site @ artxpark.com

3. Working rules (strict — these were established with the user):
   - AUTO-DEPLOY: any accepted change → commit + push to main, no
     permission prompt, no waiting. Vercel auto-deploys from main.
     Build first; never push on a failing build.
   - PRESERVE legacy artena_* identifiers (localStorage keys, JSON
     payload keys). Only UI-facing brand text is AXVELA / AXVELA AI
     / 엑스벨라 / CULTURAL INTELLIGENCE.
   - DON'T BREAK existing flow. When in doubt, gate new behaviour
     behind a switch instead of refactoring.
   - VERIFY before claiming done. Run npm run build (or describe
     what would be checked if the environment can't run shells).

4. iPad context limits — be honest about what you can and can't do
   in this environment, and write deliverables that I can apply
   later from the desktop if needed.

What I want to work on now:
[여기에 실제 요청 적기]
```

---

## 📂 트리거 워드 사전

| 트리거 | 프로젝트 | 도메인 | 로컬 경로 (데스크탑) |
|---|---|---|---|
| `AXVELA-AI` | 컨슈머 스캐너 앱 | www.axvela.com | `C:\Users\jayja\OneDrive\Desktop\artena-ai` |
| `AXVELA-GALLERY` | 갤러리 운영 콘솔 | www.artena-ai.com | `C:\Users\jayja\artena-console` |
| `ARTXPARK` | 마케팅 사이트 | www.artxpark.com | (별도 repo) |

세 프로젝트는 **코드베이스가 완전히 분리**되어 있음. 도메인 비슷해서 헷갈리기
쉬운데, 항상 트리거 워드로 명시하기.

---

## 💬 자주 쓰는 요청 패턴

### 1. 코드 리뷰 / 디버그
```
AXVELA-AI 다음 파일 리뷰해줘:

[파일 내용 붙여넣기]

증상: ...
의심되는 부분: ...
```

→ Claude가 진단 + 수정안. iPad에서는 코드 적용 못 하니까 **나중에 데스크탑에서
적용할 수 있는 형태로 출력 요청**:
```
Give me the exact diff in unified format so I can apply it from
desktop later.
```

### 2. 새 기능 설계 / Spec 작성
```
AXVELA-AI 에 다음 기능 추가하고 싶어:
- 작품 리포트에 "공유" 버튼
- 클릭 시 카카오톡 / 트위터 / 링크 복사
- 기존 OG 카드(/og/axvela-og.png) 사용

어디 파일 어떻게 들어가는지 + spec 정리해줘
```

→ Claude가 영향 받는 파일 매핑 + 구현 계획 + 단계별 todo. 데스크탑 복귀 후
이 spec을 기반으로 실제 구현.

### 3. 커밋 메시지 초안
```
AXVELA-AI 에 다음 변경했어:
- profile/saved 페이지에 검색 필터 추가
- savedArtworks util 에 search() 함수

우리 프로젝트 commit 스타일로 메시지 초안 써줘
```

→ Claude가 `feat(profile): ...` 형식으로 작성, Co-Authored-By 라인 포함.

### 4. 데스크탑 복귀 시 작업 핸드오프
세션 끝낼 때:
```
이번 대화에서 결정/논의된 내용 정리해줘. 데스크탑 돌아가서
"AXVELA-AI 위 핸드오프 가지고 와서 실행해줘" 라고 말할 거야.
```

→ Claude가 todo + 결정 사항 + 미해결 질문 정리. 데스크탑 Claude가 메모리 +
이 정리본을 합쳐서 이어받음.

---

## ✅ iPad에서 잘 되는 것

- **코드 리뷰** (사용자가 파일 내용 붙여넣기)
- **Spec 작성 / 설계 검토** (영향 범위 매핑)
- **커밋 메시지 초안**
- **디버그 추론** (증상 → 원인 가설)
- **작업 계획 / todo 정리**
- **GitHub URL을 통한 코드 fetch** (WebFetch 사용 가능 시)
- **공개 URL 검증** (production 도메인 동작 확인)

## ❌ iPad에서 안 되는 것 (또는 환경에 따라 제한)

- **로컬 파일 시스템 접근** — 사용자가 붙여넣은 코드만 볼 수 있음
- **`git` 명령어 직접 실행** — 데스크탑에서 해야 함
- **`npm run build` / `npm install`** — 데스크탑 또는 CI에서
- **Vercel CLI** — 데스크탑에서
- **실제 파일 저장** — Claude는 변경안만 제시, 사용자가 적용

> **중요:** 만약 iPad에 SSH 접속이 가능하고 원격 Claude Code 세션이라면 위
> 제한이 풀릴 수 있음. 그 경우 시작 메시지에서 추가:
> `I have a remote Claude Code session via SSH, you have shell access.`

---

## 🔄 데스크탑 ↔ iPad 핸드오프 패턴

### 데스크탑 → iPad
데스크탑에서 작업 정리:
```
이 작업 iPad에서 이어받을 거야. 핸드오프 메시지 만들어줘 — 
무엇을 했고 / 무엇이 남았는지 / iPad에서 검토해야 할 부분.
```

→ 출력된 메시지 메모 앱에 저장 → iPad에서 새 Claude 세션에 붙여넣기.

### iPad → 데스크탑
iPad에서 결정 사항 정리:
```
이번 대화 결정 사항 정리해서 데스크탑 핸드오프 메시지 만들어줘.
```

→ 데스크탑 Claude Code에서 새 세션:
```
AXVELA-AI

iPad에서 다음 결정/설계가 끝났어:
[붙여넣기]

이대로 구현해줘.
```

→ 데스크탑 Claude가 메모리 트리거(`AXVELA-AI`) + 핸드오프 내용 합쳐서 작업.

---

## 🔐 iPad에서 자주 막히는 부분 (트러블슈팅)

| 증상 | 원인 | 해결 |
|---|---|---|
| Claude가 GitHub URL 못 읽음 | WebFetch 권한 / 모바일 앱 제약 | `AXVELA_AI_CONTEXT.md` 통째로 붙여넣기 |
| Claude가 컨텍스트 잊어버림 | 세션 길어지면 압축됨 | 핸드오프 정리 → 새 세션 시작 |
| 도메인 헷갈림 (axvela.com / artena-ai.com 혼동) | 비슷한 이름 | 항상 트리거 워드로 명시 |
| 한국어 응답이 영어로 됨 | 시스템 프롬프트 영향 | "한국어로 답변해줘" 명시 |

---

## 📌 실제 사용 예시

### Case A — 카페에서 아이디어 정리
```
시작 메시지(위) 복사해서 붙여넣기
↓
"AXVELA-AI 의 SCAN 결과 화면에 '비슷한 작품 추천' 섹션 추가하고 싶어.
디자인 방향 + 어디 파일에 들어갈지 정리해줘."
↓
Claude가 spec 출력
↓
데스크탑 복귀 후 "iPad에서 정리한 spec 기반으로 구현해줘 [붙여넣기]"
```

### Case B — 통근 중 빠른 검토
```
시작 메시지 복사 → 붙여넣기
↓
"AXVELA-GALLERY 의 dashboard 페이지가 모바일에서 깨져. 
이 코드 리뷰 [page.tsx 내용 붙여넣기] - 모바일 반응형 수정안 줘"
↓
Claude가 diff 형태로 수정안 출력
↓
"이거 commit 메시지도 써줘 - 우리 스타일로"
↓
스크린샷 / 메모 저장 → 데스크탑에서 적용
```

---

## 🎯 마지막 한 줄

iPad에서 모든 작업의 **시작은 위 "시작 메시지" 붙여넣기**, **끝은 핸드오프 정리**.
이 두 가지만 지키면 어떤 Claude 환경이든 일관되게 작업 가능.
