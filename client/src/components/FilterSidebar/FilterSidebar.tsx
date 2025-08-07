
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
  fetchPriceRange,
  fetchWidthRange,
  fetchHeightRange
} from '../../api';
import { set } from 'lodash';
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
  // priceMin: number,
  // priceMax: number
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
    return [min || 0, max || 0];
  }

  //if (fn === 'Product Price') return [priceMin, priceMax];
  if (fn in globalRanges) {
    return globalRanges[fn as keyof typeof globalRanges];
  }
  
   //if (fn === 'Display Width') return [priceMin, priceMax];
    //if (fn === 'Display Height') return [priceMin, priceMax];
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
  // const widthFetchTimeout = useRef<number>();
  // const heightFetchTimeout = useRef<number>();

  // new states for width and height ranges
  // default values for global ranges
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
      console.log(Object.values(fd || {}), '<< fd keys in handleUnitSwitch');
      if (fd && fd.allowed_values[next]) {
        const { min, max } = fd.allowed_values[next];
        console.log(min, max, '<< min, max in handleUnitSwitch');
        onFilterChange({ field: fieldName, value: `${min},${max}` });
      }
      return { ...prev, [fieldName]: next };
    });
  }

  // useEffect(() => {
  //   async function load() {
  //     try {
  //       const res = await fetchFilterSidebarData();
  //       const fields = (res?.data ?? []) as FilterField[];

  //       const transformed = fields.map((f) => {
  //         console.log(f, '<< filter field in sidebar');
  //         if ((f.field_name === 'Display Width' || f.field_name === 'Display Height') && Array.isArray(f.allowed_values)) {
  //           const inches = f.allowed_values.map((v: string) => parseFloat(v) || 0);
            
  //           const minIn = Math.min(...inches);
  //           const maxIn = Math.max(...inches);
  //           console.log(minIn, maxIn, '<< inches in sidebar');
  //           return {
  //             ...f,
  //             allowed_values: {
  //               in: { min: minIn, max: maxIn },
  //               ft: { min: minIn / 12, max: maxIn / 12 }
  //             }
  //           };
  //         }
  //         return f;
  //       });
  //       transformed.sort((a, b) => a.sort_order - b.sort_order);
  //       setFilterFields(transformed);
  //     } catch (err) {
  //       console.warn('Failed to load static facets', err);
  //     }
  //   }
  //   load();
  // }, []);

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


  useEffect(() => {
    const fetchGlobalDefaultRanges = async () => {
      const resGlobalWidth = await fetchWidthRange();
      // set global ranges values for width
      setGlobalMinWidth(resGlobalWidth?.data.globalMin || 0);
      setGlobalMaxWidth(resGlobalWidth?.data.globalMax || 0);
      // set global ranges values for height
      const resGlobalHeight = await fetchHeightRange();
      setGlobalMinHeight(resGlobalHeight?.data.globalMin || 0);
      setGlobalMaxHeight(resGlobalHeight?.data.globalMax || 0);
    }
    fetchGlobalDefaultRanges();
  }, []);

  // useEffect(() => {
  //   const fetchWidthRangeResult = async () => {
  //     try {
  //       const res = await fetchWidthRange();
  //        // set local ranges values
  //       setWidthMin(res?.data.min || 0);
  //       setWidthMax(res?.data.max || 0);
  //     } catch (err) {
  //       console.error('Error fetching width range:', err);
  //     }
  //   };
  //   window.clearTimeout(widthFetchTimeout.current);
  //   widthFetchTimeout.current = window.setTimeout(() => {
  //     fetchWidthRangeResult();
  //   },300);
  
  // }, [selectedFilters]);

  useDebouncedEffect(
    () => {
      (async () => {
        try {
          const otherFilters = Object.keys(selectedFilters)
          .filter((k) => k !== 'Display Width')                
          .reduce<Record<string,string>>(
            (acc, k) => ((acc[k] = selectedFilters[k].join(',')), acc),
            {}
          );

          const res = await fetchWidthRange(otherFilters)
          setWidthMin(res?.data.min ?? 0)
          setWidthMax(res?.data.max ?? 0)
        } catch (err) {
          console.error('Error fetching width range:', err)
        }
      })()
    },
    [selectedFilters],
    300
  )
  
  useDebouncedEffect(
    () => {
      (async () => {
        try {
          const otherFilters = Object.keys(selectedFilters)
          .filter((k) => k !== 'Display Height')
          .reduce<Record<string,string>>(
            (acc, k) => ((acc[k] = selectedFilters[k].join(',')), acc),
            {}
          );

          const res = await fetchHeightRange(otherFilters)
          setHeightMin(res?.data.min ?? 0)
          setHeightMax(res?.data.max ?? 0)
        } catch (err) {
          console.error('Error fetching height range:', err)
        }
      })()
    },
    [selectedFilters],
    300
  )
  

  // useEffect(() => {
  //   const fetchHeightRangeResult = async () => {
  //     try {
  //       const res = await fetchHeightRange();
  //       // set local ranges values
  //       setHeightMin(res?.data.min || 0);
  //       setHeightMax(res?.data.max || 0);
  //       //console.log(res?.data, '<< Height range data');
  //     } catch (err) {
  //       console.error('Error fetching width range:', err);
  //     }
  //   };
  
  //   fetchHeightRangeResult(); 
  // }, [selectedFilters]);
  

  return (
    <div className={styles.sidebar} style={{ width: '250px' }}>
      {filterFields.map((ff) => {
        //console.log(ff, '<< filter field in sidebar');
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
            //priceMin,
            //priceMax
            {
              'Product Price': [priceMin, priceMax],
              'Display Width': [widthMin, widthMax],
              'Display Height': [heightMin, heightMax],
            }
          );

          // const renderSlider = () => {
          //   if (fn === 'Product Price') {
          //     const minIdx = priceBreakpoints.findIndex((v) => v >= curMin);
          //     const maxIdx = priceBreakpoints.findIndex((v) => v >= curMax);
          //     return (
          //       <ReactSlider
          //         className={styles['range-slider']}
          //         thumbClassName={styles['range-slider-thumb']}
          //         trackClassName={styles['range-slider-track']}
          //         min={0}
          //         max={priceBreakpoints.length - 1}
          //         step={1}
          //         value={[minIdx, maxIdx]}
          //         onChange={(indices) => {
          //           if (!Array.isArray(indices)) return;
          //           const [minIdx, maxIdx] = indices;
          //           handleRangeSliderChange(fn, [priceBreakpoints[minIdx], priceBreakpoints[maxIdx]]);
          //         }}
          //         pearling
          //         withTracks
          //         minDistance={1}
          //       />
          //     );
          //   }
          //   if (fn === 'Display Width') {
          //     const unit = unitSelections[fn] || 'in'
          //     const factor = unit === 'ft' ? 12 : 1
            
          //     // compute UI range bounds
          //     const rawMin = globalMinWidth
          //     const rawMax = globalMaxWidth
          //     const uiMin = unit === 'ft' 
          //       ? 1 
          //       : rawMin
          //     const uiMax = unit === 'ft'
          //       ? Math.ceil(rawMax / 12)
          //       : rawMax
            
          //     // convert the current inch thumbs → UI-units
          //     const toUi = (inch: number) => {
          //       if (unit === 'in') return inch
          //       const ft = inch / factor
          //       if (ft < 1) return 1
          //       return (ft % 1) >= 0.5 ? Math.ceil(ft) : Math.floor(ft)
          //     }
          //     const curMinUi = toUi(curMin)
          //     const curMaxUi = toUi(curMax)
            
          //     // onChange we convert back to inches
          //     const fromUi = (ui: number) => ui * factor
          //     return (
          //       <>
          //         <div className={styles['unit-switcher']}>
          //           <button onClick={() => handleUnitSwitch(fn)}>
          //             Switch to {unitSelections[fn] === 'ft' ? 'inches' : 'feet'}
          //           </button>
          //         </div>
          //         <ReactSlider
          //           className={styles['range-slider']}
          //           thumbClassName={styles['range-slider-thumb']}
          //           trackClassName={styles['range-slider-track']}
          //           min={uiMin}
          //           max={uiMax}
          //           step={1}
          //           value={[curMinUi, curMaxUi]}
          //           onChange={(uiVals) => {
          //             if (!Array.isArray(uiVals)) return
          //             const [minUi, maxUi] = uiVals
          //             handleRangeSliderChange(fn, [
          //               fromUi(minUi),
          //               fromUi(maxUi)
          //             ])
          //           }}
          //           pearling
          //           withTracks
          //           minDistance={1}
          //         />
          //         <div key={ff.id} className={styles['filter-section']}>
          //           <div className={styles['range-slider-container']}>
                      
          //             <div className={styles['range-values']}>
          //               <input
          //                   type="number"
          //                   value={unit === 'ft' ? curMinUi : curMin}
          //                   onChange={e => {
          //                     const v = parseFloat(e.target.value)
          //                     if (isNaN(v)) return
          //                     handleRangeSliderChange(fn, [
          //                       unit === 'ft' ? fromUi(v) : v,
          //                       curMax
          //                     ])
          //                   }}
          //                   style={{ width: 80, marginRight: 8 }}
          //                 />
          //                 <input
          //                   type="number"
          //                   value={unit === 'ft' ? curMaxUi : curMax}
          //                   onChange={e => {
          //                     const v = parseFloat(e.target.value)
          //                     if (isNaN(v)) return
          //                     handleRangeSliderChange(fn, [
          //                       curMin,
          //                       unit === 'ft' ? fromUi(v) : v
          //                     ])
          //                   }}
          //                   style={{ width: 80 }}
          //                 />
          //               </div>  
          //           </div>
                    
          //         </div>
          //         {/* <ReactSlider
          //             className={styles['range-slider']}
          //             thumbClassName={styles['range-slider-thumb']}
          //             trackClassName={styles['range-slider-track']}
          //             min={globalMinWidth}
          //             max={globalMaxWidth}
          //             step={1}
          //             value={[curMin, curMax]}
          //             onChange={(v) => handleRangeSliderChange(fn, v)}
          //             pearling
          //             withTracks
          //             minDistance={1}
          //           /> */}
          //       </>
                
          //     );
          //   }
          //   if (fn === 'Display Height') {
          //     const unit = unitSelections[fn] || 'in';
          //     const factor = unit === 'ft' ? 12 : 1;
          //     const minUi = globalMinHeight / factor;
          //     const maxUi = globalMaxHeight / factor;
          //     const curMinUi = curMin / factor;
          //     const curMaxUi = curMax / factor;
          //     return (
          //       <>
          //         <div className={styles['unit-switcher']}>
          //           <button onClick={() => handleUnitSwitch(fn)}>
          //             Switch to {unitSelections[fn] === 'ft' ? 'inches' : 'feet'}
          //           </button>
          //         </div>
          //         <ReactSlider
          //           className={styles['range-slider']}
          //           thumbClassName={styles['range-slider-thumb']}
          //           trackClassName={styles['range-slider-track']}
          //           min={minUi}
          //           max={maxUi}
          //           step={1}
          //           value={[curMinUi, curMaxUi]}
          //           onChange={(uiVals) => {
          //             if (!Array.isArray(uiVals)) return;
          //             const [uiMin, uiMax] = uiVals;
          //             handleRangeSliderChange(fn, [uiMin * factor, uiMax * factor]);
          //           }}
          //           pearling
          //           withTracks
          //           minDistance={1}
          //         />
          //         {/* <ReactSlider
          //           className={styles['range-slider']}
          //           thumbClassName={styles['range-slider-thumb']}
          //           trackClassName={styles['range-slider-track']}
          //           min={globalMinHeight}
          //           max={globalMaxHeight}
          //           step={1}
          //           value={[curMin, curMax]}
          //           onChange={(v) => handleRangeSliderChange(fn, v)}
          //           pearling
          //           withTracks
          //           minDistance={1}
          //         /> */}
          //       </>
                
          //     );
          //   }
          //   // method for general range sliders
          //   // return (
          //   //   <ReactSlider
          //   //     className={styles['range-slider']}
          //   //     thumbClassName={styles['range-slider-thumb']}
          //   //     trackClassName={styles['range-slider-track']}
          //   //     min={minWidth}
          //   //     max={maxWidth}
          //   //     step={1}
          //   //     value={[curMin, curMax]}
          //   //     onChange={(v) => handleRangeSliderChange(fn, v)}
          //   //     pearling
          //   //     withTracks
          //   //     minDistance={1}
          //   //   />
          //   // );
          // };

          // return (
          //   <div key={ff.id} className={styles['filter-section']}>
          //     <h4>{fn}</h4>
          //     <div className={styles['range-slider-container']}>
          //       {renderSlider()}
          //       <div className={styles['range-values']}>
          //         <input
          //           type="number"
          //           value={curMin}
          //           onChange={(e) => {
          //             const v = parseFloat(e.target.value);
          //             if (!isNaN(v)) handleRangeSliderChange(fn, [v, curMax]);
          //           }}
          //           style={{ width: 80, marginRight: 8 }}
          //         />
          //         <input
          //           type="number"
          //           value={curMax}
          //           onChange={(e) => {
          //             const v = parseFloat(e.target.value);
          //             if (!isNaN(v)) handleRangeSliderChange(fn, [curMin, v]);
          //           }}
          //           style={{ width: 80 }}
          //         />
          //       </div>
          //     </div>
          //   </div>
          // );
        
         
          
          const renderSlider = () => {
            switch (fn) {
              case 'Product Price': {
                const lo = priceBreakpoints.findIndex(v => v >= curMin);
                const hi = priceBreakpoints.findIndex(v => v >= curMax);
                return (
                  <>
                    <ReactSlider
                      className={styles['range-slider']}
                      thumbClassName={styles['range-slider-thumb']}
                      trackClassName={styles['range-slider-track']}
                      min={0}
                      max={priceBreakpoints.length - 1}
                      step={1}
                      value={[lo, hi]}
                      onChange={indices => {
                        if (!Array.isArray(indices)) return;
                        const [minIdx, maxIdx] = indices;
                        handleRangeSliderChange(fn,[priceBreakpoints[minIdx], priceBreakpoints[maxIdx]]
                        );
                      }}
                      pearling
                      withTracks
                      minDistance={1}
                    />
                    <div className={styles['range-values']}>
                      <input
                        type="number"
                        value={curMin}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) handleRangeSliderChange(fn, [v, curMax]);
                        }}
                        style={{ width: 80, marginRight: 8 }}
                      />
                      <input
                        type="number"
                        value={curMax}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) handleRangeSliderChange(fn, [curMin, v]);
                        }}
                        style={{ width: 80 }}
                      />
                    </div>
                  </>
                );
              }
              case 'Display Width': {
                const unit = unitSelections[fn] || 'in';
                const factor = unit === 'ft' ? 12 : 1;
                const uiMin = unit === 'ft' ? 1 : globalMinWidth;
                const uiMax = unit === 'ft' ? Math.ceil(globalMaxWidth / factor) : globalMaxWidth;
                const toUi = (inch: number) => {
                  if (unit === 'in') return inch;
                  const ft = inch / factor;
                  return ft < 1 ? 1 : (ft % 1) >= 0.5 ? Math.ceil(ft) : Math.floor(ft);
                };
                const fromUi = (ui: number) => ui * factor;
                const lo = toUi(curMin);
                const hi = toUi(curMax);
          
                return (
                  <>
                    <div className={styles['unit-switcher']}>
                      <button onClick={() => handleUnitSwitch(fn)}>
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
                      onChange={vals => {
                        if (!Array.isArray(vals)) return;
                        const [minUi, maxUi] = vals;
                        handleRangeSliderChange(fn, [
                          fromUi(minUi),
                          fromUi(maxUi),
                        ]);
                      }}
                      pearling
                      withTracks
                      minDistance={1}
                    />
                    <div className={styles['range-values']}>
                      <input
                        type="number"
                        value={unit === 'ft' ? lo : curMin}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (isNaN(v)) return;
                          handleRangeSliderChange(fn, [
                            unit === 'ft' ? fromUi(v) : v,
                            curMax,
                          ]);
                        }}
                        style={{ width: 80, marginRight: 8 }}
                      />
                      <input
                        type="number"
                        value={unit === 'ft' ? hi : curMax}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (isNaN(v)) return;
                          handleRangeSliderChange(fn, [
                            curMin,
                            unit === 'ft' ? fromUi(v) : v,
                          ]);
                        }}
                        style={{ width: 80 }}
                      />
                    </div>
                  </>
                );
              }
          
              case 'Display Height': {
                const unit = unitSelections[fn] || 'in';
                const factor = unit === 'ft' ? 12 : 1;
              
                const toUi = (inch: number) => {
                  if (unit === 'in') return inch;
                  const ft = inch / factor;
                  if (ft < 1) return 1;
                  return (ft % 1) >= 0.5 ? Math.ceil(ft) : Math.floor(ft);
                };
                const fromUi = (ui: number) => ui * factor;
              
                // compute slider bounds in UI units
                const minUi = unit === 'ft' ? 1 : globalMinHeight;
                const maxUi = unit === 'ft' ? Math.ceil(globalMaxHeight / factor) : globalMaxHeight;
              
                // convert the current inches into rounded UI units
                const lo = toUi(curMin);
                const hi = toUi(curMax);
          
                return (
                  <>
                    <div className={styles['unit-switcher']}>
                      <button onClick={() => handleUnitSwitch(fn)}>
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
                      onChange={vals => {
                        if (!Array.isArray(vals)) return;
                        const [minUi, maxUi] = vals;
                        handleRangeSliderChange(fn, [
                          fromUi(minUi),
                          fromUi(maxUi),
                        ]);
                      }}
                      pearling
                      withTracks
                      minDistance={1}
                    />
                    <div className={styles['range-values']}>
                      <input
                        type="number"
                        value={unit === 'ft' ? lo : curMin}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (isNaN(v)) return;
                          handleRangeSliderChange(fn, [
                            unit === 'ft' ? fromUi(v) : v,
                            curMax,
                          ]);
                        }}
                        style={{ width: 80, marginRight: 8 }}
                      />
                      <input
                        type="number"
                        value={unit === 'ft' ? hi : curMax}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (isNaN(v)) return;
                          handleRangeSliderChange(fn, [
                            curMin,
                            unit === 'ft' ? fromUi(v) : v,
                          ]);
                        }}
                        style={{ width: 80 }}
                      />
                    </div>
                  </>
                );
              }
          
              default:
                return null;
            }
          };
          
          return (
            <div key={ff.id} className={styles['filter-section']}>
              <h4>{fn}</h4>
              <div className={styles['range-slider-container']}>
                {renderSlider()}
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


















