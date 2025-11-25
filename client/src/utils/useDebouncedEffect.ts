// hooks/useDebouncedEffect.ts
import { useEffect, useRef } from 'react';

export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: any[],
  delayMs: number
) {
  const handler = useRef<number>();

  useEffect(() => {
    // schedule
    handler.current = window.setTimeout(() => {
      effect();
    }, delayMs);

    return () => {
      // cleanup on dep change / unmount
      if (handler.current) {
        clearTimeout(handler.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);
}
