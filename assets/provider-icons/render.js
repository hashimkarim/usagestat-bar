// Shared, framework-independent rendering. Inputs are reviewed package artwork.
const sequence = Symbol.for('@agenticdriver/provider-icons/sequence');
function nextPrefix() {
  globalThis[sequence] = (globalThis[sequence] ?? 0) + 1;
  return `ad-icon-${globalThis[sequence]}`;
}

export function svgDimensions(svg) {
  const root = svg.slice(0, svg.indexOf('>') + 1);
  const box = root.match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number);
  if (!box || box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) return undefined;
  return {width: box[2], height: box[3]};
}

function place(svg, x, y, width, height) {
  return svg.replace(/<svg\b([^>]*)>/, (_, attributes) =>
    `<svg${attributes.replace(/\s(?:width|height)="[^"]*"/g, '')} x="${x}" y="${y}" width="${width}" height="${height}">`);
}

function sizeSvg(svg, size) {
  if (size === undefined) return svg;
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return undefined;
  const dimensions = svgDimensions(svg);
  if (!dimensions) return undefined;
  const width = Math.round(size * dimensions.width / dimensions.height * 1000) / 1000;
  if (!Number.isFinite(width) || width <= 0) return undefined;
  return svg.replace(/<svg\b([^>]*)>/, (_, attributes) =>
    `<svg${attributes.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${width}" height="${size}">`);
}

const root = (width, height) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="currentColor" aria-hidden="true" focusable="false">`;

export function renderArtwork(artworks, options = {}) {
  const artwork = options.artwork ?? 'icon';
  const style = options.style ?? 'monochrome';
  const prefix = options.prefix ?? nextPrefix();
  if (!['monochrome', 'color'].includes(style) || typeof prefix !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,100}$/.test(prefix)) return undefined;
  const get = (key, suffix = '') => {
    const entry = Object.hasOwn(artworks, key) ? artworks[key] : undefined;
    const svg = entry && (style === 'color' ? entry.color ?? entry.monochrome : entry.monochrome);
    return svg?.replaceAll('__AD_ICON__', `${prefix}${suffix}-`);
  };
  let svg;
  if (artwork === 'combine') {
    const logo = get('icon', '-logo'), text = get('text', '-text');
    if (!logo || !text) return undefined;
    const dimensions = svgDimensions(text);
    if (!dimensions) return undefined;
    const width = Math.round(dimensions.width / dimensions.height * 24 * 1000) / 1000;
    svg = `${root(42 + width, 32)}${place(logo, 0, 0, 32, 32)}${place(text, 42, 4, width, 24)}</svg>`;
  } else if (artwork === 'avatar') {
    const logo = get('icon', '-logo');
    if (!logo) return undefined;
    svg = `${root(40, 40)}<circle cx="20" cy="20" r="20" fill="currentColor" fill-opacity=".12"/>${place(logo, 8, 8, 24, 24)}</svg>`;
  } else {
    svg = get(artwork);
  }
  return svg ? sizeSvg(svg, options.size) : undefined;
}
