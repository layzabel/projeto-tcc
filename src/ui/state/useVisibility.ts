'use client';

import { useSyncExternalStore } from 'react';
import { isVisible, subscribeVisibility } from '../../platform/visibility';

export function useVisibility(): boolean {
  return useSyncExternalStore(subscribeVisibility, isVisible, () => true);
}
