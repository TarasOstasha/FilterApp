const createHttpError = require('http-errors');
const { Readable } = require('stream');

const ALLOWED_PREFIXES = [
  'https://cdn4.volusion.store/',
  'https://www.xyzdisplays.com/',
];

const isAllowedImageUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_PREFIXES.some((prefix) => urlString.startsWith(prefix));
  } catch {
    return false;
  }
};

module.exports.proxyImage = async (req, res, next) => {
  try {
    const raw = req.query.url;
    if (!raw || typeof raw !== 'string') {
      throw createHttpError(400, 'Missing url query parameter');
    }

    let target;
    try {
      target = decodeURIComponent(raw);
    } catch {
      throw createHttpError(400, 'Invalid url encoding');
    }

    if (!isAllowedImageUrl(target)) {
      throw createHttpError(403, 'URL not allowed');
    }

    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'FilterApp-ImageProxy/1.0' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      throw createHttpError(upstream.status, 'Failed to fetch image');
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    next(err);
  }
};
