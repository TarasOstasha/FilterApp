
// import React, { useState, useEffect, useRef } from 'react';
// import ReactSlider from 'react-slider';
// import styles from './FilterSidebar.module.scss';
// import {
//   fetchFilterSidebarData,
//   fetchDynamicFilters,
//   fetchPriceRange,
//   fetchWidthRange,
//   fetchHeightRange,
// } from '../../api';

// interface FilterField {
//   id: number;
//   field_name: string;
//   field_type: 'checkbox' | 'range';
//   allowed_values: any; 
//   sort_order: number;
// }

// interface FilterSidebarProps {
//   onFilterChange: (filter: { field: string; value: any }) => void;
//   selectedFilters: { [key: string]: string[] };
// }

// function parseRangeValue(
//   field: FilterField,
//   currentUnit: 'ft' | 'in' | undefined,
//   selectedFilters: { [key: string]: string[] },
//   priceMin: number,
//   priceMax: number
// ): [number, number] {
//   const fn = field.field_name;
//   const sel = selectedFilters[fn]?.[0];

//   if (sel) {
//     if (!sel.includes(',')) {
//       const v = parseFloat(sel);
//       return [0, isNaN(v) ? priceMax : v];
//     }
//     let [min, max] = sel
//       .split(',')
//       .map((x) => parseFloat(x) || 0) as [number, number];
//     if (min > max) [min, max] = [max, min];
//     return [min, max];
//   }
//   if (
//     typeof field.allowed_values === 'object' &&
//     currentUnit &&
//     field.allowed_values[currentUnit]
//   ) {
//     const { min, max } = field.allowed_values[currentUnit];
//     //console.log(min, max, '<< sel in parseRangeValue');
//     return [min, max];
//   }
//   if (fn === 'Product Price') {
//     //console.log(priceMin, priceMax, '<< priceMin, priceMax'); // shoulr be 0 and
//     return [priceMin, priceMax];
//   }
//   if (Array.isArray(field.allowed_values)) {
//     const arr = field.allowed_values.map((x: any) => parseFloat(x) || 0);
//     return [arr[0], arr[arr.length - 1]];
//   }
//   return [0, 0];
// }

// const FilterSidebar: React.FC<FilterSidebarProps> = ({
//   onFilterChange,
//   selectedFilters,
// }) => {
//   const [filterFields, setFilterFields] = useState<FilterField[]>([]);
//   const [unitSelections, setUnitSelections] = useState<{ [k: string]: 'ft' | 'in' }>({
//     'Display Width': 'in',
//     'Display Height': 'in',
//   });
//   const [priceMin, setPriceMin] = useState(0);
//   const [priceMax, setPriceMax] = useState(0);
//   const [priceBreakpoints, setPriceBreakpoints] = useState<number[]>([]);
//   const priceFetchTimeout = useRef<number>();

//   function handleCheckboxChange(field: string, value: string) {
//     onFilterChange({ field, value });
//   }

//   function handleRangeSliderChange(fieldName: string, sliderValue: number | number[]) {
//     if (Array.isArray(sliderValue) && sliderValue.length === 2) {
//       onFilterChange({
//         field: fieldName,
//         value: `${sliderValue[0]},${sliderValue[1]}`,
//       });
//     }
//   }

//   function handleUnitSwitch(fieldName: string) {
//     setUnitSelections((prev) => {
//       const next = prev[fieldName] === 'ft' ? 'in' : 'ft';
//       const fd = filterFields.find((f) => f.field_name === fieldName);
//       if (fd && fd.allowed_values[next]) {
//         const { min, max } = fd.allowed_values[next];
//         onFilterChange({ field: fieldName, value: `${min},${max}` });
//       }
//       return { ...prev, [fieldName]: next };
//     });
//   }

//   useEffect(() => {
//     async function load() {
//       try {
//         const res = await fetchFilterSidebarData();
//         const arr = res?.data ?? [];
//         const fields: FilterField[] = Array.isArray(arr) ? arr : [];

//         const transformed = fields.map((f) => {
//           if ((f.field_name === 'Display Width' || f.field_name === 'Display Height') && Array.isArray(f.allowed_values)) {
//             const inches = f.allowed_values.map((v: string) => parseFloat(v) || 0);
//             const minIn = Math.min(...inches);
//             const maxIn = Math.max(...inches);
//             return {
//               ...f,
//               allowed_values: {
//                 in: { min: minIn, max: maxIn },
//                 ft: { min: minIn / 12, max: maxIn / 12 },
//               },
//             };
//           }
//           return f;
//         });
//         transformed.sort((a, b) => a.sort_order - b.sort_order);
//         setFilterFields(transformed);
//       } catch (err) {
//         console.warn('Failed to load static facets', err);
//       }
//     }
//     load();
//   }, []);

