'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../pwa/register';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    const container = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
    void registerServiceWorker(container, process.env.NODE_ENV === 'production');
  }, []);
  return null;
}
