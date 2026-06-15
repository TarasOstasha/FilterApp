const { fetchHiddenProductCodes } = require('./hiddenProductCodes');
const { setHiddenProductCodes, getHiddenProductCodes } = require('./filterTestUtils');

let initialized = false;

/**
 * Load hide_product=Y codes from DB once per process (matches API visibility).
 * @returns {Promise<Set<string>>}
 */
async function bootstrapApiProductVisibility() {
  if (initialized) return getHiddenProductCodes();

  const hidden = await fetchHiddenProductCodes();
  setHiddenProductCodes(hidden);
  initialized = true;

  // eslint-disable-next-line no-console
  console.log(
    `\nAPI test visibility: excluding ${hidden.size} product_code(s) with hide_product=Y\n`
  );

  return hidden;
}

module.exports = {
  bootstrapApiProductVisibility,
};
