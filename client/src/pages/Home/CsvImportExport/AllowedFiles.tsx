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
                    <li className='table-responsive'>
                        <code>categories.csv</code>
                        <span className={styles.noteDesc}>for uploading categories</span>
                        <table className={"table table-striped table-bordered table-hover align-middle text-center"}>
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">category_id</th>
                                    <th scope="col">category_name</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>1</td>
                                    <td>Exhibit</td>
                                </tr>
                            </tbody>
                        </table>
                    </li>
                    <li className='table-responsive'>
                        <code>product_categories.csv</code>
                        <span className={styles.noteDesc}>for uploading product categories</span>
                        <table className="table table-striped table-bordered table-hover align-middle text-center">
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">product_id</th>
                                    <th scope="col">product_code</th>
                                    <th scope="col">category_id</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>5</td>
                                    <td>MK5200</td>
                                    <td>51,171,511,6455</td>
                                </tr>
                            </tbody>
                        </table>
                    </li>
                    <li className='table-responsive'>
                        <code>product_filters.csv</code>
                        <span className={styles.noteDesc}>for uploading product filters</span>
                        <table className="table table-striped table-bordered table-hover align-middle text-center">
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">product_id</th>
                                    <th scope="col">product_code</th>
                                    <th scope="col">filter_field_id_1</th>
                                    <th scope="col">Product Price</th>
                                    <th scope="col">filter_field_id_2</th>
                                    <th scope="col">Product Type</th>
                                    <th scope="col">filter_field_id_4</th>
                                    <th scope="col">Display Width</th>
                                    <th scope="col">filter_field_id_6</th>
                                    <th scope="col">Display Height</th>
                                    <th scope="col">filter_field_id_7</th>
                                    <th scope="col">Print Type</th>
                                    <th scope="col">filter_field_id_9</th>
                                    <th scope="col">Product Details</th>
                                    <th scope="col">filter_field_id_10</th>
                                    <th scope="col">Frame Hardware</th>
                                    <th scope="col">filter_field_id_11</th>
                                    <th scope="col">Display Shape</th>
                                    <th scope="col">filter_field_id_12</th>
                                    <th scope="col">Booth Size</th>
                                    <th scope="col">filter_field_id_13</th>
                                    <th scope="col">Other / Accessories</th>
                                    <th scope="col">filter_field_id_14</th>
                                    <th scope="col">Hanging Sign Shapes</th>
                                    <th scope="col">filter_field_id_15</th>
                                    <th scope="col">Turntable Type</th>
                                    <th scope="col">filter_field_id_16</th>
                                    <th scope="col">Motor Capacity</th>
                                    <th scope="col">filter_field_id_17</th>
                                    <th scope="col">Flooring Type</th>
                                    <th scope="col">filter_field_id_18</th>
                                    <th scope="col">Print Facility</th>
                                    <th scope="col">filter_field_id_19</th>
                                    <th scope="col">Backlit</th>
                                    <th scope="col">filter_field_id_21</th>
                                    <th scope="col">Features</th>
                                    <th scope="col">filter_field_id_22</th>
                                    <th scope="col">Outdoor Type</th>
                                    <th scope="col">filter_field_id_23</th>
                                    <th scope="col">Product Line</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>28</td>
                                    <td>MK3200</td>
                                    <td>1</td>
                                    <td>10000</td>
                                    <td>2</td>
                                    <td>Backdrop, Trade Show Booth</td>
                                    <td>4</td>
                                    <td>240</td>
                                    <td>6</td>
                                    <td>96</td>
                                    <td>7</td>
                                    <td>Double-Sided</td>
                                    <td>9</td>
                                    <td>Kit</td>
                                    <td>10</td>
                                    <td>SEG, Tubular / Pillowcase</td>
                                    <td>11</td>
                                    <td>Straight</td>
                                    <td>12</td>
                                    <td>20 x 20</td>
                                    <td>13</td>
                                    <td></td>
                                    <td>14</td>
                                    <td></td>
                                    <td>15</td>
                                    <td></td>
                                    <td>16</td>
                                    <td></td>
                                    <td>17</td>
                                    <td></td>
                                    <td>18</td>
                                    <td>MK</td>
                                    <td>19</td>
                                    <td>Backlit</td>
                                    <td>21</td>
                                    <td>Shelving</td>
                                    <td>22</td>
                                    <td></td>
                                    <td>23</td>
                                    <td>Wavelight</td>
                                </tr>
                            </tbody>
                        </table>
                    </li>
                    <li className='table-responsive'>
                        <code>filter_fields.csv</code>
                        <span className={styles.noteDesc}>for uploading filter fields</span>
                        <table className="table table-striped table-bordered table-hover align-middle text-center">
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">id</th>
                                    <th scope="col">field_name</th>
                                    <th scope="col">field_type</th>
                                    <th scope="col">allowed_values</th>
                                    <th scope="col">sort_order</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>16</td>
                                    <td>Motor Capacity</td>
                                    <td>checkbox</td>
                                    <td>0-5000 lb,Other</td>
                                    <td>15</td>
                                </tr>
                            </tbody>
                        </table>
                    </li>
                    <li className='table-responsive'>
                        <code>products.csv</code>
                        <span className={styles.noteDesc}>for uploading products</span>
                        <table className="table table-striped table-bordered table-hover align-middle text-center">
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">id</th>
                                    <th scope="col">product_code</th>
                                    <th scope="col">product_name</th>
                                    <th scope="col">product_link</th>
                                    <th scope="col">product_img_link</th>
                                    <th scope="col">product_price</th>
                                    <th scope="col">most_popular</th>
                                    <th scope="col">hide_product</th>
                                    <th scope="col">category_ids</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>22292</td>
                                    <td>AB10103</td>
                                    <td>36in x 26in x 14in Molded Shipping Case for Pop-Up Displays w/ Lock (4300 Vault)</td>
                                    <td>https://www.xyzdisplays.com/Molded-Shipping-Case-for-Pop-Up-Displays-with-Lo-p/AB10103.htm</td>
                                    <td>https://www.xyzDisplays.com/v/vspfiles/photos/AB10103-1.jpg</td>
                                    <td>670</td>
                                    <td>7</td>
                                    <td></td>
                                    <td>51,171,6455</td>
                                </tr>
                            </tbody>
                        </table>
                    </li>
                    <li className='table-responsive'>
                        <code>products-remove.csv</code>
                        <span className={styles.noteDesc}>
                            <b>removes</b> products
                        </span>
                        <table className="table table-striped table-bordered table-hover align-middle text-center">
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">id</th>
                                    <th scope="col">product_code</th>
                                    <th scope="col">product_name</th>
                                    <th scope="col">product_link</th>
                                    <th scope="col">product_img_link</th>
                                    <th scope="col">product_price</th>
                                    <th scope="col">most_popular</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>22292</td>
                                    <td>AB10103</td>
                                    <td>36in x 26in x 14in Molded Shipping Case for Pop-Up Displays w/ Lock (4300 Vault)</td>
                                    <td>https://www.xyzdisplays.com/Molded-Shipping-Case-for-Pop-Up-Displays-with-Lo-p/AB10103.htm</td>
                                    <td>https://www.xyzDisplays.com/v/vspfiles/photos/AB10103-1.jpg</td>
                                    <td>670</td>
                                    <td>7</td>
                                </tr>
                            </tbody>
                        </table>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AllowedFilenamesNote;
