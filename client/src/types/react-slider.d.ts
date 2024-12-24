declare module 'react-slider' {
  import * as React from 'react';

  export interface ReactSliderProps {
    className?: string;
    thumbClassName?: string;
    trackClassName?: string;
    min?: number;
    max?: number;
    step?: number;
    minDistance?: number;
    pearling?: boolean;
    value?: number | number[];
    defaultValue?: number | number[];
    onChange?: (value: number | number[]) => void;
    onAfterChange?: (value: number | number[]) => void;
    renderThumb?: (
      props: React.HTMLAttributes<HTMLDivElement>,
      state: { index: number; valueNow: number; value: number | number[] }
    ) => React.ReactNode;
    renderTrack?: (
      props: React.HTMLAttributes<HTMLDivElement>,
      state: { index: number; value: number[]; className: string }
    ) => React.ReactNode;
    withTracks?: boolean;
    invert?: boolean;
    marks?: number[] | { [key: number]: string | JSX.Element };
    disabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
  }

  const ReactSlider: React.FC<ReactSliderProps>;

  export default ReactSlider;
}