//   useEffect(() => {
//     const keys = Object.keys(selectedFilters);
//     //console.log(keys, '<< selected filter keys in sidebar');
//     const nonPrice = keys.filter((k) => k !== 'Product Price');
//     if (keys.length === 1 && keys[0] === 'Product Price') return;

//     window.clearTimeout(priceFetchTimeout.current);
//     priceFetchTimeout.current = window.setTimeout(() => {
//       if (keys.length === 0) {
//         fetchFilterSidebarData()
//           .then((r) => {
//             const arr2 = r?.data ?? [];
//             setFilterFields(Array.isArray(arr2) ? arr2 : []);
//           })
//           .catch(() => console.warn('Static reload failed'));
//       } else if (nonPrice.length > 0) {
//         const params: Record<string, string> = {};
//         nonPrice.forEach((f) => {
//           params[f] = selectedFilters[f].join(',');
//         });
//         fetchDynamicFilters(params)
//           .then((r) => {
//             const d = r?.data;
//             if (!Array.isArray(d)) {
//               setFilterFields([]);
//             } else {
//               setFilterFields(
//                 d.map((f) => ({
//                   id: f.filter_field_id,
//                   field_name: f.field_name,
//                   field_type: f.field_type,
//                   allowed_values: f.values,
//                   sort_order: f.sort_order ?? 0,
//                 }))
//               );
//             }
//           })
//           .catch(() => {
//             fetchFilterSidebarData()
//               .then((r) => {
//                 const arr3 = r?.data ?? [];
//                 setFilterFields(Array.isArray(arr3) ? arr3 : []);
//               })
//               .catch(() => console.warn('Fallback static reload failed'));
//           });
//       }

//       const priceParams =
//         nonPrice.length > 0
//           ? nonPrice.reduce((p, f) => ({ ...p, [f]: selectedFilters[f].join(',') }), {} as Record<string, string>)
//           : undefined;
//       //console.log(priceParams, '<< priceParams in sidebar');
//       fetchPriceRange(priceParams)
//         .then((pr) => {
//           if (pr?.data) {
//             if(Object.keys(selectedFilters).length === 0) {
//               const cleanedBreakpoints = pr.data.breakpoints.filter(n => typeof n === 'number' && !isNaN(n));
//               const min = Math.min(...cleanedBreakpoints);
//               const max = Math.max(...cleanedBreakpoints);
//               setPriceMin(min);
//               setPriceMax(max);
//             } else {
//               setPriceMin(pr.data.min);
//               setPriceMax(pr.data.max);
//               setPriceBreakpoints(pr.data.breakpoints || []);
//             }

//           }
//         })
//         .catch(() => console.warn('Filtered price fetch failed', priceParams));
        
//     }, 300);

//     return () => window.clearTimeout(priceFetchTimeout.current);
//   }, [selectedFilters]);

//   return (
//     <div className={styles.sidebar}>
//       {filterFields.map((ff) => {
//         const { field_name: fn, field_type: ft } = ff;
//         if (ft === 'checkbox') {
//           return (
//             <div key={ff.id} className={styles['filter-section']}>
//               <h4>{fn}</h4>
//               <ul className={styles['filter-list']}>
//                 {(ff.allowed_values as string[]).map((val, i) => (
//                   <li key={i} className={styles['filter-item']}>
//                     <label>
//                       <input
//                         type="checkbox"
//                         value={val}
//                         checked={selectedFilters[fn]?.includes(val) || false}
//                         onChange={() => handleCheckboxChange(fn, val)}
//                         className={styles['sidebar-checkbox-input']}
//                       />
//                       {val}
//                     </label>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           );
//         }
//         if (ft === 'range') {
//           let hasUnit = false;
//           let unit: 'ft' | 'in' | undefined;
//           if (typeof ff.allowed_values === 'object' && ff.allowed_values.ft && ff.allowed_values.in) {
//             hasUnit = true;
//             unit = unitSelections[fn] || 'ft';
//           }
//           const [curMin, curMax] = parseRangeValue(ff, unit, selectedFilters, priceMin, priceMax);
//           let sliderMin: number, sliderMax: number;
//           console.log(curMin, curMax, '<< curMin, curMax');
//           const renderInputs = (
//             <div className={styles['range-values']}>
//               <input
//                 type="number"
//                 value={curMin}
//                 onChange={(e) => {
//                   const v = parseFloat(e.target.value);
//                   if (!isNaN(v)) handleRangeSliderChange(fn, [v, curMax]);
//                 }}
//                 style={{ width: 80, marginRight: 8 }}
//               />
//               <input
//                 type="number"
//                 value={curMax}
//                 onChange={(e) => {
//                   const v = parseFloat(e.target.value);
//                   if (!isNaN(v)) handleRangeSliderChange(fn, [curMin, v]);
//                 }}
//                 style={{ width: 80 }}
//               />
//               {hasUnit && <span style={{ marginLeft: 8 }}>{unit}</span>}
//             </div>
//           );

