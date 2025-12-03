import React, { useState, useEffect, useRef } from 'react';
import ReactSlider from 'react-slider';
import { ClipLoader } from 'react-spinners';
import styles from './FilterSidebar.module.scss';
import {
  fetchFilterSidebarData,
  fetchDynamicFilters,
  fetchPriceRange,
  fetchWidthRange,
  fetchHeightRange
} from '../../api';
import { useDebouncedEffect } from '../../utils/useDebouncedEffect';
import { getCategoryIdFromPath } from '../../utils/helpers';

interface FilterField {
  id: number;
  field_name: string;
  field_type: 'checkbox' | 'range';
  allowed_values: any;
  sort_order: number;
}

interface FilterSidebarProps {
  onFilterChange: (filter: { field: string; value: any }) => void;
  selectedFilters: { [key: string]: string[] | undefined }; // allow undefined safely
  isClearingFilters?: boolean;
  loading?: boolean;
}

function parseRangeValue(
  field: FilterField,
  currentUnit: 'ft' | 'in' | undefined,
  selectedFilters: { [key: string]: string[] | undefined },
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

// ---------- helpers ----------
const arraysEqual = (a: number[] = [], b: number[] = []) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

// Non-filter query keys we should ignore when building params
const NON_FILTER_QUERY_KEYS = new Set([
  'limit', 'offset', 'page', 'itemsPerPage', 'items',
  'sort', 'sortBy', 'order', 'dir', 'q', 'query', 'search'
]);

function sanitizeFilters(raw: Record<string, string[] | undefined> = {}) {
  // keep only array-valued filter keys and skip list above
  return Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => !NON_FILTER_QUERY_KEYS.has(k) && Array.isArray(v))
  ) as Record<string, string[]>;
}

