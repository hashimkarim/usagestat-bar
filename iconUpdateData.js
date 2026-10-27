// Validation for downloaded data. This module performs no I/O or code loading.
import {createProviderCatalog} from './providerCatalog.js';
const decoder = new TextDecoder('utf-8', {fatal: true});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stable = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
const svgName = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.svg$/.test(value);
const strings = value => Array.isArray(value) && value.length < 500 && value.every(item => typeof item === 'string' && item.length < 500);

export function compareIconVersions(left, right) {
    if (!stable(left) || !stable(right)) throw new Error('Unsupported icon version');
    const a = left.split('.').map(Number), b = right.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
    return 0;
}

export function iconRelease(release) {
    const tag = release.tag_name;
    if (release.draft || release.prerelease || typeof tag !== 'string' || !stable(tag.slice(1)) || tag[0] !== 'v')
        throw new Error('Expected a stable provider-icons release');
    const version = tag.slice(1), name = `agenticdriver-provider-icons-${version}.tgz`;
    const assets = (release.assets || []).filter(asset => asset.name === name);
    const url = `https://github.com/agenticdriver/provider-icons/releases/download/${tag}/${name}`;
    if (assets.length !== 1 || assets[0].browser_download_url !== url || !/^sha256:[0-9a-f]{64}$/.test(assets[0].digest || ''))
        throw new Error('Missing verified provider-icons archive');
    return {version, url, sha256: assets[0].digest.slice(7)};
}

export function tarFiles(bytes) {
    if (bytes.length > 64 * 1024 * 1024) throw new Error('Icon archive is too large');
    const files = new Map();
    const text = (offset, length) => decoder.decode(bytes.subarray(offset, offset + length)).split('\0')[0];
    const octal = (offset, length) => {
        const value = text(offset, length).trim();
        if (!/^[0-7]+$/.test(value)) throw new Error('Invalid archive header');
        return parseInt(value, 8);
    };
    let offset = 0, count = 0;
    while (offset + 512 <= bytes.length) {
        if (bytes.subarray(offset, offset + 512).every(value => value === 0)) break;
        if (++count > 12000) throw new Error('Too many icon archive entries');
        const name = text(offset, 100), prefix = text(offset + 345, 155);
        const path = prefix ? `${prefix}/${name}` : name;
        const parts = path.split('/');
        if (parts[0] !== 'package' || parts.some(part => part === '..' || part === '.') || path.includes('\\'))
            throw new Error('Unsafe icon archive path');
        let checksum = 0;
        for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : bytes[offset + i];
        if (checksum !== octal(offset + 148, 8)) throw new Error('Invalid archive checksum');
        const size = octal(offset + 124, 12), type = bytes[offset + 156];
        if (![0, 48, 53].includes(type) || size > 8 * 1024 * 1024 || offset + 512 + size > bytes.length)
            throw new Error('Unsupported icon archive entry');
        if (type !== 53) {
            const relative = parts.slice(1).join('/');
            if (!relative || files.has(relative)) throw new Error('Duplicate icon archive entry');
            files.set(relative, bytes.subarray(offset + 512, offset + 512 + size));
        }
        offset += 512 + Math.ceil(size / 512) * 512;
    }
    return files;
}

const svgTags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'defs', 'mask', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'use', 'symbol', 'title', 'desc',
    'filter', 'feBlend', 'feFlood', 'feGaussianBlur', 'feColorMatrix', 'feOffset', 'feComposite']);

