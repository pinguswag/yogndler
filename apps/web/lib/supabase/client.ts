import { createClient } from '@supabase/supabase-js';

// 빌드 시점에는 유효한 더미 URL 사용 (실제 사용은 안 됨)
// 런타임에 환경 변수로 대체됨
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// 클라이언트 생성 (빌드 시에는 더미 값 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
