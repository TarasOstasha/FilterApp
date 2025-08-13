import React, { useState, useEffect, useRef } from 'react';
import ReactSlider from 'react-slider';
import styles from './FilterSidebar.module.scss';
import {
  fetchFilterSidebarData,
  fetchDynamicFilters,
  fetchPriceRange,
  fetchWidthRange,
  fetchHeightRange
} from '../../api';
import { useDebouncedEffect } from '../../utils/useDebouncedEffect';

interface FilterField {
  id: number;
  field_name: string;
  field_type: 'checkbox' | 'range';
  allowed_values: any;
  sort_order: number;
}

interface FilterSidebarProps {
  onFilterChange: (filter: { field: string; value: any }) => void;
  selectedFilters: { [key: string]: string[] };
}

function parseRangeValue(
  field: FilterField,
  currentUnit: 'ft' | 'in' | undefined,
  selectedFilters: { [key: string]: string[] },
  globalRanges: {
    'Product Price': [number, number],
    'Display Width': [number, number],
    'Display Height': [number, number],
  }
): [number, number] {
  const fn = field.field_name;
  const sel = selectedFilters[fn]?.[0];

  if (sel) {
    const [min, max] = sel.split(',').map((x) => parseFloat(x));
    return [Number.isFinite(min) ? min : 0, Number.isFinite(max) ? max : 0];
  }

  if (fn in globalRanges) {
    return globalRanges[fn as keyof typeof globalRanges];
  }

  if (
    typeof field.allowed_values === 'object' &&
    currentUnit &&
    field.allowed_values[currentUnit]
  ) {
    const { min, max } = field.allowed_values[currentUnit];
    return [min, max];
  }

  if (Array.isArray(field.allowed_values)) {
    const arr = field.allowed_values.map((x: any) => parseFloat(x) || 0);
    return [arr[0], arr[arr.length - 1]];
  }
  return [0, 0];
}

