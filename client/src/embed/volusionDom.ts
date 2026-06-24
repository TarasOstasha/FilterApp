export const VOLUSION_CATEGORY_RE = /-s\/\d+\.htm$/i;
export const SIDEBAR_ROOT_ID = 'xyz-filter-sidebar-root';
export const SIDEBAR_PARENT_CLASS = 'xyz-filter-sidebar-parent';
export const PRODUCTS_ROOT_ID = 'xyz-filter-products-root';
export const PRODUCTS_VISIBLE_CLASS = 'xyz-embed-products-visible';
export const VOLUSION_FORM_SELECTOR = 'form#MainForm.search_results_section';

export function isVolusionCategoryPage(): boolean {
  return VOLUSION_CATEGORY_RE.test(window.location.pathname);
}

export function getVolusionEmbedCategoryId(): string {
  return window.location.pathname.match(/-s\/(\d+)\.htm$/i)?.[1] ?? '';
}

function markSidebarParent(root: HTMLElement): void {
  root.parentElement?.classList.add(SIDEBAR_PARENT_CLASS);
}

export function mountSidebarRoot(): HTMLElement | null {
  const existing = document.getElementById(SIDEBAR_ROOT_ID);
  if (existing) {
    markSidebarParent(existing);
    document.documentElement.classList.add('xyz-filter-sidebar-active');
    return existing;
  }

  const sidebar = document.querySelector('.sidebar.left-nav');
  if (!sidebar) return null;

  // Require Our Work block before mounting — confirms correct category template
  const ourWork = sidebar.querySelector('.ourwork-container');
  if (!ourWork) return null;

  const root = document.createElement('div');
  root.id = SIDEBAR_ROOT_ID;
  // Place beside Our Work inside the same wrapper (matches Volusion category template)
  ourWork.insertAdjacentElement('afterend', root);
  markSidebarParent(root);
  document.documentElement.classList.add('xyz-filter-sidebar-active');
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
    root.classList.toggle(PRODUCTS_VISIBLE_CLASS, visible);
    root.style.display = visible ? 'block' : 'none';
  }
}

export function initEmbedDomDefaults(): void {
  setVolusionFormVisible(true);
  setProductsRootVisible(true);
}

export function ensureCategoryPageAtTop(): void {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const scrollTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  };

  scrollTop();
  requestAnimationFrame(scrollTop);
}
