import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AxiosResponse } from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './CsvImportExport.module.scss';
import {
    exportData,
    uploadCSV,
    fetchProductByCode,
    createProductByCode,
    updateProductByCode,
    deleteProductByCode,
    fetchProductFiltersByCode,
    updateProductFilterByCode,
    fetchFilterFieldById,
    createFilterField,
    updateFilterFieldById,
    deleteFilterFieldById,
    fetchCategoryByCategoryId,
    createCategory,
    updateCategoryByCategoryId,
    deleteCategoryByCategoryId,
    fetchEmbedSettings,
    updateEmbedSettings,
    AdminProduct,
    AdminProductPayload,
    AdminProductFilterField,
    AdminFilterFieldPayload,
    AdminCategory,
    AdminCategoryPayload,
} from '../../../api/index';
import Admin from '../../Admin/Admin';
import AllowedFilenamesNote, { isAllowedFileName, getUploadTypeFromName } from './AllowedFiles';
import {
    downloadImportErrorReport,
    getImportErrorPreview,
    ImportErrorRow,
} from '../../../utils/importErrorReport';

const renderSkippedImportToast = (
    skippedCount: number,
    errorRows: ImportErrorRow[],
    onDownload: () => void
) => {
    const preview = getImportErrorPreview(errorRows, 3);

    return (
        <div>
            <p>
                <strong>{skippedCount} product(s) skipped.</strong> Download error report for details.
            </p>
            {preview.length > 0 && (
                <ul style={{ margin: '8px 0', paddingLeft: '18px', textAlign: 'left' }}>
                    {preview.map((row, index) => (
                        <li key={`${row.product_code}-${index}`}>
                            <strong>{row.product_code || '(no code)'}</strong>: {row.reason}
                        </li>
                    ))}
                </ul>
            )}
            <button
                type="button"
                onClick={onDownload}
                style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
            >
                Download Error Report
            </button>
        </div>
    );
};



