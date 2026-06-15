import React, { createContext, useContext, useMemo, useState } from 'react';

interface VolusionChromeContextValue {
  stylesReady: boolean;
  setStylesReady: (ready: boolean) => void;
}

const VolusionChromeContext = createContext<VolusionChromeContextValue | null>(null);

export const VolusionChromeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stylesReady, setStylesReady] = useState(false);

  const value = useMemo(
    () => ({ stylesReady, setStylesReady }),
    [stylesReady]
  );

  return (
    <VolusionChromeContext.Provider value={value}>
      {children}
    </VolusionChromeContext.Provider>
  );
};

export const useVolusionChrome = (): VolusionChromeContextValue => {
  const ctx = useContext(VolusionChromeContext);
  if (!ctx) {
    throw new Error('useVolusionChrome must be used within VolusionChromeProvider');
  }
  return ctx;
};
