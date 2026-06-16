export const VOLUSION_CATEGORY_RE = /-s\/\d+\.htm$/i;
export const SIDEBAR_ROOT_ID = 'xyz-filter-sidebar-root';
export const PRODUCTS_ROOT_ID = 'xyz-filter-products-root';
export const VOLUSION_FORM_SELECTOR = 'form#MainForm.search_results_section';

export function isVolusionCategoryPage(): boolean {
  return VOLUSION_CATEGORY_RE.test(window.location.pathname);
}

export function getVolusionEmbedCategoryId(): string {
  return window.location.pathname.match(/-s\/(\d+)\.htm$/i)?.[1] ?? '';
}

export function mountSidebarRoot(): HTMLElement | null {
  const existing = document.getElementById(SIDEBAR_ROOT_ID);
  if (existing) return existing;

  const sidebar = document.querySelector('.sidebar.left-nav');
  const ourWork = sidebar?.querySelector('.ourwork-container');
  const ourWorkBlock = ourWork?.parentElement;

  if (!sidebar || !ourWorkBlock) return null;

  const root = document.createElement('div');
  root.id = SIDEBAR_ROOT_ID;
  ourWorkBlock.insertAdjacentElement('afterend', root);
  return root;
}

export function mountProductsRoot(): HTMLElement | null {
  const existing = document.getElementById(PRODUCTS_ROOT_ID);
  if (existing) return existing;

  const form = document.querySelector(VOLUSION_FORM_SELECTOR);
  if (!form) return null;

  const root = document.createElement('div');
  root.id = PRODUCTS_ROOT_ID;
  form.insertAdjacentElement('afterend', root);
  return root;
}

export function setVolusionFormVisible(visible: boolean): void {
  const form = document.querySelector<HTMLElement>(VOLUSION_FORM_SELECTOR);
  if (form) {
    form.style.display = visible ? '' : 'none';
  }
}

export function setProductsRootVisible(visible: boolean): void {
  const root = document.getElementById(PRODUCTS_ROOT_ID);
  if (root) {
    root.style.display = visible ? '' : 'none';
  }
}

export function initEmbedDomDefaults(): void {
  setVolusionFormVisible(true);
  setProductsRootVisible(false);
}
