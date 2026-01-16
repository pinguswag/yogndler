# Wendler 5/3/1 - Next.js App

이 프로젝트는 Google AI Studio로 생성된 참조 앱(`wendler-5_3_1-yachu-hub`)을 Next.js + Supabase 스택으로 재구현한 버전입니다.

## 스택

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + Postgres + RLS)
- **State Management**: Custom hook (`useUserSettings`) with Supabase persistence

## 설정

1. Supabase 프로젝트 생성 및 환경 변수 설정:
   ```bash
   cp .env.local.example .env.local
   ```
   
   `.env.local` 파일에 다음 변수를 설정하세요:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. 데이터베이스 마이그레이션은 이미 적용되었습니다 (`create_user_settings_table`).

3. 의존성 설치:
   ```bash
   npm install
   ```

4. 개발 서버 실행:
   ```bash
   npm run dev
   ```

## 주요 기능

- ✅ Supabase 인증 (이메일/비밀번호)
- ✅ 사용자별 설정 저장 (Supabase Postgres)
- ✅ Workout 탭: 사이클/주차 네비게이션, 리프트 선택, 세트 완료 체크, PR 기록
- ✅ History 탭: 운동 기록 조회 및 삭제
- ✅ Settings 탭: 1RM 설정, Training Max 비율 조정, 진행 상황 리셋
- ✅ 보조 운동 추가 및 관리
- ✅ 실시간 설정 동기화 (500ms debounce)

## 데이터 구조

모든 앱 상태는 `user_settings` 테이블의 `settings_json` 컬럼에 JSONB 형태로 저장됩니다. 이는 참조 앱의 localStorage 구조와 동일합니다.

## 참조 앱

참조 구현은 `/wendler-5_3_1-yachu-hub` 폴더에 있으며, 이는 읽기 전용입니다.
