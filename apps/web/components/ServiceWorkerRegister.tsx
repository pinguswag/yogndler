'use client';

import { useEffect } from 'react';

/**
 * PWA 서비스 워커 등록.
 * 모바일(특히 홈 화면 추가)에서 구버전 JS가 캐시되는 문제를 막기 위해
 * network-first 정책의 sw.js를 쓰고, 배포 후 업데이트 시 자동 새로고침합니다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const activateWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });
        await registration.update();
        activateWaitingWorker(registration);

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker(registration);
            }
          });
        });
      } catch {
        // ignore
      }
    };

    void register();

    const checkForUpdates = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        void reg?.update();
        if (reg) activateWaitingWorker(reg);
      });
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForUpdates();
    });

    window.addEventListener('focus', checkForUpdates);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
