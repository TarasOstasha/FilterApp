import React, { useMemo } from 'react';
import styles from './CsvImportExport.module.scss';


export const ALLOWED_FILES = [
    'categories.csv',
    'product_categories.csv',
    'product_filters.csv',
    'filter_fields.csv',
    'products.csv',
    'products-remove.csv',
] as const;


export function isAllowedFileName(name?: string): boolean {
    if (!name) return true; 
    const base = name.toLowerCase().replace(/^.*[\\/]/, ''); 
    return ALLOWED_FILES.includes(base as any);
}

/** Map filename → backend route segment used by your API */
export function getUploadTypeFromName(name: string): string {
    const base = name.toLowerCase().replace(/^.*[\\/]/, '').replace(/\.csv$/i, '');
    switch (base) {
        case 'products': return 'product';
        case 'products-remove': return 'product-remove';
        case 'categories': return 'category';
        case 'product_categories': return 'product-category';
        case 'product_filters': return 'product-filter';
        case 'filter_fields': return 'filter-field';
        default: return 'unknown';
    }
}

type NoteProps = {
    file?: File | null;
    open?: boolean;
    onClose?: () => void;
    className?: string;
};

/** UI note showing allowed filenames; turns red when current `file` is invalid */
const AllowedFilenamesNote: React.FC<NoteProps> = ({ file, open = false, onClose, className }) => {
    const invalid = !!file && !isAllowedFileName(file.name);
    const shouldShow = open || invalid;
    const errorLock = invalid && !open;

    if (!shouldShow) return null;

    return (
        <div
        className={[styles.note, invalid ? styles.noteError : '', className || ''].join(' ')}
        aria-live="polite"
      >
        <div className={styles.noteHeader}>
          <div className={styles.noteTitle}>
            {invalid ? 'Invalid file name!' : 'Allowed file names'}
          </div>
  
          {onClose && (
            <button
              type="button"
              className={styles.noteClose}
              aria-label={errorLock ? 'Close disabled' : 'Hide notice'}
              onClick={errorLock ? undefined : onClose}  
              disabled={errorLock}                        
            >
              ×
            </button>
          )}
        </div>
            <div className={styles.noteBody}>
                <ul className={styles.noteList}>
                    <li>
                        <code>categories.csv</code>
                        <span className={styles.noteDesc}>for uploading categories</span>
                    </li>
                    <li>
                        <code>product_categories.csv</code>
                        <span className={styles.noteDesc}>for uploading product categories</span>
                    </li>
                    <li>
                        <code>product_filters.csv</code>
                        <span className={styles.noteDesc}>for uploading product filters</span>
                    </li>
                    <li>
                        <code>filter_fields.csv</code>
                        <span className={styles.noteDesc}>for uploading filter fields</span>
                    </li>
                    <li>
                        <code>products.csv</code>
                        <span className={styles.noteDesc}>for uploading products</span>
                    </li>
                    <li>
                        <code>products-remove.csv</code>
                        <span className={styles.noteDesc}>
                            <b>removes</b> products
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AllowedFilenamesNote;