function buildParams(
  raw: Record<string, string[] | undefined>,
  omitKey?: string
): Record<string, string> {
  const safe = sanitizeFilters(raw);
  return Object.fromEntries(
    Object.entries(safe)
      .filter(([k, v]) => k !== omitKey && v && v.length > 0)
      .map(([k, v]) => [k, v.join(',')])
  );
}
// --------------------------------
// Helper: extract the digits right before ".htm" at the end of the path
// const getCategoryIdFromPath = (): string => {
//   try {
//     const path = window.location.pathname; 
//     const m = path.match(/\/(\d+)\.htm(?:$|\?)/i);
//     return m ? m[1] : '51'; 
//   } catch {
//     return '1692'; 
//   }
// };
const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onFilterChange,
  selectedFilters,
  isClearingFilters = false,
  loading = false
}) => {
  const [filterFields, setFilterFields] = useState<FilterField[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
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
  
  // Track if we've initialized from filterFields to prevent overwrites
  const initializedFromFilterFields = useRef(false);

  // Reset width/height to category-specific values when all filters are cleared
  useEffect(() => {
    const safeFilters = sanitizeFilters(selectedFilters);
    const hasFilters = Object.keys(safeFilters).length > 0;
    
    // Only reset if we've initialized AND there are no filters
    if (!hasFilters && initializedFromFilterFields.current) {
      // Fetch category-specific ranges when filters are cleared
      (async () => {
        try {
          const catId = getCategoryIdFromPath();
          
          // Fetch category-specific width range
          const resWidth = await fetchWidthRange({}, catId);
          if (resWidth?.data) {
            setWidthMin(resWidth.data.min || resWidth.data.globalMin || globalMinWidth);
            setWidthMax(resWidth.data.max || resWidth.data.globalMax || globalMaxWidth);
          }
          
          // Fetch category-specific height range
          const resHeight = await fetchHeightRange({}, catId);
          if (resHeight?.data) {
            setHeightMin(resHeight.data.min || resHeight.data.globalMin || globalMinHeight);
            setHeightMax(resHeight.data.max || resHeight.data.globalMax || globalMaxHeight);
          }
        } catch (err) {
          console.error('Error resetting width/height ranges:', err);
          // Fallback to global values on error
          if (globalMinWidth > 0 || globalMaxWidth > 0) {
            setWidthMin(globalMinWidth);
            setWidthMax(globalMaxWidth);
          }
          if (globalMinHeight > 0 || globalMaxHeight > 0) {
            setHeightMin(globalMinHeight);
            setHeightMax(globalMaxHeight);
          }
        }
      })();
    }
  }, [selectedFilters, globalMinWidth, globalMaxWidth, globalMinHeight, globalMaxHeight]);

  function handleCheckboxChange(field: string, value: string) {
    onFilterChange({ field, value });
  }

  function handleRangeSliderChange(fieldName: string, sliderValue: number | number[]) {
    if (Array.isArray(sliderValue) && sliderValue.length === 2) {
      onFilterChange({
        field: fieldName,
        value: `${sliderValue[0]},${sliderValue[1]}`
      });
    }
  }

  function handleUnitSwitch(fieldName: string) {
    const next = (unitSelections[fieldName] || 'in') === 'ft' ? 'in' : 'ft';
    
    // Simply toggle the unit - don't call onFilterChange
    // The values are stored in inches in the backend, and the UI conversion 
    // is handled by toUi/fromUi functions in the render logic
    setUnitSelections((prev) => ({ ...prev, [fieldName]: next }));
  }

  // ----- INITIAL GLOBAL DEFAULTS -----
  useEffect(() => {
    (async () => {
      const resGlobalWidth = await fetchWidthRange();
      setGlobalMinWidth(resGlobalWidth?.data.globalMin || 0);
      setGlobalMaxWidth(resGlobalWidth?.data.globalMax || 0);

      const resGlobalHeight = await fetchHeightRange();
      setGlobalMinHeight(resGlobalHeight?.data.globalMin || 0);
      setGlobalMaxHeight(resGlobalHeight?.data.globalMax || 0);
    })();
  }, []);

  // ----- INITIALIZE RANGES FROM FILTER FIELDS ON FIRST LOAD -----
  useEffect(() => {
    // Only initialize once when filter fields first load
    if (filterFields.length === 0 || initializedFromFilterFields.current) return;

    const priceField = filterFields.find(f => f.field_name === 'Product Price');
    if (priceField && Array.isArray(priceField.allowed_values) && priceField.allowed_values.length > 0) {
      const values = priceField.allowed_values.map((x: any) => parseFloat(x) || 0);
      setPriceMin(values[0]);
      setPriceMax(values[values.length - 1]);
      setPriceBreakpoints(values);
      console.log('Initialized price from filterFields:', values[0], '-', values[values.length - 1]);
    }

    const widthField = filterFields.find(f => f.field_name === 'Display Width');
    if (widthField && Array.isArray(widthField.allowed_values) && widthField.allowed_values.length > 0) {
      const values = widthField.allowed_values.map((x: any) => parseFloat(x) || 0);
      setWidthMin(values[0]);
      setWidthMax(values[values.length - 1]);
      console.log('Initialized width from filterFields:', values[0], '-', values[values.length - 1]);
    }

    const heightField = filterFields.find(f => f.field_name === 'Display Height');
    if (heightField && Array.isArray(heightField.allowed_values) && heightField.allowed_values.length > 0) {
      const values = heightField.allowed_values.map((x: any) => parseFloat(x) || 0);
      setHeightMin(values[0]);
      setHeightMax(values[values.length - 1]);
      console.log('Initialized height from filterFields:', values[0], '-', values[values.length - 1]);
    }

    // Mark as initialized to prevent future overwrites
    initializedFromFilterFields.current = true;
  }, [filterFields]);

  // ----- LIVE FILTERED WIDTH RANGE -----
  useDebouncedEffect(
    () => {
      // Don't fetch if we haven't initialized, OR if there are no filters applied
      if (!initializedFromFilterFields.current) return;
      
      const safeFilters = sanitizeFilters(selectedFilters);
      const hasFilters = Object.keys(safeFilters).length > 0;
      if (!hasFilters) return; // Don't fetch on initial load
      
      (async () => {
        try {
          const params = buildParams(selectedFilters, 'Display Width');
          const catId = getCategoryIdFromPath();
          const res = await fetchWidthRange(params, catId);
          const mn = res?.data?.min ?? 0;
          const mx = res?.data?.max ?? 0;
          setWidthMin((prev) => (prev === mn ? prev : mn));
          setWidthMax((prev) => (prev === mx ? prev : mx));
        } catch (err) {
          console.error('Error fetching width range:', err);
        }
      })();
    },
    [selectedFilters],
    800
  );

  // ----- LIVE FILTERED HEIGHT RANGE -----
  useDebouncedEffect(
    () => {
      // Don't fetch if we haven't initialized, OR if there are no filters applied
      if (!initializedFromFilterFields.current) return;
      
      const safeFilters = sanitizeFilters(selectedFilters);
      const hasFilters = Object.keys(safeFilters).length > 0;
      if (!hasFilters) return; // Don't fetch on initial load
      
      (async () => {
        try {
          const params = buildParams(selectedFilters, 'Display Height');
          const catId = getCategoryIdFromPath();
          const res = await fetchHeightRange(params, catId);
          const mn = res?.data?.min ?? 0;
          const mx = res?.data?.max ?? 0;
          setHeightMin((prev) => (prev === mn ? prev : mn));
          setHeightMax((prev) => (prev === mx ? prev : mx));
        } catch (err) {
          console.error('Error fetching height range:', err);
        }
      })();
    },
    [selectedFilters],
    800
  );

  // ----- MAIN: FETCH FIELDS + PRICE (safe) -----
  useEffect(() => {
    const parsePair = (s?: string) => {
      if (!s) return [NaN, NaN] as const;
      const [a, b] = s.split(',').map(Number);
      return [a, b] as const;
    };
    const same = (x: number, y: number) => Math.abs(x - y) < 1e-6;

    const safeFilters = sanitizeFilters(selectedFilters);
    const noFiltersAtAll = Object.keys(safeFilters).length === 0;

    const bpLast = priceBreakpoints?.[priceBreakpoints.length - 1] ?? 0;
    const priceRailMin = noFiltersAtAll ? 0 : priceMin;
    const priceRailMax = noFiltersAtAll ? (priceMax > 0 ? priceMax : bpLast) : priceMax;

    const widthRailMin  = widthMin  || globalMinWidth;
    const widthRailMax  = widthMax  || globalMaxWidth;
    const heightRailMin = heightMin || globalMinHeight;
    const heightRailMax = heightMax || globalMaxHeight;

    // Normalize away range-fields that just mirror the current rails
    const normalized: Record<string, string[]> = {};
    for (const [k, arr] of Object.entries(safeFilters)) {
      if (!Array.isArray(arr) || arr.length === 0) continue;

      // Only normalize range filters if they exactly match the rails
      // This prevents accidentally removing user-selected ranges
      if (k === 'Product Price') {
        const [mn, mx] = parsePair(arr[0]);
        // Only skip if both values are exactly equal to rails AND we have valid rails
        if (priceRailMin !== priceRailMax && same(mn, priceRailMin) && same(mx, priceRailMax)) continue;
      } else if (k === 'Display Width') {
        const [mn, mx] = parsePair(arr[0]);
        if (widthRailMin !== widthRailMax && same(mn, widthRailMin) && same(mx, widthRailMax)) continue;
      } else if (k === 'Display Height') {
        const [mn, mx] = parsePair(arr[0]);
        if (heightRailMin !== heightRailMax && same(mn, heightRailMin) && same(mx, heightRailMax)) continue;
      }
      normalized[k] = arr;
    }

    const keys = Object.keys(normalized);
    const nonPrice = keys.filter((k) => k !== 'Product Price');

    window.clearTimeout(priceFetchTimeout.current);
    priceFetchTimeout.current = window.setTimeout(() => {
      // Sidebar fields - always fetch, but preserve existing state on failure
      if (keys.length === 0) {
        const catId = getCategoryIdFromPath();
        fetchFilterSidebarData(catId)
          .then((r) => {
            const next = r?.data ?? [];
            if (next.length > 0) { // Only update if we got valid data
              setFilterFields((prev) => {
                // More robust comparison to prevent unnecessary updates
                if (prev.length !== next.length) return next;
                const hasChanges = prev.some((p, i) => {
                  const n = next[i];
                  if (!n || p.id !== n.id || p.field_name !== n.field_name || p.field_type !== n.field_type) return true;
                  // Check if allowed_values have changed
                  if (p.field_type === 'checkbox') {
                    const prevVals = Array.isArray(p.allowed_values) ? p.allowed_values : [];
                    const nextVals = Array.isArray(n.allowed_values) ? n.allowed_values : [];
                    if (prevVals.length !== nextVals.length) return true;
                    return prevVals.some((v, idx) => v !== nextVals[idx]);
                  }
                  return false;
                });
                return hasChanges ? next : prev;
              });
            }
          })
          .catch((err) => {
            console.warn('Static reload failed:', err);
            // Don't clear filterFields on error - keep existing state
          });
      } else if (nonPrice.length > 0) {
        setIsLoadingFilters(true);
        const params = Object.fromEntries(nonPrice.map((k) => [k, normalized[k].join(',')]));
        const catId = getCategoryIdFromPath();
        fetchDynamicFilters(params, catId)
          .then((r) => {
            setIsLoadingFilters(false);
            const d = r?.data;
            if (Array.isArray(d) && d.length > 0) { // Only update if we got valid data
              const next: FilterField[] = d.map((f: any) => ({
                id: f.filter_field_id,
                field_name: f.field_name,
                field_type: f.field_type,
                allowed_values: f.values,
                sort_order: f.sort_order ?? 0,
              }));
              setFilterFields((prev) => {
                // More robust comparison to prevent unnecessary updates
                if (prev.length !== next.length) return next;
                const hasChanges = prev.some((p, i) => {
                  const n = next[i];
                  if (!n || p.id !== n.id || p.field_name !== n.field_name || p.field_type !== n.field_type) return true;
                  // Check if allowed_values have changed
                  if (p.field_type === 'checkbox') {
                    const prevVals = Array.isArray(p.allowed_values) ? p.allowed_values : [];
                    const nextVals = Array.isArray(n.allowed_values) ? n.allowed_values : [];
                    if (prevVals.length !== nextVals.length) return true;
                    return prevVals.some((v, idx) => v !== nextVals[idx]);
                  }
                  return false;
                });
                return hasChanges ? next : prev;
              });
            }
          })
          .catch((err) => {
            setIsLoadingFilters(false);
            console.warn('Dynamic filters fetch failed:', err);
            // Fallback to static data, but don't clear existing state if that fails too
            const catId = getCategoryIdFromPath();
            fetchFilterSidebarData(catId)
              .then((r) => {
                const fallbackData = r?.data ?? [];
                if (fallbackData.length > 0) {
                  setFilterFields(fallbackData);
                }
              })
              .catch(() => {
                console.warn('Fallback static reload also failed - keeping existing state');
                // Don't clear filterFields - keep existing state
              });
          });
      }

      // Price range (driven by non-price filters)
      // Only fetch if we've initialized OR if there are actual filters applied
      if (initializedFromFilterFields.current || nonPrice.length > 0) {
        const priceParams = nonPrice.length > 0
          ? Object.fromEntries(nonPrice.map((k) => [k, normalized[k].join(',')]))
          : undefined;

        const catId = getCategoryIdFromPath();
        fetchPriceRange(priceParams, catId)
          .then((pr) => {
            if (pr?.data) {
              setPriceMin((prev) => (prev === pr.data.min ? prev : pr.data.min));
              setPriceMax((prev) => (prev === pr.data.max ? prev : pr.data.max));
              const nextBps: number[] = pr.data.breakpoints || [];
              setPriceBreakpoints((prev) => (arraysEqual(prev, nextBps) ? prev : nextBps));
            }
          })
          .catch((err) => {
            console.warn('Filtered price fetch failed:', err, priceParams);
            // Don't clear price data on error - keep existing state
          });
      }
    }, 300); // Reduced timeout for faster response

    return () => window.clearTimeout(priceFetchTimeout.current);
  }, [selectedFilters]); // Simplified dependencies to prevent infinite loops

  return (
    <div className={styles.sidebar} style={{ width: '250px', position: 'relative' }}>
      {isClearingFilters && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px'
        }}>
          <ClipLoader color="#007bff" size={40} />
          <div style={{ marginTop: '15px', color: '#333', fontSize: '16px', fontWeight: '500' }}>
            Clearing filters...
          </div>
        </div>
      )}
      {(isLoadingFilters || loading) && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          marginBottom: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <ClipLoader color="#007bff" size={30} />
          <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            {loading ? 'Loading products...' : 'Updating filters...'}
          </div>
        </div>
      )}
      <div style={{ opacity: isClearingFilters ? 0.4 : 1, pointerEvents: isClearingFilters ? 'none' : 'auto' }}>
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
                        checked={!!sanitizeFilters(selectedFilters)[fn]?.includes(val)}
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

          // ---------- Product Price (snap to breakpoints; freeze when rail collapses) ----------
          if (fn === 'Product Price') {
            if (!priceBreakpoints || priceBreakpoints.length === 0) {
              return (
                <div key={ff.id} className={styles['filter-section']}>
                  <h4>{fn}</h4>
                </div>
              );
            }

            const bpLast = priceBreakpoints[priceBreakpoints.length - 1];
            const hasRealRange = priceMax > 0 && priceMax >= priceMin;
            const railMin = hasRealRange ? priceMin : 0;
            const railMax = hasRealRange ? priceMax : bpLast;

            let effMin = Number.isFinite(curMinRaw) ? curMinRaw : railMin;
            let effMax = Number.isFinite(curMaxRaw) ? curMaxRaw : railMax;
            if (effMin > effMax) { effMin = railMin; effMax = railMax; }

            const railBps = priceBreakpoints.filter(v => v >= railMin && v <= railMax);
            const safeRailBps = railBps.length ? railBps : [railMin, railMax];
            const isFrozen = railMin === railMax || safeRailBps.length <= 1;

            const clampIdx = (i: number) => Math.max(0, Math.min(i, safeRailBps.length - 1));
            const lastIdxLE = (v: number) => {
              let idx = 0;
              for (let i = 0; i < safeRailBps.length; i++) {
                if (safeRailBps[i] <= v) idx = i; else break;
              }
              return idx;
            };

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
                    disabled={isFrozen}
                    pearling={!isFrozen}
                    withTracks
                    minDistance={isFrozen ? 0 : 1}
                    onChange={(indices) => {
                      if (isFrozen || !Array.isArray(indices)) return;
                      const a = clampIdx(indices[0]);
                      const b = clampIdx(indices[1]);
                      const [minIdx, maxIdx] = a <= b ? [a, b] : [0, safeRailBps.length - 1];
                      handleRangeSliderChange(fn, [safeRailBps[minIdx], safeRailBps[maxIdx]]);
                    }}
                  />

                  <div className={styles['range-values']}>
                    <input
                      type="number"
                      min={railMin}
                      max={railMax}
                      value={effMin}
                      disabled={isFrozen}
                      onChange={(e) => {
                        if (isFrozen) return;
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        const clamped = Math.max(railMin, Math.min(raw, railMax));
                        const i = lastIdxLE(clamped);
                        handleRangeSliderChange(fn, [safeRailBps[i], effMax]);
                      }}
                      style={{ width: 80, marginRight: 8 }}
                    />
                    <input
                      type="number"
                      min={railMin}
                      max={railMax}
                      value={effMax}
                      disabled={isFrozen}
                      onChange={(e) => {
                        if (isFrozen) return;
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        const clamped = Math.max(railMin, Math.min(raw, railMax));
                        const i = lastIdxLE(clamped);
                        handleRangeSliderChange(fn, [effMin, safeRailBps[i]]);
                      }}
                      style={{ width: 80 }}
                    />
                  </div>

                  {isFrozen && (
                    <div className={styles['frozenHint']}>
                      Only products priced at {railMin === railMax ? `$${railMin}` : `$${safeRailBps[0]}`} match other filters.
                    </div>
                  )}
                </div>
              </div>
            );
          }

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
                  <span>Now showing {unit === 'ft' ? 'feet' : 'inches'}</span>&nbsp;
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
                  <span>Now showing</span> {unit === 'ft' ? 'feet' : 'inches'}&nbsp; 
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
    </div>
  );
};

export default FilterSidebar;
