'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserSettings } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { getInitialSettings } from '@/lib/initial-settings';

export type SetSettingsOptions = {
  /** true면 디바운스 없이 즉시 DB에 저장 (초기화·사이클 전환 등) */
  immediate?: boolean;
};

const RELOAD_SKIP_MS = 2500;

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const justSavedAtRef = useRef<number>(0);

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
        return false;
      }
      justSavedAtRef.current = Date.now();
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }, []);

  const shouldSkipReloadFromServer = useCallback(() => {
    return Date.now() - justSavedAtRef.current < RELOAD_SKIP_MS;
  }, []);

  const loadSettings = useCallback(async (uid: string, force = false) => {
    if (!force && shouldSkipReloadFromServer()) {
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings_json')
        .eq('user_id', uid)
        .single<{ settings_json: UserSettings }>();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        setSettings(getInitialSettings());
      } else if (data) {
        setSettings(data.settings_json);
      } else {
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
  }, [saveSettingsToDB, shouldSkipReloadFromServer]);

  useEffect(() => {
    const loadUserAndSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;
      setUserId(currentUserId);

      if (user) {
        await loadSettings(user.id, true);
      } else {
        setLoading(false);
      }
    };

    loadUserAndSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        await loadSettings(session.user.id, true);
      } else {
        setUserId(null);
        setSettings(null);
        setLoading(false);
      }
    });

    const handleFocus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await loadSettings(user.id);
      }
    };

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

  const updateSettings = useCallback((
    newSettings: UserSettings | ((prev: UserSettings) => UserSettings),
    options?: SetSettingsOptions
  ) => {
    setSettings((prev) => {
      if (!prev) return prev;

      const updated = typeof newSettings === 'function'
        ? newSettings(prev)
        : newSettings;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (userId) {
        if (options?.immediate) {
          void saveSettingsToDB(userId, updated);
        } else {
          debounceTimerRef.current = setTimeout(() => {
            void saveSettingsToDB(userId, updated);
          }, 500);
        }
      }

      return updated;
    });
  }, [userId, saveSettingsToDB]);

  /** 프로그램 진행(사이클·체크·PR)만 초기화하고 DB에 즉시 반영 */
  const resetProgramProgress = useCallback(async (): Promise<boolean> => {
    if (!settings || !userId) return false;

    const updated: UserSettings = {
      ...settings,
      currentCycle: 1,
      completedSets: {},
      prRecords: {},
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setSettings(updated);
    return saveSettingsToDB(userId, updated);
  }, [settings, userId, saveSettingsToDB]);

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
    resetProgramProgress,
    loading,
    userId
  };
}
