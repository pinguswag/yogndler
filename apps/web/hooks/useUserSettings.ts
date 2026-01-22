'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserSettings } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { getInitialSettings } from '@/lib/initial-settings';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveSettingsToDB = useCallback(async (uid: string, settingsToSave: UserSettings) => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: uid,
          settings_json: settingsToSave,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving settings:', error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  const loadSettings = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings_json')
        .eq('user_id', uid)
        .single<{ settings_json: UserSettings }>();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading settings:', error);
        setSettings(getInitialSettings());
      } else if (data) {
        setSettings(data.settings_json);
      } else {
        // No settings found, create initial settings
        const initialSettings = getInitialSettings();
        await saveSettingsToDB(uid, initialSettings);
        setSettings(initialSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(getInitialSettings());
    } finally {
      setLoading(false);
    }
  }, [saveSettingsToDB]);

  // Load user and settings
  useEffect(() => {
    const loadUserAndSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;
      setUserId(currentUserId);
      
      if (user) {
        await loadSettings(user.id);
      } else {
        setLoading(false);
      }
    };

    // 초기 로드
    loadUserAndSettings();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        await loadSettings(session.user.id);
      } else {
        setUserId(null);
        setSettings(null);
        setLoading(false);
      }
    });

    // 페이지 포커스 시 데이터 다시 로드 (재접속 시 자동 로딩)
    const handleFocus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await loadSettings(user.id);
      }
    };

    // 페이지 가시성 변경 시 확인
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await loadSettings(user.id);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadSettings]);

  const updateSettings = useCallback((newSettings: UserSettings | ((prev: UserSettings) => UserSettings)) => {
    setSettings((prev) => {
      if (!prev) return prev;
      
      const updated = typeof newSettings === 'function' 
        ? newSettings(prev) 
        : newSettings;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      if (userId) {
        debounceTimerRef.current = setTimeout(() => {
          saveSettingsToDB(userId, updated);
        }, 500);
      }

      return updated;
    });
  }, [userId, saveSettingsToDB]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    settings,
    setSettings: updateSettings,
    loading,
    userId
  };
}