export function sanitizeIconSvg(bytes) {
    if (!bytes || bytes.length > 512 * 1024) throw new Error('Missing or oversized SVG');
    const svg = decoder.decode(bytes).replace(/^\s*<\?xml\s[^?]*\?>/, '')
        .replace(/^\s*<!DOCTYPE svg PUBLIC "-\/\/W3C\/\/DTD SVG 1\.1\/\/EN" "http:\/\/www\.w3\.org\/Graphics\/SVG\/1\.1\/DTD\/svg11\.dtd">/, '');
    if (!/<svg\b/.test(svg) || /<!DOCTYPE|<!ENTITY|<\?|\son[a-z]+\s*=|@import|\bxml:base\s*=|\\|&(?!(?:amp|lt|gt|quot|apos);)/i.test(svg))
        throw new Error('Unsupported SVG content');
    const tags = [...svg.matchAll(/<\s*([a-zA-Z][\w:-]*)\b/g)];
    if (tags.length > 10000 || tags.some(match => !svgTags.has(match[1]))) throw new Error('Unsupported SVG element');
    for (const match of svg.matchAll(/\b(?:href|src)\s*=\s*(['"])(.*?)\1/gi))
        if (!/^#[\w:-]+$/.test(match[2])) throw new Error('External SVG reference');
    for (const match of svg.matchAll(/url\s*\(([^)]*)\)/gi))
        if (!/^\s*['"]?#[\w:-]+['"]?\s*$/.test(match[1])) throw new Error('External SVG resource');
    return new TextEncoder().encode(svg);
}

export function validateIconCatalog(data, version) {
    if (!object(data) || data.version !== 1 || data.packageVersion !== version || !stable(version) || !object(data.icons) || !object(data.aliases))
        throw new Error('Unsupported provider icon catalog');
    const entries = Object.entries(data.icons), files = new Set();
    if (!entries.length || entries.length > 5000) throw new Error('Invalid icon catalog size');
    const artwork = entry => {
        if (!object(entry) || !svgName(entry.monochrome) || entry.color !== undefined && !svgName(entry.color))
            throw new Error('Invalid artwork filename');
        files.add(entry.monochrome);
        if (entry.color) files.add(entry.color);
    };
    for (const [id, entry] of entries) {
        if (!/^[a-z0-9][a-z0-9._-]*$/.test(id) || id.length > 200 || !object(entry) || typeof entry.name !== 'string' || entry.name.length > 500 ||
            !strings(entry.alternatives) || !strings(entry.searchTerms) || !strings(entry.colourTheme) ||
            entry.fullName !== undefined && typeof entry.fullName !== 'string') throw new Error('Invalid provider icon metadata');
        if (!entry.alternatives.includes(id) || entry.alternatives.some(name => !Object.hasOwn(data.icons, name)))
            throw new Error('Invalid icon alternatives');
        artwork(entry);
        if (entry.artworks !== undefined) {
            if (!object(entry.artworks) || Object.keys(entry.artworks).length > 20) throw new Error('Invalid artwork variants');
            Object.values(entry.artworks).forEach(artwork);
        }
    }
    for (const [alias, id] of Object.entries(data.aliases))
        if (!alias || alias !== alias.toLowerCase() || alias.length > 200 || typeof id !== 'string' || !Object.hasOwn(data.icons, id)) throw new Error('Invalid icon alias');
    return files;
}

function validateNativeFont(font, points) {
    if (!font || font.length < 12 || font.length > 8 * 1024 * 1024) throw new Error('Invalid native icon font size');
    const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
    const count = view.getUint16(4);
    if (view.getUint32(0) !== 0x10000 || !count || count > 128 || 12 + count * 16 > font.length)
        throw new Error('Invalid native icon font header');
    const tables = new Map();
    for (let index = 0; index < count; index++) {
        const offset = 12 + index * 16, name = decoder.decode(font.subarray(offset, offset + 4));
        const start = view.getUint32(offset + 8), length = view.getUint32(offset + 12);
        if (tables.has(name) || start < 12 + count * 16 || start + length > font.length)
            throw new Error('Invalid native icon font table');
        tables.set(name, {start, length});
    }
    for (const name of ['head', 'maxp', 'cmap', 'glyf', 'loca', 'hhea', 'hmtx', 'name', 'post'])
        if (!tables.has(name)) throw new Error('Incomplete native icon font');
    let checksum = 0;
    for (let offset = 0; offset < font.length; offset += 4) {
        let word = 0;
        for (let byte = 0; byte < 4; byte++) word = (word * 256 + (font[offset + byte] || 0)) >>> 0;
        checksum = (checksum + word) >>> 0;
    }
    if (checksum !== 0xb1b0afba) throw new Error('Native icon font checksum mismatch');
    const cmap = tables.get('cmap'), end = cmap.start + cmap.length;
    if (cmap.length < 4) throw new Error('Invalid native icon font character map');
    const records = view.getUint16(cmap.start + 2);
    if (4 + records * 8 > cmap.length) throw new Error('Invalid native icon font character map');
    const covered = new Set();
    for (let index = 0; index < records; index++) {
        const start = cmap.start + view.getUint32(cmap.start + 4 + index * 8 + 4);
        if (start + 2 > end) throw new Error('Invalid native icon font character map');
        if (view.getUint16(start) !== 12) continue; // Plane 16 mappings require format 12.
        if (start + 16 > end) throw new Error('Invalid native icon font character map');
        const groups = view.getUint32(start + 12), length = view.getUint32(start + 4);
        if (groups > 10000 || length < 16 + groups * 12 || start + length > end)
            throw new Error('Invalid native icon font character map');
        for (let group = 0; group < groups; group++) {
            const offset = start + 16 + group * 12;
            const first = view.getUint32(offset), last = view.getUint32(offset + 4), glyph = view.getUint32(offset + 8);
            if (first > last) throw new Error('Invalid native icon font range');
            for (const point of points) if (first <= point && point <= last && glyph + point - first > 0) covered.add(point);
        }
    }
    if (points.some(point => !covered.has(point))) throw new Error('Native icon font is missing catalog glyphs');
}

export function iconArchiveData(bytes, version) {
    const entries = tarFiles(bytes);
    const json = name => {
        const bytes = entries.get(name);
        if (!bytes || bytes.length > 4 * 1024 * 1024) throw new Error(`Missing or oversized ${name}`);
        return JSON.parse(decoder.decode(bytes));
    };
    const identity = json('package.json'), catalog = json('manifest.json');
    if (identity.name !== '@agenticdriver/provider-icons' || identity.version !== version) throw new Error('Icon package identity mismatch');
    const files = new Map([['manifest.json', entries.get('manifest.json')]]);
    for (const name of validateIconCatalog(catalog, version)) {
        const svg = entries.get(`assets/${name}`);
        files.set(name, sanitizeIconSvg(svg));
    }
    if (entries.has('fonts/glyphs.json') || entries.has('fonts/UsageStatProviderIcons.ttf')) {
        const mapping = json('fonts/glyphs.json'), font = entries.get('fonts/UsageStatProviderIcons.ttf');
        if (!object(mapping) || mapping.generic !== 0x100000 || Object.keys(mapping).length > 10000 ||
            Object.entries(mapping).some(([name, point]) => !/^[a-zA-Z0-9._-]+$/.test(name) ||
                !Number.isInteger(point) || point < 0x100000 || point > 0x10fffd) ||
            new Set(Object.values(mapping)).size !== Object.keys(mapping).length ||
            Object.values(catalog.icons).some(icon => !Object.hasOwn(mapping, icon.monochrome.replace(/\.svg$/, ''))))
            throw new Error('Invalid native icon font data');
        validateNativeFont(font, [mapping.generic, ...Object.values(catalog.icons).map(icon => mapping[icon.monochrome.replace(/\.svg$/, '')])]);
        files.set('fonts/glyphs.json', entries.get('fonts/glyphs.json'));
        files.set('fonts/UsageStatProviderIcons.ttf', font);
    }
    for (const [name, bytes] of entries)
        if (name === 'LICENSE' || name === 'NOTICE' || /^licenses\/[a-zA-Z0-9._-]+\.txt$/.test(name)) files.set(name, bytes);
    if (!files.has('LICENSE') || !files.has('NOTICE')) throw new Error('Missing icon attribution');
    // Compile with the installed interpreter before replacing the last-good
    // pointer; a syntactically valid catalog can still violate resolver rules.
    createProviderCatalog(catalog);
    return {catalog, files};
}