// small helpers to prevent unnecessary setState churn
const arraysEqual = (a: number[] = [], b: number[] = []) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onFilterChange,
  selectedFilters
}) => {
  const [filterFields, setFilterFields] = useState<FilterField[]>([]);
  const [unitSelections, setUnitSelections] = useState<{ [k: string]: 'ft' | 'in' }>(
    { 'Display Width': 'in', 'Display Height': 'in' }
  );

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [priceBreakpoints, setPriceBreakpoints] = useState<number[]>([]);
  const priceFetchTimeout = useRef<number>();

  const [globalMinWidth, setGlobalMinWidth] = useState(0);
  const [globalMaxWidth, setGlobalMaxWidth] = useState(0);
  const [globalMinHeight, setGlobalMinHeight] = useState(0);
  const [globalMaxHeight, setGlobalMaxHeight] = useState(0);

  const [widthMin, setWidthMin] = useState(0);
  const [widthMax, setWidthMax] = useState(0);
  const [heightMin, setHeightMin] = useState(0);
  const [heightMax, setHeightMax] = useState(0);

  function handleCheckboxChange(field: string, value: string) {
    onFilterChange({ field, value });
  }

  // keep writing "min,max" string since your parent expects string[]
  function handleRangeSliderChange(fieldName: string, sliderValue: number | number[]) {
    if (Array.isArray(sliderValue) && sliderValue.length === 2) {
      onFilterChange({
        field: fieldName,
        value: `${sliderValue[0]},${sliderValue[1]}`
      });
    }
  }

  // SAFE unit switch (notify parent first, then set our local state)
  function handleUnitSwitch(fieldName: string) {
    const next = (unitSelections[fieldName] || 'in') === 'ft' ? 'in' : 'ft';
    if (fieldName === 'Display Width') {
      onFilterChange({ field: fieldName, value: `${widthMin || globalMinWidth},${widthMax || globalMaxWidth}` });
    } else if (fieldName === 'Display Height') {
      onFilterChange({ field: fieldName, value: `${heightMin || globalMinHeight},${heightMax || globalMaxHeight}` });
    }
    setUnitSelections((prev) => ({ ...prev, [fieldName]: next }));
  }

  // ----- INITIAL GLOBAL DEFAULTS -----
  useEffect(() => {
    (async () => {
      const resGlobalWidth = await fetchWidthRange();
      const gwMin = resGlobalWidth?.data.globalMin || 0;
      const gwMax = resGlobalWidth?.data.globalMax || 0;
      setGlobalMinWidth(gwMin);
      setGlobalMaxWidth(gwMax);

      const resGlobalHeight = await fetchHeightRange();
      const ghMin = resGlobalHeight?.data.globalMin || 0;
      const ghMax = resGlobalHeight?.data.globalMax || 0;
      setGlobalMinHeight(ghMin);
      setGlobalMaxHeight(ghMax);
    })();
  }, []);

  // ----- LIVE FILTERED WIDTH RANGE -----
  useDebouncedEffect(
    () => {
      (async () => {
        try {
          const otherFilters = Object.keys(selectedFilters)
            .filter((k) => k !== 'Display Width')
            .reduce<Record<string, string>>(
              (acc, k) => ((acc[k] = selectedFilters[k].join(',')), acc),
              {}
            );
          const res = await fetchWidthRange(otherFilters);
          const mn = res?.data.min ?? 0;
          const mx = res?.data.max ?? 0;
          setWidthMin((prev) => (prev === mn ? prev : mn));
          setWidthMax((prev) => (prev === mx ? prev : mx));
        } catch (err) {
          console.error('Error fetching width range:', err);
        }
      })();
    },
    [selectedFilters],
    500
  );

  // ----- LIVE FILTERED HEIGHT RANGE -----
  useDebouncedEffect(
    () => {
      (async () => {
        try {
          const otherFilters = Object.keys(selectedFilters)
            .filter((k) => k !== 'Display Height')
            .reduce<Record<string, string>>(
              (acc, k) => ((acc[k] = selectedFilters[k].join(',')), acc),
              {}
            );
          const res = await fetchHeightRange(otherFilters);
          const mn = res?.data.min ?? 0;
          const mx = res?.data.max ?? 0;
          setHeightMin((prev) => (prev === mn ? prev : mn));
          setHeightMax((prev) => (prev === mx ? prev : mx));
        } catch (err) {
          console.error('Error fetching height range:', err);
        }
      })();
    },
    [selectedFilters],
    300
  );

  // ----- MAIN: NORMALIZE & FETCH FIELDS + PRICE -----
  // IMPORTANT: this effect depends ONLY on selectedFilters to avoid loops.
  useEffect(() => {
    const parsePair = (s?: string) => {
      if (!s) return [NaN, NaN] as const;
      const [a, b] = s.split(',').map(Number);
      return [a, b] as const;
    };
    const same = (x: number, y: number) => Math.abs(x - y) < 1e-6;

    const noFiltersAtAll = Object.keys(selectedFilters).length === 0;

    const bpLast = priceBreakpoints?.[priceBreakpoints.length - 1] ?? 0;
    const priceRailMin = noFiltersAtAll ? 0 : priceMin;
    const priceRailMax = noFiltersAtAll ? (priceMax > 0 ? priceMax : bpLast) : priceMax;

    const widthRailMin  = widthMin  || globalMinWidth;
    const widthRailMax  = widthMax  || globalMaxWidth;
    const heightRailMin = heightMin || globalMinHeight;
    const heightRailMax = heightMax || globalMaxHeight;

    const normalized: Record<string, string[]> = {};
    for (const [k, arr] of Object.entries(selectedFilters)) {
      if (!Array.isArray(arr) || arr.length === 0) continue;

      if (k === 'Product Price') {
        const [mn, mx] = parsePair(arr[0]);
        if (same(mn, priceRailMin) && same(mx, priceRailMax)) continue;
      } else if (k === 'Display Width') {
        const [mn, mx] = parsePair(arr[0]); // inches
        if (same(mn, widthRailMin) && same(mx, widthRailMax)) continue;
      } else if (k === 'Display Height') {
        const [mn, mx] = parsePair(arr[0]); // inches
        if (same(mn, heightRailMin) && same(mx, heightRailMax)) continue;
      }
      normalized[k] = arr;
    }

    const keys = Object.keys(normalized);
    const nonPrice = keys.filter((k) => k !== 'Product Price');

    window.clearTimeout(priceFetchTimeout.current);
    priceFetchTimeout.current = window.setTimeout(() => {
      // Filters sidebar (fields)
      if (keys.length === 0) {
        fetchFilterSidebarData()
          .then((r) => {
            const next = r?.data ?? [];
            setFilterFields((prev) =>
              prev.length === next.length &&
              prev.every((p, i) =>
                p.id === next[i].id &&
                p.field_name === next[i].field_name &&
                p.field_type === next[i].field_type
              )
                ? prev
                : next
            );
          })
          .catch(() => console.warn('Static reload failed'));
      } else if (nonPrice.length > 0) {
        const params = Object.fromEntries(
          nonPrice.map((k) => [k, normalized[k].join(',')])
        );

        fetchDynamicFilters(params)
          .then((r) => {
            const d = r?.data;
            if (Array.isArray(d)) {
              const next: FilterField[] = d.map((f: any) => ({
                id: f.filter_field_id,
                field_name: f.field_name,
                field_type: f.field_type,
                allowed_values: f.values,
                sort_order: f.sort_order ?? 0,
              }));
              setFilterFields((prev) =>
                prev.length === next.length &&
                prev.every((p, i) =>
                  p.id === next[i].id &&
                  p.field_name === next[i].field_name &&
                  p.field_type === next[i].field_type
                )
                  ? prev
                  : next
              );
            }
          })
          .catch(() =>
            fetchFilterSidebarData().then((r) => setFilterFields(r?.data ?? []))
          );
      }

      // Price range (depends on the non-price filters)
      const priceParams =
        nonPrice.length > 0
          ? Object.fromEntries(nonPrice.map((k) => [k, normalized[k].join(',')]))
          : undefined;

      fetchPriceRange(priceParams)
        .then((pr) => {
          if (pr?.data) {
            setPriceMin((prev) => (prev === pr.data.min ? prev : pr.data.min));
            setPriceMax((prev) => (prev === pr.data.max ? prev : pr.data.max));
            const nextBps: number[] = pr.data.breakpoints || [];
            setPriceBreakpoints((prev) =>
              arraysEqual(prev, nextBps) ? prev : nextBps
            );
          }
        })
        .catch(() => console.warn('Filtered price fetch failed', priceParams));
    }, 500);

    return () => window.clearTimeout(priceFetchTimeout.current);
    // ⚠️ Only selectedFilters here to avoid fetch loops
  }, [selectedFilters]);

  return (
    <div className={styles.sidebar} style={{ width: '250px' }}>
      {filterFields.map((ff) => {
        const { field_name: fn, field_type: ft } = ff;

        if (ft === 'checkbox') {
          return (
            <div key={ff.id} className={styles['filter-section']}>
              <h4>{fn}</h4>
              <ul className={styles['filter-list']}>
                {(ff.allowed_values as string[]).map((val, i) => (
                  <li key={i} className={styles['filter-item']}>
                    <label>
                      <input
                        type="checkbox"
                        value={val}
                        checked={selectedFilters[fn]?.includes(val) || false}
                        onChange={() => handleCheckboxChange(fn, val)}
                        className={styles['sidebar-checkbox-input']}
                      />
                      {val}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (ft === 'range') {
          const [curMinRaw, curMaxRaw] = parseRangeValue(
            ff,
            unitSelections[fn],
            selectedFilters,
            {
              'Product Price': [priceMin, priceMax],
              'Display Width': [widthMin, widthMax],
              'Display Height': [heightMin, heightMax],
            }
          );

          // ---------- Product Price ----------
          // if (fn === 'Product Price') {
          //   if (!priceBreakpoints?.length) {
          //     return (
          //       <div key={ff.id} className={styles['filter-section']}>
          //         <h4>{fn}</h4>
          //       </div>
          //     );
          //   }

          //   const bpLast = priceBreakpoints[priceBreakpoints.length - 1];
          //   const noFiltersAtAll = Object.keys(selectedFilters).length === 0;

          //   const railMinVal = noFiltersAtAll ? 0 : priceMin;
          //   const railMaxVal = noFiltersAtAll
          //     ? (priceMax > 0 ? priceMax : bpLast)
          //     : priceMax;

          //   let effMin = Number.isFinite(curMinRaw) ? curMinRaw : railMinVal;
          //   let effMax = Number.isFinite(curMaxRaw) ? curMaxRaw : railMaxVal;

          //   effMin = clamp(effMin, railMinVal, railMaxVal);
          //   effMax = clamp(effMax, railMinVal, railMaxVal);
          //   if (effMin > effMax) { effMin = railMinVal; effMax = railMaxVal; }

          //   const firstIdxGE0 = priceBreakpoints.findIndex(v => v >= railMinVal);
          //   const firstIdxGE  = firstIdxGE0 === -1 ? 0 : firstIdxGE0;
          //   const lastIdxLE   = (() => {
          //     let idx = priceBreakpoints.length - 1;
          //     for (let i = priceBreakpoints.length - 1; i >= 0; i--) {
          //       if (priceBreakpoints[i] <= railMaxVal) { idx = i; break; }
          //     }
          //     return idx;
          //   })();

          //   const idxFor = (v: number) => {
          //     const ge = priceBreakpoints.findIndex(x => x >= v);
          //     if (ge === -1) return priceBreakpoints.length - 1;
          //     return priceBreakpoints[ge] === v ? ge : Math.max(0, ge - 1);
          //   };

          //   let loIdx = Math.max(firstIdxGE, idxFor(effMin));
          //   let hiIdx = Math.min(lastIdxLE,  idxFor(effMax));
          //   if (loIdx > hiIdx) { loIdx = firstIdxGE; hiIdx = lastIdxLE; }

          //   return (
          //     <div key={ff.id} className={styles['filter-section']}>
          //       <h4>{fn}</h4>
          //       <div className={styles['range-slider-container']}>
          //         <ReactSlider
          //           className={styles['range-slider']}
          //           thumbClassName={styles['range-slider-thumb']}
          //           trackClassName={styles['range-slider-track']}
          //           min={firstIdxGE}
          //           max={lastIdxLE}
          //           step={1}
          //           value={[loIdx, hiIdx]}
          //           onChange={(indices) => {
          //             if (!Array.isArray(indices)) return;
          //             const a = clamp(indices[0], firstIdxGE, lastIdxLE);
          //             const b = clamp(indices[1], firstIdxGE, lastIdxLE);
          //             const [minIdx, maxIdx] = a <= b ? [a, b] : [firstIdxGE, lastIdxLE];
          //             handleRangeSliderChange(fn, [
          //               priceBreakpoints[minIdx],
          //               priceBreakpoints[maxIdx],
          //             ]);
          //           }}
          //           pearling
          //           withTracks
          //           minDistance={1}
          //         />
          //         <div className={styles['range-values']}>
          //           <input
          //             type="text"
          //             min={railMinVal}
          //             max={railMaxVal}
          //             value={effMin}
          //             onChange={(e) => {
          //               const raw = Number(e.target.value);
          //               if (Number.isNaN(raw)) return;
          //               const v = clamp(raw, railMinVal, railMaxVal);
          //               const ge = priceBreakpoints.findIndex(x => x >= v);
          //               const idx = ge === -1 ? priceBreakpoints.length - 1 : (priceBreakpoints[ge] === v ? ge : Math.max(0, ge - 1));
          //               handleRangeSliderChange(fn, [priceBreakpoints[idx], effMax]);
          //             }}
          //             style={{ width: 80, marginRight: 8 }}
          //           />
          //           <input
          //             type="text"
          //             min={railMinVal}
          //             max={railMaxVal}
          //             value={effMax}
          //             onChange={(e) => {
          //               const raw = Number(e.target.value);
          //               if (Number.isNaN(raw)) return;
          //               const v = clamp(raw, railMinVal, railMaxVal);
          //               const ge = priceBreakpoints.findIndex(x => x >= v);
          //               const idx = ge === -1 ? priceBreakpoints.length - 1 : (priceBreakpoints[ge] === v ? ge : Math.max(0, ge - 1));
          //               handleRangeSliderChange(fn, [effMin, priceBreakpoints[idx]]);
          //             }}
          //             style={{ width: 80 }}
          //           />
          //         </div>
          //       </div>
          //     </div>
          //   );
          // }


          // *************************
          // ---------- Product Price (visible on first load; snaps to breakpoints) ----------
          if (fn === 'Product Price') {
            // need breakpoints to draw the slider at all
            if (!priceBreakpoints || priceBreakpoints.length === 0) {
              return (
                <div key={ff.id} className={styles['filter-section']}>
                  <h4>{fn}</h4>
                </div>
              );
            }

            const bpLast = priceBreakpoints[priceBreakpoints.length - 1];

            // If API hasn't returned real min/max yet (both 0), show a visible fallback rail 0..bpLast
            const hasRealRange = priceMax > 0 && priceMax >= priceMin;
            const railMin = hasRealRange ? priceMin : 0;
            const railMax = hasRealRange ? priceMax : bpLast;

            // show current (selection or rail)
            let effMin = Number.isFinite(curMinRaw) ? curMinRaw : railMin;
            let effMax = Number.isFinite(curMaxRaw) ? curMaxRaw : railMax;
            if (effMin > effMax) { effMin = railMin; effMax = railMax; }

            // Build the list of *allowed* steps inside the rail
            const railBps = priceBreakpoints.filter(v => v >= railMin && v <= railMax);
            // Safety: if rail clips between two breakpoints, still force at least the ends
            const safeRailBps = railBps.length ? railBps : [railMin, railMax];

            // helpers on rail breakpoints
            const lastIdxLE = (v: number) => {
              let idx = 0;
              for (let i = 0; i < safeRailBps.length; i++) {
                if (safeRailBps[i] <= v) idx = i; else break;
              }
              return idx;
            };
            const clampIdx = (i: number) =>
              Math.max(0, Math.min(i, safeRailBps.length - 1));

            // slider thumbs are indices into safeRailBps
            let loIdx = clampIdx(lastIdxLE(effMin));
            let hiIdx = clampIdx(lastIdxLE(effMax));
            if (loIdx > hiIdx) { loIdx = 0; hiIdx = safeRailBps.length - 1; }

            return (
              <div key={ff.id} className={styles['filter-section']}>
                <h4>{fn}</h4>

                <div className={styles['range-slider-container']}>
                  <ReactSlider
                    className={styles['range-slider']}
                    thumbClassName={styles['range-slider-thumb']}
                    trackClassName={styles['range-slider-track']}
                    min={0}
                    max={safeRailBps.length - 1}
                    step={1}
                    value={[loIdx, hiIdx]}
                    onChange={(indices) => {
                      if (!Array.isArray(indices)) return;
                      const a = clampIdx(indices[0]);
                      const b = clampIdx(indices[1]);
                      const [minIdx, maxIdx] = a <= b ? [a, b] : [0, safeRailBps.length - 1];
                      // send snapped breakpoint values
                      handleRangeSliderChange(fn, [safeRailBps[minIdx], safeRailBps[maxIdx]]);
                    }}
                    pearling
                    withTracks
                    minDistance={1}
                  />

                  <div className={styles['range-values']}>
                    {/* Inputs show real values; typing snaps to nearest allowed breakpoint within rails */}
                    <input
                      type="text"
                      min={railMin}
                      max={railMax}
                      value={effMin}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        const clamped = Math.max(railMin, Math.min(raw, railMax));
                        const i = lastIdxLE(clamped);
                        handleRangeSliderChange(fn, [safeRailBps[i], effMax]);
                      }}
                      style={{ width: 80, marginRight: 8 }}
                    />
                    <input
                      type="text"
                      min={railMin}
                      max={railMax}
                      value={effMax}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        const clamped = Math.max(railMin, Math.min(raw, railMax));
                        const i = lastIdxLE(clamped);
                        handleRangeSliderChange(fn, [effMin, safeRailBps[i]]);
                      }}
                      style={{ width: 80 }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          // *************************

          // ---------- Display Width ----------
          if (fn === 'Display Width') {
            const unit = unitSelections[fn] || 'in';
            const factor = unit === 'ft' ? 12 : 1;

            const toUi = (inch: number) =>
              unit === 'in' ? inch : Math.max(1, Math.round(inch / factor));
            const fromUi = (ui: number) => ui * factor;

            const railMinIn = widthMin || globalMinWidth;
            const railMaxIn = widthMax || globalMaxWidth;

            const uiMin = toUi(railMinIn);
            const uiMax = toUi(railMaxIn);

            const isFrozen = uiMin >= uiMax;

            const selMinIn = Number.isFinite(curMinRaw) ? curMinRaw : railMinIn;
            const selMaxIn = Number.isFinite(curMaxRaw) ? curMaxRaw : railMaxIn;

            const lo = clamp(toUi(selMinIn), uiMin, uiMax);
            const hi = clamp(toUi(selMaxIn), uiMin, uiMax);

            return (
              <div key={ff.id} className={styles['filter-section']}>
                <h4>{fn}</h4>
                <div className={styles['unit-switcher']}>
                  <button type="button" onClick={() => handleUnitSwitch(fn)}>
                    Switch to {unit === 'ft' ? 'inches' : 'feet'}
                  </button>
                </div>
                <ReactSlider
                  className={styles['range-slider']}
                  thumbClassName={styles['range-slider-thumb']}
                  trackClassName={styles['range-slider-track']}
                  min={uiMin}
                  max={uiMax}
                  step={1}
                  value={[lo, hi]}
                  disabled={isFrozen}
                  pearling={!isFrozen}
                  withTracks
                  minDistance={isFrozen ? 0 : 1}
                  onChange={(vals) => {
                    if (isFrozen || !Array.isArray(vals)) return;
                    const a = clamp(vals[0], uiMin, uiMax);
                    const b = clamp(vals[1], uiMin, uiMax);
                    const [minUi, maxUi] = a <= b ? [a, b] : [uiMin, uiMax];
                    handleRangeSliderChange(fn, [fromUi(minUi), fromUi(maxUi)]);
                  }}
                />
                <div className={styles['range-values']}>
                  <input
                    type="text"
                    min={uiMin}
                    max={uiMax}
                    value={unit === 'ft' ? lo : clamp(selMinIn, railMinIn, railMaxIn)}
                    disabled={isFrozen}
                    onChange={(e) => {
                      if (isFrozen) return;
                      const raw = Number(e.target.value);
                      if (Number.isNaN(raw)) return;
                      const v = clamp(raw, uiMin, uiMax);
                      handleRangeSliderChange(fn, [
                        unit === 'ft' ? fromUi(v) : v,
                        unit === 'ft' ? fromUi(hi) : clamp(selMaxIn, railMinIn, railMaxIn),
                      ]);
                    }}
                    style={{ width: 80, marginRight: 8 }}
                  />
                  <input
                    type="text"
                    min={uiMin}
                    max={uiMax}
                    value={unit === 'ft' ? hi : clamp(selMaxIn, railMinIn, railMaxIn)}
                    disabled={isFrozen}
                    onChange={(e) => {
                      if (isFrozen) return;
                      const raw = Number(e.target.value);
                      if (Number.isNaN(raw)) return;
                      const v = clamp(raw, uiMin, uiMax);
                      handleRangeSliderChange(fn, [
                        unit === 'ft' ? fromUi(lo) : clamp(selMinIn, railMinIn, railMaxIn),
                        unit === 'ft' ? fromUi(v) : v,
                      ]);
                    }}
                    style={{ width: 80 }}
                  />
                </div>
                {isFrozen && (
                  <div className={styles['frozenHint']}>
                    Only products at width {unit === 'ft' ? `${uiMin} ft` : `${railMinIn} in`} match other filters.
                  </div>
                )}
              </div>
            );
          }

          // ---------- Display Height ----------
          if (fn === 'Display Height') {
            const unit = unitSelections[fn] || 'in';
            const factor = unit === 'ft' ? 12 : 1;

            const toUi = (inch: number) =>
              unit === 'in' ? inch : Math.max(1, Math.round(inch / factor));
            const fromUi = (ui: number) => ui * factor;

            const railMinIn = heightMin || globalMinHeight;
            const railMaxIn = heightMax || globalMaxHeight;

            const minUi = toUi(railMinIn);
            const maxUi = toUi(railMaxIn);

            const isFrozen = minUi >= maxUi;

            const selMinIn = Number.isFinite(curMinRaw) ? curMinRaw : railMinIn;
            const selMaxIn = Number.isFinite(curMaxRaw) ? curMaxRaw : railMaxIn;

            const lo = clamp(toUi(selMinIn), minUi, maxUi);
            const hi = clamp(toUi(selMaxIn), minUi, maxUi);

            return (
              <div key={ff.id} className={styles['filter-section']}>
                <h4>{fn}</h4>
                <div className={styles['unit-switcher']}>
                  <button type="button" onClick={() => handleUnitSwitch(fn)}>
                    Switch to {unit === 'ft' ? 'inches' : 'feet'}
                  </button>
                </div>
                <ReactSlider
                  className={styles['range-slider']}
                  thumbClassName={styles['range-slider-thumb']}
                  trackClassName={styles['range-slider-track']}
                  min={minUi}
                  max={maxUi}
                  step={1}
                  value={[lo, hi]}
                  disabled={isFrozen}
                  pearling={!isFrozen}
                  withTracks
                  minDistance={isFrozen ? 0 : 1}
                  onChange={vals => {
                    if (isFrozen || !Array.isArray(vals)) return;
                    const a = clamp(vals[0], minUi, maxUi);
                    const b = clamp(vals[1], minUi, maxUi);
                    const [minUiVal, maxUiVal] = a <= b ? [a, b] : [minUi, maxUi];
                    handleRangeSliderChange(fn, [fromUi(minUiVal), fromUi(maxUiVal)]);
                  }}
                />
                <div className={styles['range-values']}>
                  <input
                    type="text"
                    min={minUi}
                    max={maxUi}
                    value={unit === 'ft' ? lo : clamp(selMinIn, railMinIn, railMaxIn)}
                    disabled={isFrozen}
                    onChange={e => {
                      if (isFrozen) return;
                      const raw = Number(e.target.value);
                      if (Number.isNaN(raw)) return;
                      const v = clamp(raw, minUi, maxUi);
                      handleRangeSliderChange(fn, [
                        unit === 'ft' ? fromUi(v) : v,
                        unit === 'ft' ? fromUi(hi) : clamp(selMaxIn, railMinIn, railMaxIn),
                      ]);
                    }}
                    style={{ width: 80, marginRight: 8 }}
                  />
                  <input
                    type="text"
                    min={minUi}
                    max={maxUi}
                    value={unit === 'ft' ? hi : clamp(selMaxIn, railMinIn, railMaxIn)}
                    disabled={isFrozen}
                    onChange={e => {
                      if (isFrozen) return;
                      const raw = Number(e.target.value);
                      if (Number.isNaN(raw)) return;
                      const v = clamp(raw, minUi, maxUi);
                      handleRangeSliderChange(fn, [
                        unit === 'ft' ? fromUi(lo) : clamp(selMinIn, railMinIn, railMaxIn),
                        unit === 'ft' ? fromUi(v) : v,
                      ]);
                    }}
                    style={{ width: 80 }}
                  />
                </div>
                {isFrozen && (
                  <div className={styles['frozenHint']}>
                    Only products at height {unit === 'ft' ? `${minUi} ft` : `${railMinIn} in`} match other filters.
                  </div>
                )}
              </div>
            );
          }

          return null;
        }

        return null;
      })}
    </div>
  );
};

export default FilterSidebar;
