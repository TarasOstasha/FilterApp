import { RefObject, useEffect, useState } from 'react';

export const CHROME_MIN_SKELETON_MS = 300;
export const CHROME_FADE_MS = 250;

export const waitForImages = (root: HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll('img'));

  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }

          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })
    )
  ).then(() => undefined);
};

export const useChromeReveal = (
  stylesReady: boolean,
  rootRef: RefObject<HTMLElement | null>
) => {
  const [contentReady, setContentReady] = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(true);

  useEffect(() => {
    if (!stylesReady || !rootRef.current) {
      return;
    }

    let cancelled = false;
    const mountTime = Date.now();

    const reveal = async () => {
      await waitForImages(rootRef.current as HTMLElement);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const elapsed = Date.now() - mountTime;
      const remaining = Math.max(0, CHROME_MIN_SKELETON_MS - elapsed);

      window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setContentReady(true);
        window.setTimeout(() => {
          if (!cancelled) {
            setSkeletonVisible(false);
          }
        }, CHROME_FADE_MS);
      }, remaining);
    };

    reveal();

    return () => {
      cancelled = true;
    };
  }, [stylesReady, rootRef]);

  return { contentReady, skeletonVisible };
};
