export const VOLUSION_BASE = 'https://www.xyzdisplays.com';

export const VOLUSION_LOGO_SRC =
  `${VOLUSION_BASE}/v/vspfiles/templates/Charmed2025/images/template/header_bg_new.svg`;

const CF_EMAIL_PLACEHOLDER = /\[email(?:&#160;|\s)protected\]/gi;

/** Cloudflare email obfuscation — first hex byte is XOR key for the rest. */
export const decodeCloudflareEmailHex = (hex: string): string => {
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
};

/** Replace Cloudflare-protected emails with readable mailto links (decode script is stripped). */
export const decodeCloudflareEmails = (html: string): string => {
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

      const innerDecoded = inner.replace(CF_EMAIL_PLACEHOLDER, email);
      return `<a${before}href="mailto:${email}"${after}>${innerDecoded}</a>`;
    }
  );

  return result.replace(CF_EMAIL_PLACEHOLDER, 'sales@xyzdisplays.com');
};

/** Volusion injects the logo img via platform JS; add it for static header HTML. */
export const injectVolusionLogo = (headerHtml: string): string => {
  if (headerHtml.includes('logo__img')) {
    return headerHtml;
  }

  return headerHtml.replace(
    /(<a class="vol-logo__link"[^>]*>)([^<]*)(<\/a>)/,
    `$1<img class="logo__img img-responsive" alt="XYZ Displays" src="${VOLUSION_LOGO_SRC}" />$3`
  );
};

export const processVolusionHeaderHtml = (html: string): string =>
  decodeCloudflareEmails(injectVolusionLogo(html));

export const processVolusionFooterHtml = (html: string): string =>
  decodeCloudflareEmails(html);