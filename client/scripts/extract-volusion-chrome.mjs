import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, '../src/external/volusion-page.html');
const outDir = path.join(__dirname, '../src/external');
const BASE = 'https://hxyrr-gdtbo.volusion.store';

const html = fs.readFileSync(htmlPath, 'utf8');
const headerMatch = html.match(/<header class="header"[\s\S]*?<\/header>/);
const footerMatch = html.match(/<footer class="footer"[\s\S]*?<\/footer>/);
if (!headerMatch || !footerMatch) {
  console.error('header or footer not found');
  process.exit(1);
}

function fixUrls(s) {
  return s
    .replace(/href="\//g, `href="${BASE}/`)
    .replace(/src="\//g, `src="${BASE}/`)
    .replace(/action="\//g, `action="${BASE}/`)
    .replace(/url\(\//g, `url(${BASE}/`);
}

/** link/script inside dangerouslySetInnerHTML are ignored by browsers */
function stripNonRenderableTags(html) {
  return html
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

const LOGO_SRC = `${BASE}/v/vspfiles/templates/charmed2test/images/template/header_bg_new.svg`;

function injectLogoImage(html) {
  if (html.includes('logo__img')) {
    return html;
  }

  return html.replace(
    /(<a class="vol-logo__link"[^>]*>)([^<]*)(<\/a>)/,
    `$1<img class="logo__img img-responsive" alt="XYZ Displays" src="${LOGO_SRC}" />$3`
  );
}

function decodeCloudflareEmailHex(hex) {
  const normalized = hex.trim().toLowerCase();
  if (!normalized || normalized.length < 4 || normalized.length % 2 !== 0) {
    return '';
  }

  const key = parseInt(normalized.slice(0, 2), 16);
  let email = '';

  for (let i = 2; i < normalized.length; i += 2) {
    email += String.fromCharCode(parseInt(normalized.slice(i, i + 2), 16) ^ key);
  }

  return email;
}

function decodeCloudflareEmails(html) {
  let result = html.replace(
    /<span class="__cf_email__" data-cfemail="([a-f0-9]+)">\[email(?:&#160;|\s)protected\]<\/span>/gi,
    (_, hex) => decodeCloudflareEmailHex(hex)
  );

  result = result.replace(
    /<a\b([^>]*?)href="[^"]*\/cdn-cgi\/l\/email-protection#([a-f0-9]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, before, hex, after, inner) => {
      const email = decodeCloudflareEmailHex(hex);
      if (!email) {
        return match;
      }

      const innerDecoded = inner.replace(/\[email(?:&#160;|\s)protected\]/gi, email);
      return `<a${before}href="mailto:${email}"${after}>${innerDecoded}</a>`;
    }
  );

  return result.replace(/\[email(?:&#160;|\s)protected\]/gi, 'sales@xyzdisplays.com');
}

const header = decodeCloudflareEmails(
  injectLogoImage(stripNonRenderableTags(fixUrls(headerMatch[0])))
);

const svgPath = path.join(outDir, 'svgdefs.svg');
const svgSprites = fs.existsSync(svgPath)
  ? fixUrls(fs.readFileSync(svgPath, 'utf8'))
  : '';

const footer = decodeCloudflareEmails(
  fixUrls(footerMatch[0] + (svgSprites ? `\n<span id="svgIncludes" style="display:none;">${svgSprites}</span>` : ''))
);

const tsContent = `// Auto-extracted from ${BASE}/ — re-run: node client/scripts/extract-volusion-chrome.mjs

export const EXTERNAL_HEADER_HTML = ${JSON.stringify(header)};

export const EXTERNAL_FOOTER_HTML = ${JSON.stringify(footer)};
`;

fs.writeFileSync(path.join(outDir, 'volusionChromeHtml.ts'), tsContent);
console.log('Wrote volusion chrome assets', {
  headerLen: header.length,
  footerLen: footer.length,
  svgLen: svgSprites.length,
});