const CsvImportExport: React.FC = () => {
    type ProductEditorForm = AdminProductPayload & { product_code: string };
    const [file, setFile] = useState<File | null>(null);
    const [selectedExportType, setSelectedExportType] = useState<string>('');
    const [showRules, setShowRules] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [importErrorRows, setImportErrorRows] = useState<ImportErrorRow[] | null>(null);
    const [showFiltersConfirm, setShowFiltersConfirm] = useState(false);
    const [productCode, setProductCode] = useState('');
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [productModalMode, setProductModalMode] = useState<'edit' | 'add'>('edit');
    const [editForm, setEditForm] = useState<ProductEditorForm | null>(null);
    const [isProductLoading, setIsProductLoading] = useState(false);
    const [isProductSaving, setIsProductSaving] = useState(false);
    const [isProductRemoving, setIsProductRemoving] = useState(false);
    const [filterProductCode, setFilterProductCode] = useState('');
    const [isFilterProductLoading, setIsFilterProductLoading] = useState(false);
    const [isFilterProductSaving, setIsFilterProductSaving] = useState(false);
    const [filterFields, setFilterFields] = useState<AdminProductFilterField[]>([]);
    const [selectedFilterKey, setSelectedFilterKey] = useState('');
    const [selectedFilterValue, setSelectedFilterValue] = useState('');
    const [filterFieldDefId, setFilterFieldDefId] = useState('');
    const [showFilterFieldDefEditConfirm, setShowFilterFieldDefEditConfirm] = useState(false);
    const [showFilterFieldDefRemoveConfirm, setShowFilterFieldDefRemoveConfirm] = useState(false);
    const [showFilterFieldDefModal, setShowFilterFieldDefModal] = useState(false);
    const [filterFieldDefModalMode, setFilterFieldDefModalMode] = useState<'edit' | 'add'>('edit');
    const [filterFieldDefForm, setFilterFieldDefForm] = useState<AdminFilterFieldPayload | null>(null);
    const [isFilterFieldDefLoading, setIsFilterFieldDefLoading] = useState(false);
    const [isFilterFieldDefSaving, setIsFilterFieldDefSaving] = useState(false);
    const [isFilterFieldDefRemoving, setIsFilterFieldDefRemoving] = useState(false);
    const [categoryDefId, setCategoryDefId] = useState('');
    const [showCategoryDefEditConfirm, setShowCategoryDefEditConfirm] = useState(false);
    const [showCategoryDefRemoveConfirm, setShowCategoryDefRemoveConfirm] = useState(false);
    const [showCategoryDefModal, setShowCategoryDefModal] = useState(false);
    const [categoryDefModalMode, setCategoryDefModalMode] = useState<'edit' | 'add'>('edit');
    const [categoryDefForm, setCategoryDefForm] = useState<AdminCategoryPayload | null>(null);
    const [isCategoryDefLoading, setIsCategoryDefLoading] = useState(false);
    const [isCategoryDefSaving, setIsCategoryDefSaving] = useState(false);
    const [isCategoryDefRemoving, setIsCategoryDefRemoving] = useState(false);
    const [embedEnabled, setEmbedEnabled] = useState<boolean | null>(null);
    const [isEmbedSettingsLoading, setIsEmbedSettingsLoading] = useState(true);
    const [isEmbedSettingsSaving, setIsEmbedSettingsSaving] = useState(false);
    const [embedToggleStep, setEmbedToggleStep] = useState<1 | 2 | null>(null);
    const [pendingEmbedEnabled, setPendingEmbedEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadEmbedSettings = async () => {
            setIsEmbedSettingsLoading(true);
            try {
                const settings = await fetchEmbedSettings();
                if (!cancelled) {
                    setEmbedEnabled(settings.enabled);
                }
            } catch {
                if (!cancelled) {
                    setEmbedEnabled(true);
                    toast.error('Failed to load Volusion filter status.');
                }
            } finally {
                if (!cancelled) {
                    setIsEmbedSettingsLoading(false);
                }
            }
        };

        void loadEmbedSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    const getFilterInstanceKey = (field: AdminProductFilterField) =>
        `${field.filter_field_id}-${field.value_index}`;
    const getIndexedDisplayName = (fieldName: string, valueIndex: number, totalValues: number) =>
        totalValues > 1 ? `${fieldName} (${valueIndex})` : fieldName;

    const invalid = !!file && !isAllowedFileName(file.name);
    const errorLock = invalid && !showRules;
    const shouldShowNote = showRules || invalid;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const countCSVRows = (file: File): Promise<number> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                if (!text) {
                    resolve(0);
                    return;
                }
                // Count lines, subtract 1 for header row
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const rowCount = Math.max(0, lines.length - 1);
                resolve(rowCount);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    // const getUploadType = (fileName: string): string => {
    //     const cleanFileName = fileName.split('.')[0];

    //     if (cleanFileName === 'products') return 'product';
    //     if (cleanFileName === 'products-remove') return 'product-remove';
    //     if (cleanFileName === 'categories') return 'category';
    //     if (cleanFileName === 'product_categories') return 'product-category';
    //     if (cleanFileName === 'product_filters') return 'product-filter';
    //     if (cleanFileName === 'filter_fields') return 'filter-field';

    //     return 'unknown';
    // };

    const performFileUpload = async (uploadFile: File, uploadType: string) => {
        const formData = new FormData();
        formData.append('file', uploadFile);

        setIsUploading(true);
        setImportErrorRows(null);
        toast.info('Uploading and processing file... Please wait.', { autoClose: false, toastId: 'upload-progress' });

        try {
            console.log("Attempting to upload file", { uploadType });
            const response = await uploadCSV(uploadType, formData);
            console.log("Upload response received:", response);
            const uploadTime = new Date().toLocaleString();
            toast.dismiss('upload-progress');

            const skippedRows: ImportErrorRow[] = response.data?.errorRows ?? [];
            const skippedCount = response.data?.skippedCount ?? skippedRows.length;

            if (skippedRows.length > 0) {
                setImportErrorRows(skippedRows);
                const downloadReport = () => downloadImportErrorReport(skippedRows);
                toast.warning(
                    renderSkippedImportToast(skippedCount, skippedRows, downloadReport),
                    { autoClose: 20000 }
                );
            } else {
                setImportErrorRows(null);
            }

            if (uploadType === 'product-remove') {
                const deleted = response.data.result?.deleted || 0;
                if (skippedRows.length === 0) {
                    toast.success(`File processed successfully. ${deleted} product(s) removed at ${uploadTime}`);
                }
            } else if (skippedRows.length === 0) {
                toast.success(`File uploaded successfully at ${uploadTime}`);
            } else {
                toast.info(`Valid rows were imported at ${uploadTime}`);
            }

            setFile(null);
            const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error("Error during upload:", error);
            toast.dismiss('upload-progress');
            if (axios.isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data;
                const skippedRows: ImportErrorRow[] = errorData.errorRows ?? [];
                if (skippedRows.length > 0) {
                    setImportErrorRows(skippedRows);
                    const skippedCount = errorData.skippedCount ?? skippedRows.length;
                    const downloadReport = () => downloadImportErrorReport(skippedRows);
                    toast.warning(
                        renderSkippedImportToast(skippedCount, skippedRows, downloadReport),
                        { autoClose: 20000 }
                    );
                } else if (errorData.message) {
                    toast.error(errorData.message);
                } else {
                    toast.error('Error uploading file');
                }
            } else if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Error uploading file');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async () => {
        console.log("Upload button clicked", { file });

        if (!file) {
            toast.error('Please select a file!');
            return;
        }

        const fileName = file.name.toLowerCase();
        const uploadType = getUploadTypeFromName(fileName);
        console.log("File information:", { fileName, uploadType, size: file.size });

        if (uploadType === 'unknown') {
            toast.error('Unsupported file name.');
            setShowRules(true);
            return;
        }

        try {
            toast.info('Validating file...', { autoClose: 2000 });
            const rowCount = await countCSVRows(file);

            if (rowCount > 10000) {
                toast.error(
                    <div>
                        <p><strong>File too large!</strong></p>
                        <p>Your file contains <strong>{rowCount.toLocaleString()}</strong> rows.</p>
                        <p>Maximum allowed: <strong>10,000</strong> rows.</p>
                        <p>Please split your file into smaller chunks and upload them separately.</p>
                    </div>,
                    { autoClose: 10000 }
                );
                return;
            }
        } catch (error) {
            toast.error('Failed to validate file. Please try again.');
            return;
        }

        if (uploadType === 'product-filter') {
            setShowFiltersConfirm(true);
            return;
        }

        await performFileUpload(file, uploadType);
    };

    const handleConfirmFiltersUpload = async () => {
        if (!file) return;
        setShowFiltersConfirm(false);
        const uploadType = getUploadTypeFromName(file.name.toLowerCase());
        await performFileUpload(file, uploadType);
    };

    const handleExport = async (type: 'products' | 'categories' | 'product_categories' | 'filter_fields' | 'product_filters') => {
        setIsExporting(true);
        toast.info(`Exporting ${type} data... Please wait.`, { autoClose: false, toastId: 'export-progress' });
        
        try {
            const response: AxiosResponse<Blob> | undefined = await exportData(type);
            toast.dismiss('export-progress');
            
            if (response && response.data) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                const ext = type === 'products' || type === 'product_filters' ? 'xml' : 'csv';
                link.setAttribute('download', `${type}.${ext}`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`${type} data exported successfully!`);
            } else {
                toast.error(`Failed to export ${type} data`);
            }
        } catch (error) {
            toast.dismiss('export-progress');
            toast.error(`Error exporting ${type} data`);
        } finally {
            setIsExporting(false);
        }
    };


    const handleExportClick = () => {
        if (selectedExportType) {
            handleExport(selectedExportType as any);
        } else {
            toast.error('Please select an export type.');
        }
    };

    const getTrimmedProductCode = () => productCode.trim();

    const getApiErrorMessage = (error: unknown, fallback: string) => {
        if (axios.isAxiosError(error) && error.response?.data) {
            const data = error.response.data as { message?: string; error?: string };
            return data.message || data.error || fallback;
        }
        if (error instanceof Error) {
            return error.message;
        }
        return fallback;
    };

    const handleEmbedToggleClick = () => {
        if (embedEnabled === null || isEmbedSettingsLoading) return;
        setPendingEmbedEnabled(!embedEnabled);
        setEmbedToggleStep(1);
    };

    const handleEmbedToggleCancel = () => {
        if (isEmbedSettingsSaving) return;
        setEmbedToggleStep(null);
        setPendingEmbedEnabled(null);
    };

    const handleEmbedToggleStep1Continue = () => {
        setEmbedToggleStep(2);
    };

    const handleEmbedToggleConfirm = async () => {
        if (pendingEmbedEnabled === null) return;

        setIsEmbedSettingsSaving(true);
        try {
            const response = await updateEmbedSettings(pendingEmbedEnabled);
            const enabled = response?.data?.enabled !== false;
            setEmbedEnabled(enabled);
            toast.success(
                enabled
                    ? 'Volusion filter is now visible on category pages.'
                    : 'Volusion filter is now hidden on category pages.'
            );
            setEmbedToggleStep(null);
            setPendingEmbedEnabled(null);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to update Volusion filter status.'));
        } finally {
            setIsEmbedSettingsSaving(false);
        }
    };

    const handleEditProduct = () => {
        if (!getTrimmedProductCode()) {
            toast.error('Please enter a product code.');
            return;
        }
        setShowEditConfirm(true);
    };

    const handleRemoveProduct = () => {
        if (!getTrimmedProductCode()) {
            toast.error('Please enter a product code.');
            return;
        }
        setShowRemoveConfirm(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditForm(null);
    };

    const productToForm = (product: AdminProduct): ProductEditorForm => ({
        product_code: product.product_code,
        product_name: product.product_name,
        product_link: product.product_link,
        product_img_link: product.product_img_link,
        product_price: product.product_price,
        most_popular: product.most_popular ?? '',
        hide_product: product.hide_product || '',
        category_ids: product.category_ids || '',
    });

    const emptyProductForm = (initialCode = ''): ProductEditorForm => ({
        product_code: initialCode,
        product_name: '',
        product_link: '',
        product_img_link: '',
        product_price: '',
        most_popular: '',
        hide_product: '',
        category_ids: '',
    });

    const handleConfirmEdit = async () => {
        const code = getTrimmedProductCode();
        setShowEditConfirm(false);
        setIsProductLoading(true);

        try {
            const response = await fetchProductByCode(code);
            if (!response?.data?.product) {
                toast.error('Product not found.');
                return;
            }
            setProductModalMode('edit');
            setEditForm(productToForm(response.data.product));
            setShowEditModal(true);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to load product.'));
        } finally {
            setIsProductLoading(false);
        }
    };

    const handleSaveProduct = async () => {
        if (!editForm) return;

        const code =
            productModalMode === 'add'
                ? editForm.product_code.trim()
                : getTrimmedProductCode();
        setIsProductSaving(true);

        try {
            const { product_code, ...basePayload } = editForm;
            if (productModalMode === 'add') {
                await createProductByCode({
                    product_code: code,
                    ...basePayload,
                });
                setProductCode(code);
                toast.success(`Product "${code}" created successfully.`);
            } else {
                await updateProductByCode(code, basePayload);
                toast.success(`Product "${code}" updated successfully.`);
            }
            closeEditModal();
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    productModalMode === 'add'
                        ? 'Failed to create product.'
                        : 'Failed to update product.'
                )
            );
        } finally {
            setIsProductSaving(false);
        }
    };

    const handleConfirmRemove = async () => {
        const code = getTrimmedProductCode();
        setShowRemoveConfirm(false);
        setIsProductRemoving(true);

        try {
            await deleteProductByCode(code);
            toast.success(`Product "${code}" removed successfully.`);
            setProductCode('');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to remove product.'));
        } finally {
            setIsProductRemoving(false);
        }
    };

    const updateEditField = (field: keyof ProductEditorForm, value: string) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleAddProduct = () => {
        setProductModalMode('add');
        setEditForm(emptyProductForm(getTrimmedProductCode()));
        setShowEditModal(true);
    };

    const getTrimmedFilterProductCode = () => filterProductCode.trim();

    const handleLoadProductFilters = async () => {
        const code = getTrimmedFilterProductCode();
        if (!code) {
            toast.error('Please enter a product code.');
            return;
        }

        setIsFilterProductLoading(true);
        try {
            const response = await fetchProductFiltersByCode(code);
            const filters = response?.data?.filters ?? [];

            setFilterFields(filters);
            if (filters.length > 0) {
                const first = filters[0];
                setSelectedFilterKey(getFilterInstanceKey(first));
                setSelectedFilterValue(
                    first.current_value || first.allowed_values[0] || ''
                );
            } else {
                setSelectedFilterKey('');
                setSelectedFilterValue('');
            }
            toast.success(`Loaded ${filters.length} filter field(s) for "${code}".`);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to load product filters.'));
        } finally {
            setIsFilterProductLoading(false);
        }
    };

    const getSelectedFilterField = () =>
        filterFields.find((field) => getFilterInstanceKey(field) === selectedFilterKey);

    const getFilterValueOptions = (field: AdminProductFilterField | undefined) => {
        if (!field) return [];
        return field.allowed_values || [];
    };

    const handleFilterFieldChange = (nextKey: string) => {
        setSelectedFilterKey(nextKey);
        const match = filterFields.find((field) => getFilterInstanceKey(field) === nextKey);
        setSelectedFilterValue(
            match?.current_value || match?.allowed_values[0] || ''
        );
    };

    const handleAddFilterValueInstance = () => {
        const selected = getSelectedFilterField();
        if (!selected) {
            toast.error('Please select a filter field first.');
            return;
        }

        setFilterFields((prev) => {
            const sameFieldEntries = prev
                .filter((field) => field.filter_field_id === selected.filter_field_id)
                .sort((a, b) => a.value_index - b.value_index);
            const nextIndex = (sameFieldEntries.at(-1)?.value_index || 0) + 1;

            const updatedExisting = prev.map((field) => {
                if (field.filter_field_id !== selected.filter_field_id) return field;
                return {
                    ...field,
                    display_name: getIndexedDisplayName(
                        field.field_name,
                        field.value_index,
                        sameFieldEntries.length + 1
                    ),
                };
            });

            const newEntry: AdminProductFilterField = {
                ...selected,
                value_index: nextIndex,
                display_name: getIndexedDisplayName(
                    selected.field_name,
                    nextIndex,
                    sameFieldEntries.length + 1
                ),
                current_value: '',
            };

            return [...updatedExisting, newEntry];
        });

        const nextIndex =
            Math.max(
                ...filterFields
                    .filter((field) => field.filter_field_id === selected.filter_field_id)
                    .map((field) => field.value_index),
                0
            ) + 1;
        setSelectedFilterKey(`${selected.filter_field_id}-${nextIndex}`);
        setSelectedFilterValue(selected.allowed_values[0] || '');
    };

    const handleSaveProductFilter = async () => {
        const code = getTrimmedFilterProductCode();
        if (!code) {
            toast.error('Please enter a product code.');
            return;
        }
        const selected = getSelectedFilterField();
        if (!selected) {
            toast.error('Please select a filter field.');
            return;
        }

        setIsFilterProductSaving(true);
        try {
            const response = await updateProductFilterByCode(code, {
                filter_field_id: selected.filter_field_id,
                value_index: selected.value_index,
                filter_value: selectedFilterValue,
            });
            const updated = response?.data?.filters ?? filterFields;
            setFilterFields(updated);
            const nextSelected =
                updated.find((field) => getFilterInstanceKey(field) === selectedFilterKey) ||
                updated.find(
                    (field) =>
                        field.filter_field_id === selected.filter_field_id &&
                        field.value_index === selected.value_index
                );
            if (nextSelected) {
                setSelectedFilterKey(getFilterInstanceKey(nextSelected));
                setSelectedFilterValue(nextSelected.current_value || '');
            }
            toast.success('Product filter updated successfully.');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to update product filter.'));
        } finally {
            setIsFilterProductSaving(false);
        }
    };

    const getTrimmedFilterFieldDefId = () => filterFieldDefId.trim();

    const emptyFilterFieldDefForm = (): AdminFilterFieldPayload => ({
        id: '',
        field_name: '',
        field_type: 'checkbox',
        allowed_values: '',
        sort_order: 0,
    });

    const filterFieldToForm = (field: {
        id: number;
        field_name: string;
        field_type: string;
        allowed_values: string;
        sort_order: number;
    }): AdminFilterFieldPayload => ({
        id: field.id,
        field_name: field.field_name,
        field_type: field.field_type,
        allowed_values: field.allowed_values || '',
        sort_order: field.sort_order ?? 0,
    });

    const closeFilterFieldDefModal = () => {
        setShowFilterFieldDefModal(false);
        setFilterFieldDefForm(null);
    };

    const updateFilterFieldDefForm = (field: keyof AdminFilterFieldPayload, value: string | number) => {
        setFilterFieldDefForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleAddFilterFieldDef = () => {
        setFilterFieldDefModalMode('add');
        setFilterFieldDefForm(emptyFilterFieldDefForm());
        setShowFilterFieldDefModal(true);
    };

    const handleEditFilterFieldDef = () => {
        if (!getTrimmedFilterFieldDefId()) {
            toast.error('Please enter a filter field ID.');
            return;
        }
        setShowFilterFieldDefEditConfirm(true);
    };

    const handleRemoveFilterFieldDef = () => {
        if (!getTrimmedFilterFieldDefId()) {
            toast.error('Please enter a filter field ID.');
            return;
        }
        setShowFilterFieldDefRemoveConfirm(true);
    };

    const handleConfirmFilterFieldDefEdit = async () => {
        const id = getTrimmedFilterFieldDefId();
        setShowFilterFieldDefEditConfirm(false);
        setIsFilterFieldDefLoading(true);

        try {
            const response = await fetchFilterFieldById(id);
            if (!response?.data?.filter_field) {
                toast.error('Filter field not found.');
                return;
            }
            setFilterFieldDefModalMode('edit');
            setFilterFieldDefForm(filterFieldToForm(response.data.filter_field));
            setShowFilterFieldDefModal(true);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to load filter field.'));
        } finally {
            setIsFilterFieldDefLoading(false);
        }
    };

    const handleSaveFilterFieldDef = async () => {
        if (!filterFieldDefForm) return;

        setIsFilterFieldDefSaving(true);
        try {
            if (filterFieldDefModalMode === 'add') {
                await createFilterField(filterFieldDefForm);
                toast.success('Filter field created successfully.');
                if (filterFieldDefForm.id) {
                    setFilterFieldDefId(String(filterFieldDefForm.id));
                }
            } else {
                const id = getTrimmedFilterFieldDefId();
                await updateFilterFieldById(id, {
                    field_name: filterFieldDefForm.field_name,
                    field_type: filterFieldDefForm.field_type,
                    allowed_values: filterFieldDefForm.allowed_values,
                    sort_order: filterFieldDefForm.sort_order,
                });
                toast.success(`Filter field "${id}" updated successfully.`);
            }
            closeFilterFieldDefModal();
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    filterFieldDefModalMode === 'add'
                        ? 'Failed to create filter field.'
                        : 'Failed to update filter field.'
                )
            );
        } finally {
            setIsFilterFieldDefSaving(false);
        }
    };

    const handleConfirmFilterFieldDefRemove = async () => {
        const id = getTrimmedFilterFieldDefId();
        setShowFilterFieldDefRemoveConfirm(false);
        setIsFilterFieldDefRemoving(true);

        try {
            await deleteFilterFieldById(id);
            toast.success(`Filter field "${id}" removed successfully.`);
            setFilterFieldDefId('');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to remove filter field.'));
        } finally {
            setIsFilterFieldDefRemoving(false);
        }
    };

    const getTrimmedCategoryDefId = () => categoryDefId.trim();

    const emptyCategoryDefForm = (): AdminCategoryPayload => ({
        category_id: '',
        category_name: '',
    });

    const categoryToForm = (category: AdminCategory): AdminCategoryPayload => ({
        category_id: category.category_id,
        category_name: category.category_name,
    });

    const closeCategoryDefModal = () => {
        setShowCategoryDefModal(false);
        setCategoryDefForm(null);
    };

    const updateCategoryDefForm = (field: keyof AdminCategoryPayload, value: string | number) => {
        setCategoryDefForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleAddCategoryDef = () => {
        setCategoryDefModalMode('add');
        setCategoryDefForm(emptyCategoryDefForm());
        setShowCategoryDefModal(true);
    };

    const handleEditCategoryDef = () => {
        if (!getTrimmedCategoryDefId()) {
            toast.error('Please enter a category ID.');
            return;
        }
        setShowCategoryDefEditConfirm(true);
    };

    const handleRemoveCategoryDef = () => {
        if (!getTrimmedCategoryDefId()) {
            toast.error('Please enter a category ID.');
            return;
        }
        setShowCategoryDefRemoveConfirm(true);
    };

    const handleConfirmCategoryDefEdit = async () => {
        const categoryId = getTrimmedCategoryDefId();
        setShowCategoryDefEditConfirm(false);
        setIsCategoryDefLoading(true);

        try {
            const response = await fetchCategoryByCategoryId(categoryId);
            if (!response?.data?.category) {
                toast.error('Category not found.');
                return;
            }
            setCategoryDefModalMode('edit');
            setCategoryDefForm(categoryToForm(response.data.category));
            setShowCategoryDefModal(true);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to load category.'));
        } finally {
            setIsCategoryDefLoading(false);
        }
    };

    const handleSaveCategoryDef = async () => {
        if (!categoryDefForm) return;

        setIsCategoryDefSaving(true);
        try {
            if (categoryDefModalMode === 'add') {
                if (!String(categoryDefForm.category_id ?? '').trim()) {
                    toast.error('Category ID is required.');
                    return;
                }
                await createCategory(categoryDefForm);
                toast.success('Category created successfully.');
                setCategoryDefId(String(categoryDefForm.category_id));
            } else {
                const categoryId = getTrimmedCategoryDefId();
                await updateCategoryByCategoryId(categoryId, {
                    category_name: categoryDefForm.category_name,
                });
                toast.success(`Category "${categoryId}" updated successfully.`);
            }
            closeCategoryDefModal();
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    categoryDefModalMode === 'add'
                        ? 'Failed to create category.'
                        : 'Failed to update category.'
                )
            );
        } finally {
            setIsCategoryDefSaving(false);
        }
    };

    const handleConfirmCategoryDefRemove = async () => {
        const categoryId = getTrimmedCategoryDefId();
        setShowCategoryDefRemoveConfirm(false);
        setIsCategoryDefRemoving(true);

        try {
            await deleteCategoryByCategoryId(categoryId);
            toast.success(`Category "${categoryId}" removed successfully.`);
            setCategoryDefId('');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to remove category.'));
        } finally {
            setIsCategoryDefRemoving(false);
        }
    };

    return (
        <div className={styles['csv-import-export']}>

            <ToastContainer
                position="top-right"
                autoClose={15000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <Admin />
            <section className={styles.embedSettingsPanel}>
                <h2 className={styles.sectionTitle}>Volusion Filter</h2>
                <p className={styles.embedSettingsDesc}>
                    Control whether the filter app appears on Volusion category pages.
                    Visitors may need to refresh the page for changes to take effect.
                </p>
                <div className={styles.embedSettingsStatusRow}>
                    <span className={styles.embedSettingsLabel}>Current status:</span>
                    {isEmbedSettingsLoading ? (
                        <span className={styles.embedSettingsLoading}>Loading...</span>
                    ) : (
                        <span
                            className={
                                embedEnabled ? styles.embedStatusOn : styles.embedStatusOff
                            }
                        >
                            {embedEnabled ? 'Visible on Volusion' : 'Hidden on Volusion'}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    className={embedEnabled ? styles.embedHideBtn : styles.embedShowBtn}
                    onClick={handleEmbedToggleClick}
                    disabled={
                        isEmbedSettingsLoading ||
                        isEmbedSettingsSaving ||
                        embedEnabled === null
                    }
                >
                    {isEmbedSettingsLoading
                        ? 'Loading...'
                        : embedEnabled
                          ? 'Hide filter on Volusion'
                          : 'Show filter on Volusion'}
                </button>
            </section>
            <h2>Import CSV</h2>
            <input 
                type="file" 
                onChange={handleFileChange} 
                disabled={isUploading} 
                id="csv-file-input"
            />
            <button 
                onClick={handleFileUpload} 
                disabled={!file || invalid || isUploading}
                style={{ 
                    padding: '8px 16px', 
                    margin: '10px 0', 
                    cursor: !file || invalid || isUploading ? 'not-allowed' : 'pointer',
                    backgroundColor: !file ? '#cccccc' : invalid ? '#ffcccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}
                id="import-csv-button"
            >
                {isUploading ? 'Uploading...' : 'Import CSV'}
            </button>
            <button
                type="button"
                className={styles.linkBtn}
                disabled={errorLock || isUploading}                       
                aria-disabled={errorLock || isUploading}
                onClick={() => setShowRules(v => !v)}
            >
                {showRules ? 'Hide allowed import names' : 'Show allowed import names'}
            </button>
            {importErrorRows && importErrorRows.length > 0 && (
                <div className={styles.importErrorPanel} role="alert">
                    <p className={styles.importErrorTitle}>
                        {importErrorRows.length} product(s) skipped. Download error report for details.
                    </p>
                    <ul className={styles.importErrorPreview}>
                        {getImportErrorPreview(importErrorRows, 3).map((row, index) => (
                            <li key={`${row.product_code}-${index}`}>
                                <strong>{row.product_code || '(no code)'}</strong>: {row.reason}
                            </li>
                        ))}
                    </ul>
                    <div className={styles.importErrorActions}>
                        <button
                            type="button"
                            className={styles.downloadErrorBtn}
                            onClick={() => downloadImportErrorReport(importErrorRows)}
                        >
                            Download Error Report
                        </button>
                        <button
                            type="button"
                            className={styles.dismissErrorBtn}
                            onClick={() => setImportErrorRows(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
            <h2>Export Data</h2>
            <div className={styles['export-buttons']}>
                <label htmlFor="exportType">Select Export Type:</label>
                <select
                    id="exportType"
                    value={selectedExportType}
                    onChange={(e) => setSelectedExportType(e.target.value)}
                    disabled={isExporting}
                >
                    <option value="">--Select an option--</option>
                    <option value="products">Export Products (XML)</option>
                    <option value="categories">Export Categories</option>
                    <option value="product_categories">Export Product Categories</option>
                    <option value="filter_fields">Export Filter Fields</option>
                    <option value="product_filters">Export Product Filters (XML)</option>
                </select>
                <button onClick={handleExportClick} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export'}
                </button>
            </div>
            {shouldShowNote && (
                <div className={styles.noteWrap}>
                    <AllowedFilenamesNote
                        file={file}
                        open={showRules}
                        onClose={() => setShowRules(false)}
                    />
                </div>
            )}
            {showFiltersConfirm && file && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="filters-import-confirm-title"
                    onClick={() => setShowFiltersConfirm(false)}
                >
                    <div
                        className={styles.confirmDialog}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.confirmHeader}>
                            <div className={styles.confirmIcon} aria-hidden="true">!</div>
                            <div>
                                <h3 id="filters-import-confirm-title" className={styles.confirmTitle}>
                                    Confirm product filters import
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Please review how this upload will affect your data.
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <ul className={styles.confirmList}>
                                <li>
                                    <strong>Columns in your file</strong> will overwrite existing filter
                                    values for those products.
                                </li>
                                <li>
                                    <strong>Columns not included</strong> in the file will not be changed —
                                    existing values stay as they are.
                                </li>
                                <li>
                                    <strong>Empty cells</strong> in an included column will clear that
                                    filter field for the product.
                                </li>
                            </ul>
                            <div className={styles.confirmFileName}>
                                File: <strong>{file.name}</strong>
                            </div>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowFiltersConfirm(false)}
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleConfirmFiltersUpload}
                                disabled={isUploading}
                            >
                                Yes, import filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <br></br>
            <h2 className={styles.sectionTitle}>
                Edit / Add / Remove Single Product
                <span className={styles.infoIconWrapper}>
                    <span
                        className={styles.infoIcon}
                        tabIndex={0}
                        aria-describedby="edit-remove-product-info"
                    >
                        ?
                    </span>
                    <span id="edit-remove-product-info" className={styles.infoTooltip} role="tooltip">
                        Enter a product code to load and edit an existing product, add a new
                        product, or remove one from the catalog without uploading a CSV.
                    </span>
                </span>
            </h2>
            <div className={styles['edit-remove-product']}>
                <label htmlFor="product-code-input" className={styles.productCodeLabel}>
                    Product code
                </label>
                <input
                    id="product-code-input"
                    type="text"
                    placeholder="Enter product code"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    disabled={isProductLoading || isProductSaving || isProductRemoving}
                    className={styles.productCodeInput}
                />
                <div className={styles.productActionButtons}>
                    <button
                        type="button"
                        onClick={handleEditProduct}
                        disabled={!getTrimmedProductCode() || isProductLoading || isProductSaving || isProductRemoving}
                        className={styles.editProductBtn}
                    >
                        {isProductLoading ? 'Loading...' : 'Edit Product'}
                    </button>
                    <button
                        type="button"
                        onClick={handleAddProduct}
                        disabled={isProductLoading || isProductSaving || isProductRemoving}
                        className={styles.editProductBtn}
                    >
                        Add New Product
                    </button>
                    <button
                        type="button"
                        onClick={handleRemoveProduct}
                        disabled={!getTrimmedProductCode() || isProductLoading || isProductSaving || isProductRemoving}
                        className={styles.removeProductBtn}
                    >
                        {isProductRemoving ? 'Removing...' : 'Remove Product'}
                    </button>
                </div>
            </div>
            {showEditConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-product-confirm-title"
                    onClick={() => setShowEditConfirm(false)}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={styles.confirmIcon} aria-hidden="true">!</div>
                            <div>
                                <h3 id="edit-product-confirm-title" className={styles.confirmTitle}>
                                    Confirm product edit
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Load product <strong>{getTrimmedProductCode()}</strong> for editing?
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                You will be able to update product details, categories, and visibility.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowEditConfirm(false)}
                                disabled={isProductLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleConfirmEdit}
                                disabled={isProductLoading}
                            >
                                {isProductLoading ? 'Loading...' : 'Yes, load product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showRemoveConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="remove-product-confirm-title"
                    onClick={() => !isProductRemoving && setShowRemoveConfirm(false)}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={`${styles.confirmIcon} ${styles.confirmIconDanger}`} aria-hidden="true">!</div>
                            <div>
                                <h3 id="remove-product-confirm-title" className={styles.confirmTitle}>
                                    Confirm product removal
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Permanently remove product <strong>{getTrimmedProductCode()}</strong>?
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                This action cannot be undone. Related categories and filters will also be removed.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowRemoveConfirm(false)}
                                disabled={isProductRemoving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmDangerBtn}
                                onClick={handleConfirmRemove}
                                disabled={isProductRemoving}
                            >
                                {isProductRemoving ? 'Removing...' : 'Yes, remove product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showEditModal && editForm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-product-modal-title"
                    onClick={() => !isProductSaving && closeEditModal()}
                >
                    <div
                        className={`${styles.confirmDialog} ${styles.editProductDialog}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.confirmHeader}>
                            <div>
                                <h3 id="edit-product-modal-title" className={styles.confirmTitle}>
                                    {productModalMode === 'add' ? 'Add product' : 'Edit product'}
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Product code:{' '}
                                    <strong>
                                        {productModalMode === 'add'
                                            ? editForm.product_code
                                            : getTrimmedProductCode()}
                                    </strong>
                                </p>
                            </div>
                        </div>
                        <div className={styles.editProductForm}>
                            {productModalMode === 'add' && (
                                <label>
                                    Product code
                                    <input
                                        type="text"
                                        value={editForm.product_code}
                                        onChange={(e) => updateEditField('product_code', e.target.value)}
                                        disabled={isProductSaving}
                                    />
                                </label>
                            )}
                            <label>
                                Product name
                                <input
                                    type="text"
                                    value={editForm.product_name}
                                    onChange={(e) => updateEditField('product_name', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                            <label>
                                Product link
                                <input
                                    type="text"
                                    value={editForm.product_link}
                                    onChange={(e) => updateEditField('product_link', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                            <label>
                                Image link
                                <input
                                    type="text"
                                    value={editForm.product_img_link}
                                    onChange={(e) => updateEditField('product_img_link', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                            <label>
                                Price
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.product_price}
                                    onChange={(e) => updateEditField('product_price', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                            <label>
                                Most popular
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.most_popular ?? ''}
                                    onChange={(e) => updateEditField('most_popular', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                            <label>
                                Hide product (Y or blank)
                                <input
                                    type="text"
                                    value={editForm.hide_product ?? ''}
                                    onChange={(e) => updateEditField('hide_product', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                            <label>
                                Category IDs (comma-separated)
                                <input
                                    type="text"
                                    value={editForm.category_ids}
                                    onChange={(e) => updateEditField('category_ids', e.target.value)}
                                    disabled={isProductSaving}
                                />
                            </label>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={closeEditModal}
                                disabled={isProductSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleSaveProduct}
                                disabled={
                                    isProductSaving ||
                                    (productModalMode === 'add' && !editForm.product_code.trim())
                                }
                            >
                                {isProductSaving
                                    ? 'Saving...'
                                    : productModalMode === 'add'
                                      ? 'Create product'
                                      : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <h2 className={styles.sectionTitle}>
                Product Filter Edit Single Product
                <span className={styles.infoIconWrapper}>
                    <span
                        className={styles.infoIcon}
                        tabIndex={0}
                        aria-describedby="product-filter-edit-info"
                    >
                        ?
                    </span>
                    <span id="product-filter-edit-info" className={styles.infoTooltip} role="tooltip">
                        Enter a product code to load its filter fields, update values from allowed
                        options, add extra value instances, and save changes without uploading a CSV.
                    </span>
                </span>
            </h2>
            <div className={styles['edit-remove-product']}>
                <label htmlFor="product-filter-code-input" className={styles.productCodeLabel}>
                    Product code
                </label>
                <input
                    id="product-filter-code-input"
                    type="text"
                    placeholder="Enter product code"
                    value={filterProductCode}
                    onChange={(e) => setFilterProductCode(e.target.value)}
                    disabled={isFilterProductLoading || isFilterProductSaving}
                    className={styles.productCodeInput}
                />
                <div className={styles.productActionButtons}>
                    <button
                        type="button"
                        onClick={handleLoadProductFilters}
                        disabled={!getTrimmedFilterProductCode() || isFilterProductLoading || isFilterProductSaving}
                        className={styles.editProductBtn}
                    >
                        {isFilterProductLoading ? 'Loading...' : 'Load Product Filters'}
                    </button>
                </div>
                {filterFields.length > 0 && (
                    <div className={styles.productFilterEditor}>
                        <label>
                            Filter field
                            <select
                                value={selectedFilterKey}
                                onChange={(e) => handleFilterFieldChange(e.target.value)}
                                disabled={isFilterProductSaving}
                            >
                                {filterFields.map((field) => (
                                    <option
                                        key={getFilterInstanceKey(field)}
                                        value={getFilterInstanceKey(field)}
                                    >
                                        {field.display_name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className={styles.productFilterExtraActions}>
                            <button
                                type="button"
                                onClick={handleAddFilterValueInstance}
                                disabled={!selectedFilterKey || isFilterProductSaving}
                                className={styles.confirmCancelBtn}
                            >
                                Add New Value For This Field
                            </button>
                        </div>
                        <label>
                            Filter value
                            <select
                                value={selectedFilterValue}
                                onChange={(e) => setSelectedFilterValue(e.target.value)}
                                disabled={isFilterProductSaving}
                            >
                                {getFilterValueOptions(getSelectedFilterField()).map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={handleSaveProductFilter}
                            disabled={!selectedFilterKey || isFilterProductSaving}
                            className={styles.confirmProceedBtn}
                        >
                            {isFilterProductSaving ? 'Saving...' : 'Save Filter Value'}
                        </button>
                    </div>
                )}
            </div>

            <h2 className={styles.sectionTitle}>
                Edit / Add / Remove Filter Fields
                <span className={styles.infoIconWrapper}>
                    <span
                        className={styles.infoIcon}
                        tabIndex={0}
                        aria-describedby="filter-fields-admin-info"
                    >
                        ?
                    </span>
                    <span id="filter-fields-admin-info" className={styles.infoTooltip} role="tooltip">
                        Manage filter field definitions (name, type, allowed values, sort order) by ID.
                        Add new fields, edit existing ones, or remove them without uploading a CSV.
                    </span>
                </span>
            </h2>
            <div className={styles['edit-remove-product']}>
                <label htmlFor="filter-field-id-input" className={styles.productCodeLabel}>
                    Filter field ID
                </label>
                <input
                    id="filter-field-id-input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter filter field ID"
                    value={filterFieldDefId}
                    onChange={(e) => setFilterFieldDefId(e.target.value.toLowerCase())}
                    disabled={
                        isFilterFieldDefLoading ||
                        isFilterFieldDefSaving ||
                        isFilterFieldDefRemoving
                    }
                    className={styles.productCodeInput}
                />
                <div className={styles.productActionButtons}>
                    <button
                        type="button"
                        onClick={handleEditFilterFieldDef}
                        disabled={
                            !getTrimmedFilterFieldDefId() ||
                            isFilterFieldDefLoading ||
                            isFilterFieldDefSaving ||
                            isFilterFieldDefRemoving
                        }
                        className={styles.editProductBtn}
                    >
                        {isFilterFieldDefLoading ? 'Loading...' : 'Edit Filter Field'}
                    </button>
                    <button
                        type="button"
                        onClick={handleAddFilterFieldDef}
                        disabled={
                            isFilterFieldDefLoading ||
                            isFilterFieldDefSaving ||
                            isFilterFieldDefRemoving
                        }
                        className={styles.editProductBtn}
                    >
                        Add Filter Field
                    </button>
                    <button
                        type="button"
                        onClick={handleRemoveFilterFieldDef}
                        disabled={
                            !getTrimmedFilterFieldDefId() ||
                            isFilterFieldDefLoading ||
                            isFilterFieldDefSaving ||
                            isFilterFieldDefRemoving
                        }
                        className={styles.removeProductBtn}
                    >
                        {isFilterFieldDefRemoving ? 'Removing...' : 'Remove Filter Field'}
                    </button>
                </div>
            </div>
            {showFilterFieldDefEditConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-filter-field-confirm-title"
                    onClick={() => setShowFilterFieldDefEditConfirm(false)}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={styles.confirmIcon} aria-hidden="true">!</div>
                            <div>
                                <h3 id="edit-filter-field-confirm-title" className={styles.confirmTitle}>
                                    Confirm filter field edit
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Load filter field <strong>{getTrimmedFilterFieldDefId()}</strong> for editing?
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                You will be able to update the field name, type, allowed values, and sort order.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowFilterFieldDefEditConfirm(false)}
                                disabled={isFilterFieldDefLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleConfirmFilterFieldDefEdit}
                                disabled={isFilterFieldDefLoading}
                            >
                                {isFilterFieldDefLoading ? 'Loading...' : 'Yes, load field'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showFilterFieldDefRemoveConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="remove-filter-field-confirm-title"
                    onClick={() => !isFilterFieldDefRemoving && setShowFilterFieldDefRemoveConfirm(false)}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={`${styles.confirmIcon} ${styles.confirmIconDanger}`} aria-hidden="true">!</div>
                            <div>
                                <h3 id="remove-filter-field-confirm-title" className={styles.confirmTitle}>
                                    Confirm filter field removal
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Permanently remove filter field <strong>{getTrimmedFilterFieldDefId()}</strong>?
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                This action cannot be undone. Related product filter values for this field will also be removed.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowFilterFieldDefRemoveConfirm(false)}
                                disabled={isFilterFieldDefRemoving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmDangerBtn}
                                onClick={handleConfirmFilterFieldDefRemove}
                                disabled={isFilterFieldDefRemoving}
                            >
                                {isFilterFieldDefRemoving ? 'Removing...' : 'Yes, remove field'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showFilterFieldDefModal && filterFieldDefForm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="filter-field-modal-title"
                    onClick={() => !isFilterFieldDefSaving && closeFilterFieldDefModal()}
                >
                    <div
                        className={`${styles.confirmDialog} ${styles.editProductDialog}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.confirmHeader}>
                            <div>
                                <h3 id="filter-field-modal-title" className={styles.confirmTitle}>
                                    {filterFieldDefModalMode === 'add' ? 'Add filter field' : 'Edit filter field'}
                                </h3>
                                {filterFieldDefModalMode === 'edit' && (
                                    <p className={styles.confirmSubtitle}>
                                        Filter field ID: <strong>{getTrimmedFilterFieldDefId()}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={styles.editProductForm}>
                            {filterFieldDefModalMode === 'add' && (
                                <label>
                                    ID (optional)
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={filterFieldDefForm.id ?? ''}
                                        onChange={(e) => updateFilterFieldDefForm('id', e.target.value)}
                                        disabled={isFilterFieldDefSaving}
                                        placeholder="Leave blank for auto ID"
                                    />
                                </label>
                            )}
                            <label>
                                Field name
                                <input
                                    type="text"
                                    value={filterFieldDefForm.field_name}
                                    onChange={(e) => updateFilterFieldDefForm('field_name', e.target.value)}
                                    disabled={isFilterFieldDefSaving}
                                />
                            </label>
                            <label>
                                Field type
                                <select
                                    value={filterFieldDefForm.field_type}
                                    onChange={(e) => updateFilterFieldDefForm('field_type', e.target.value)}
                                    disabled={isFilterFieldDefSaving}
                                >
                                    <option value="checkbox">checkbox</option>
                                    <option value="range">range</option>
                                </select>
                            </label>
                            <label>
                                Allowed values (comma-separated)
                                <input
                                    type="text"
                                    value={filterFieldDefForm.allowed_values}
                                    onChange={(e) => updateFilterFieldDefForm('allowed_values', e.target.value)}
                                    disabled={isFilterFieldDefSaving}
                                    placeholder="e.g. 0-5000 lb,Other"
                                />
                            </label>
                            <label>
                                Sort order
                                <input
                                    type="number"
                                    step="1"
                                    value={filterFieldDefForm.sort_order}
                                    onChange={(e) => updateFilterFieldDefForm('sort_order', e.target.value)}
                                    disabled={isFilterFieldDefSaving}
                                />
                            </label>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={closeFilterFieldDefModal}
                                disabled={isFilterFieldDefSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleSaveFilterFieldDef}
                                disabled={isFilterFieldDefSaving || !filterFieldDefForm.field_name.trim()}
                            >
                                {isFilterFieldDefSaving
                                    ? 'Saving...'
                                    : filterFieldDefModalMode === 'add'
                                      ? 'Create field'
                                      : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className={styles.sectionTitle}>
                Edit / Add / Remove Categories
                <span className={styles.infoIconWrapper}>
                    <span
                        className={styles.infoIcon}
                        tabIndex={0}
                        aria-describedby="categories-admin-info"
                    >
                        ?
                    </span>
                    <span id="categories-admin-info" className={styles.infoTooltip} role="tooltip">
                        Manage category definitions by category ID. Add new categories, edit names,
                        or remove them without uploading a CSV.
                    </span>
                </span>
            </h2>
            <div className={styles['edit-remove-product']}>
                <label htmlFor="category-id-input" className={styles.productCodeLabel}>
                    Category ID
                </label>
                <input
                    id="category-id-input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter category ID"
                    value={categoryDefId}
                    onChange={(e) => setCategoryDefId(e.target.value)}
                    disabled={
                        isCategoryDefLoading ||
                        isCategoryDefSaving ||
                        isCategoryDefRemoving
                    }
                    className={styles.productCodeInput}
                />
                <div className={styles.productActionButtons}>
                    <button
                        type="button"
                        onClick={handleEditCategoryDef}
                        disabled={
                            !getTrimmedCategoryDefId() ||
                            isCategoryDefLoading ||
                            isCategoryDefSaving ||
                            isCategoryDefRemoving
                        }
                        className={styles.editProductBtn}
                    >
                        {isCategoryDefLoading ? 'Loading...' : 'Edit Category'}
                    </button>
                    <button
                        type="button"
                        onClick={handleAddCategoryDef}
                        disabled={
                            isCategoryDefLoading ||
                            isCategoryDefSaving ||
                            isCategoryDefRemoving
                        }
                        className={styles.editProductBtn}
                    >
                        Add Category
                    </button>
                    <button
                        type="button"
                        onClick={handleRemoveCategoryDef}
                        disabled={
                            !getTrimmedCategoryDefId() ||
                            isCategoryDefLoading ||
                            isCategoryDefSaving ||
                            isCategoryDefRemoving
                        }
                        className={styles.removeProductBtn}
                    >
                        {isCategoryDefRemoving ? 'Removing...' : 'Remove Category'}
                    </button>
                </div>
            </div>
            {showCategoryDefEditConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-category-confirm-title"
                    onClick={() => setShowCategoryDefEditConfirm(false)}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={styles.confirmIcon} aria-hidden="true">!</div>
                            <div>
                                <h3 id="edit-category-confirm-title" className={styles.confirmTitle}>
                                    Confirm category edit
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Load category <strong>{getTrimmedCategoryDefId()}</strong> for editing?
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                You will be able to update the category name.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowCategoryDefEditConfirm(false)}
                                disabled={isCategoryDefLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleConfirmCategoryDefEdit}
                                disabled={isCategoryDefLoading}
                            >
                                {isCategoryDefLoading ? 'Loading...' : 'Yes, load category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showCategoryDefRemoveConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="remove-category-confirm-title"
                    onClick={() => !isCategoryDefRemoving && setShowCategoryDefRemoveConfirm(false)}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={`${styles.confirmIcon} ${styles.confirmIconDanger}`} aria-hidden="true">!</div>
                            <div>
                                <h3 id="remove-category-confirm-title" className={styles.confirmTitle}>
                                    Confirm category removal
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    Permanently remove category <strong>{getTrimmedCategoryDefId()}</strong>?
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                This action cannot be undone. Product links to this category will also be removed.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowCategoryDefRemoveConfirm(false)}
                                disabled={isCategoryDefRemoving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmDangerBtn}
                                onClick={handleConfirmCategoryDefRemove}
                                disabled={isCategoryDefRemoving}
                            >
                                {isCategoryDefRemoving ? 'Removing...' : 'Yes, remove category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showCategoryDefModal && categoryDefForm && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="category-modal-title"
                    onClick={() => !isCategoryDefSaving && closeCategoryDefModal()}
                >
                    <div
                        className={`${styles.confirmDialog} ${styles.editProductDialog}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.confirmHeader}>
                            <div>
                                <h3 id="category-modal-title" className={styles.confirmTitle}>
                                    {categoryDefModalMode === 'add' ? 'Add category' : 'Edit category'}
                                </h3>
                                {categoryDefModalMode === 'edit' && (
                                    <p className={styles.confirmSubtitle}>
                                        Category ID: <strong>{getTrimmedCategoryDefId()}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={styles.editProductForm}>
                            {categoryDefModalMode === 'add' && (
                                <label>
                                    Category ID
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={categoryDefForm.category_id ?? ''}
                                        onChange={(e) => updateCategoryDefForm('category_id', e.target.value)}
                                        disabled={isCategoryDefSaving}
                                    />
                                </label>
                            )}
                            <label>
                                Category name
                                <input
                                    type="text"
                                    value={categoryDefForm.category_name}
                                    onChange={(e) => updateCategoryDefForm('category_name', e.target.value)}
                                    disabled={isCategoryDefSaving}
                                />
                            </label>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={closeCategoryDefModal}
                                disabled={isCategoryDefSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleSaveCategoryDef}
                                disabled={
                                    isCategoryDefSaving ||
                                    !categoryDefForm.category_name.trim() ||
                                    (categoryDefModalMode === 'add' &&
                                        !String(categoryDefForm.category_id ?? '').trim())
                                }
                            >
                                {isCategoryDefSaving
                                    ? 'Saving...'
                                    : categoryDefModalMode === 'add'
                                      ? 'Create category'
                                      : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {embedToggleStep === 1 && pendingEmbedEnabled !== null && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="embed-toggle-step1-title"
                    onClick={handleEmbedToggleCancel}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div className={styles.confirmIcon} aria-hidden="true">!</div>
                            <div>
                                <h3 id="embed-toggle-step1-title" className={styles.confirmTitle}>
                                    {pendingEmbedEnabled
                                        ? 'Show filter on Volusion?'
                                        : 'Hide filter on Volusion?'}
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    {pendingEmbedEnabled
                                        ? 'This will mount the filter sidebar and product panel on Volusion category pages.'
                                        : 'This will stop the filter app from loading on Volusion category pages.'}
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                You will be asked to confirm once more before this change is saved.
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={handleEmbedToggleCancel}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleEmbedToggleStep1Continue}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {embedToggleStep === 2 && pendingEmbedEnabled !== null && (
                <div
                    className={styles.confirmOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="embed-toggle-step2-title"
                    onClick={() => !isEmbedSettingsSaving && handleEmbedToggleCancel()}
                >
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div
                                className={`${styles.confirmIcon} ${styles.confirmIconDanger}`}
                                aria-hidden="true"
                            >
                                !
                            </div>
                            <div>
                                <h3 id="embed-toggle-step2-title" className={styles.confirmTitle}>
                                    Confirm this change
                                </h3>
                                <p className={styles.confirmSubtitle}>
                                    {pendingEmbedEnabled
                                        ? 'Turn the Volusion filter back on for all category pages?'
                                        : 'Turn the Volusion filter off for all category pages?'}
                                </p>
                            </div>
                        </div>
                        <div className={styles.confirmBody}>
                            <p className={styles.confirmMessage}>
                                {pendingEmbedEnabled
                                    ? 'After you confirm, shoppers will see the custom filter UI again after they refresh Volusion category pages.'
                                    : 'After you confirm, Volusion will use its native category layout again after visitors refresh the page.'}
                            </p>
                        </div>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={handleEmbedToggleCancel}
                                disabled={isEmbedSettingsSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.confirmProceedBtn}
                                onClick={handleEmbedToggleConfirm}
                                disabled={isEmbedSettingsSaving}
                            >
                                {isEmbedSettingsSaving
                                    ? 'Saving...'
                                    : pendingEmbedEnabled
                                      ? 'Yes, show filter'
                                      : 'Yes, hide filter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            
        </div>
    );
};

export default CsvImportExport;
