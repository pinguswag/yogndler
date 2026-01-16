import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 빌드 시 환경 변수가 없어도 에러를 던지지 않도록 처리
// 런타임에서만 검증
if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
  }
}

// 환경 변수가 있으면 사용, 없으면 더미 클라이언트 생성 (빌드 시)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
