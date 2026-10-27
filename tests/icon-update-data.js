import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import {catalog} from '../assets/provider-icons/manifest.js';
import {iconRelease, compareIconVersions, validateIconCatalog, sanitizeIconSvg, iconArchiveData, tarFiles} from '../iconUpdateData.js';
import {assert, equal} from './assert.js';
const root = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));
const rejects = fn => { let failed = false; try { fn(); } catch { failed = true; } assert(failed); };
const bytes = text => new TextEncoder().encode(text);
for (const file of validateIconCatalog(catalog, catalog.packageVersion)) {
    try {
        const bytes = sanitizeIconSvg(Gio.File.new_for_path(`${root}/assets/provider-icons/${file}`).load_contents(null)[1]);
        const loader = GdkPixbuf.PixbufLoader.new_with_type('svg');
        loader.set_size(1, 1); loader.write(bytes); loader.close();
    }
    catch (error) { throw new Error(`${file}: ${error.message}`); }
}
for (const svg of ['<svg><script>alert(1)</script></svg>', '<svg onload="evil()"/>',
    '<svg><use href="https://example.com/x.svg"/></svg>', '<!DOCTYPE svg><svg/>',
    '<svg><path fill="url(https://example.com/a)"/></svg>',
    '<svg xml:base="https://example.com/x"><use href="#x"/></svg>',
    '<svg><use href="&#104;ttps://example.com/x"/></svg>', '<svg><foreignObject/></svg>'])
    rejects(() => sanitizeIconSvg(bytes(svg)));
const broken = JSON.parse(JSON.stringify(catalog));
broken.icons.abacus.monochrome = '../outside.svg';
rejects(() => validateIconCatalog(broken, catalog.packageVersion));
equal(compareIconVersions('1.10.0', '1.9.9'), 1);
equal(compareIconVersions('1.1.0', '1.1.0'), 0);
const release = {tag_name: 'v1.2.3', assets: [{name: 'agenticdriver-provider-icons-1.2.3.tgz',
    browser_download_url: 'https://github.com/agenticdriver/provider-icons/releases/download/v1.2.3/agenticdriver-provider-icons-1.2.3.tgz', digest: `sha256:${'a'.repeat(64)}`}]};
equal(iconRelease(release).version, '1.2.3');
rejects(() => iconRelease({...release, prerelease: true}));
rejects(() => iconRelease({...release, assets: [{...release.assets[0], browser_download_url: 'https://example.com/archive'}]}));
if (ARGV[0]) {
    const result = iconArchiveData(Gio.File.new_for_path(ARGV[0]).load_contents(null)[1], catalog.packageVersion);
    equal(result.catalog, catalog);
    const corrupt = new Uint8Array(Gio.File.new_for_path(ARGV[0]).load_contents(null)[1]);
    const font = tarFiles(corrupt).get('fonts/UsageStatProviderIcons.ttf');
    if (font) {
        font.fill(0, 4); // Keep the SFNT magic but remove the tables and character map.
        rejects(() => iconArchiveData(corrupt, catalog.packageVersion));
    }
    assert(![...result.files.keys()].some(name => name.endsWith('.js')));
}
print('Passed: bundled artwork, remote data restrictions, version ordering and release identity');
