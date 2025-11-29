'use client';

import { useEffect } from 'react';

export function useEffectOnce(effect) {
  // Ensure the effect only runs on the client and only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