//           const renderSlider = () => {
//             if (fn === 'Product Price' && priceBreakpoints.length > 1) {
//               return (
//                 <ReactSlider
//                   className={styles['range-slider']}
//                   thumbClassName={styles['range-slider-thumb']}
//                   trackClassName={styles['range-slider-track']}
//                   min={0}
//                   max={priceBreakpoints.length - 1}
//                   step={1}
//                   value={[
//                     priceBreakpoints.findIndex((v) => v >= curMin),
//                     priceBreakpoints.findIndex((v) => v >= curMax),
//                   ]}
//                   onChange={(indices) => {
//                     if (!Array.isArray(indices)) return;
                  
//                     const [minIdx, maxIdx] = indices;
//                     if (
//                       typeof minIdx !== 'number' ||
//                       typeof maxIdx !== 'number' ||
//                       minIdx < 0 ||
//                       maxIdx < 0
//                     ) {
//                       return;
//                     }
                  
//                     handleRangeSliderChange(fn, [
//                       priceBreakpoints[minIdx],
//                       priceBreakpoints[maxIdx],
//                     ]);
//                   }}
//                   pearling
//                   withTracks
//                   minDistance={1}
//                 />
//               );
//             } else {
//               if (hasUnit && unit) {
//                 sliderMin = ff.allowed_values[unit].min;
//                 sliderMax = ff.allowed_values[unit].max;
//               } else if (Array.isArray(ff.allowed_values)) {
//                 const arr = ff.allowed_values.map((v: any) => parseFloat(v) || 0);
//                 sliderMin = arr[0];
//                 sliderMax = arr[arr.length - 1];
//               } else {
//                 sliderMin = 0;
//                 sliderMax = 0;
//               }
//               console.log('Slider debug:', {
//                 field: fn,
//                 curMin,
//                 curMax,
//                 sliderMin,
//                 sliderMax,
//               });
//               return (
//                 <ReactSlider
//                   className={styles['range-slider']}
//                   thumbClassName={styles['range-slider-thumb']}
//                   trackClassName={styles['range-slider-track']}
//                   min={sliderMin}
//                   max={sliderMax}
//                   step={1}
//                   value={[curMin, curMax]}
//                   onChange={(v) => handleRangeSliderChange(fn, v)}
//                   pearling
//                   withTracks
//                   minDistance={1}
//                 />
//               );
//             }
//           };

//           return (
//             <div key={ff.id} className={styles['filter-section']}>
//               <h4>{fn}</h4>
//               {hasUnit && (
//                 <div className={styles['unit-switcher']}>
//                   <button onClick={() => handleUnitSwitch(fn)}>
//                     Switch to {unit === 'ft' ? 'inches' : 'feet'}
//                   </button>
//                 </div>
//               )}
//               <div className={styles['range-slider-container']}>
//                 {renderSlider()}
//                 {renderInputs}
//               </div>
//             </div>
//           );
//         }
//         return null;
//       })}
//     </div>
//   );
// };

// export default FilterSidebar;




