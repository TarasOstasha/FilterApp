/**
 * Sort filter field results by sort_order, then reassign 0..n-1 for display.
 */
function normalizeFilterResultsSortOrder(results) {
  results.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  results.forEach((item, index) => {
    item.sort_order = index;
  });
  return results;
}

module.exports = { normalizeFilterResultsSortOrder };