import React, { useState, useEffect, useRef } from 'react';
import ReactSlider from 'react-slider';
import styles from './FilterSidebar.module.scss';
import {
  fetchFilterSidebarData,
  fetchDynamicFilters,
  fetchPriceRange
} from '../../api';

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
  priceMin: number,
  priceMax: number
): [number, number] {
  const fn = field.field_name;
  const sel = selectedFilters[fn]?.[0];

  if (sel) {
    const [min, max] = sel.split(',').map((x) => parseFloat(x));
    return [min || 0, max || 0];
  }

  if (fn === 'Product Price') return [priceMin, priceMax];

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

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onFilterChange,
  selectedFilters
}) => {
  const [filterFields, setFilterFields] = useState<FilterField[]>([]);
  const [unitSelections, setUnitSelections] = useState<{ [k: string]: 'ft' | 'in' }>(
    {
      'Display Width': 'in',
      'Display Height': 'in'
    }
  );
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [priceBreakpoints, setPriceBreakpoints] = useState<number[]>([]);
  const priceFetchTimeout = useRef<number>();

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
    setUnitSelections((prev) => {
      const next = prev[fieldName] === 'ft' ? 'in' : 'ft';
      const fd = filterFields.find((f) => f.field_name === fieldName);
      if (fd && fd.allowed_values[next]) {
        const { min, max } = fd.allowed_values[next];
        onFilterChange({ field: fieldName, value: `${min},${max}` });
      }
      return { ...prev, [fieldName]: next };
    });
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchFilterSidebarData();
        const fields = (res?.data ?? []) as FilterField[];

        const transformed = fields.map((f) => {
          if ((f.field_name === 'Display Width' || f.field_name === 'Display Height') && Array.isArray(f.allowed_values)) {
            const inches = f.allowed_values.map((v: string) => parseFloat(v) || 0);
            const minIn = Math.min(...inches);
            const maxIn = Math.max(...inches);
            return {
              ...f,
              allowed_values: {
                in: { min: minIn, max: maxIn },
                ft: { min: minIn / 12, max: maxIn / 12 }
              }
            };
          }
          return f;
        });
        transformed.sort((a, b) => a.sort_order - b.sort_order);
        setFilterFields(transformed);
      } catch (err) {
        console.warn('Failed to load static facets', err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const keys = Object.keys(selectedFilters);
    const nonPrice = keys.filter((k) => k !== 'Product Price');
    if (keys.length === 1 && keys[0] === 'Product Price') return;

    window.clearTimeout(priceFetchTimeout.current);
    priceFetchTimeout.current = window.setTimeout(() => {
      if (keys.length === 0) {
        fetchFilterSidebarData()
          .then((r) => setFilterFields(r?.data ?? []))
          .catch(() => console.warn('Static reload failed'));
      } else if (nonPrice.length > 0) {
        const params = Object.fromEntries(nonPrice.map((k) => [k, selectedFilters[k].join(',')]));

        fetchDynamicFilters(params)
          .then((r) => {
            const d = r?.data;
            if (Array.isArray(d)) {
              setFilterFields(
                d.map((f) => ({
                  id: f.filter_field_id,
                  field_name: f.field_name,
                  field_type: f.field_type,
                  allowed_values: f.values,
                  sort_order: f.sort_order ?? 0
                }))
              );
            }
          })
          .catch(() => fetchFilterSidebarData().then((r) => setFilterFields(r?.data ?? [])));
      }

      const priceParams =
        nonPrice.length > 0
          ? Object.fromEntries(nonPrice.map((k) => [k, selectedFilters[k].join(',')]))
          : undefined;

      fetchPriceRange(priceParams)
        .then((pr) => {
          if (pr?.data) {
            setPriceMin(pr.data.min);
            setPriceMax(pr.data.max);
            setPriceBreakpoints(pr.data.breakpoints || []);
          }
        })
        .catch(() => console.warn('Filtered price fetch failed', priceParams));
    }, 300);

    return () => window.clearTimeout(priceFetchTimeout.current);
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
          const [curMin, curMax] = parseRangeValue(
            ff,
            unitSelections[fn],
            selectedFilters,
            priceMin,
            priceMax
          );

          const renderSlider = () => {
            if (fn === 'Product Price' && priceBreakpoints.length > 1) {
              const minIdx = priceBreakpoints.findIndex((v) => v >= curMin);
              const maxIdx = priceBreakpoints.findIndex((v) => v >= curMax);
              return (
                <ReactSlider
                  className={styles['range-slider']}
                  thumbClassName={styles['range-slider-thumb']}
                  trackClassName={styles['range-slider-track']}
                  min={0}
                  max={priceBreakpoints.length - 1}
                  step={1}
                  value={[minIdx, maxIdx]}
                  onChange={(indices) => {
                    if (!Array.isArray(indices)) return;
                    const [minIdx, maxIdx] = indices;
                    handleRangeSliderChange(fn, [priceBreakpoints[minIdx], priceBreakpoints[maxIdx]]);
                  }}
                  pearling
                  withTracks
                  minDistance={1}
                />
              );
            }
            return (
              <ReactSlider
                className={styles['range-slider']}
                thumbClassName={styles['range-slider-thumb']}
                trackClassName={styles['range-slider-track']}
                min={1}
                max={curMax}
                step={1}
                value={[curMin, curMax]}
                onChange={(v) => handleRangeSliderChange(fn, v)}
                pearling
                withTracks
                minDistance={1}
              />
            );
          };

          return (
            <div key={ff.id} className={styles['filter-section']}>
              <h4>{fn}</h4>
              <div className={styles['range-slider-container']}>
                {renderSlider()}
                <div className={styles['range-values']}>
                  <input
                    type="number"
                    value={curMin}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) handleRangeSliderChange(fn, [v, curMax]);
                    }}
                    style={{ width: 80, marginRight: 8 }}
                  />
                  <input
                    type="number"
                    value={curMax}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) handleRangeSliderChange(fn, [curMin, v]);
                    }}
                    style={{ width: 80 }}
                  />
                </div>
              </div>
            </div>
          );
        }
        
        return null;
      })}

    </div>
  );
};

export default FilterSidebar;


















