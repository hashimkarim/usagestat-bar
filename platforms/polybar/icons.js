import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ROOT} from '../linux/settings.js';
import {resolveProviderIcon, providerIconPath} from '../../providerMetadata.js';

const file = Gio.File.new_for_path(`${ROOT}/platforms/polybar/glyphs.json`);
const glyphs = JSON.parse(new TextDecoder().decode(file.load_contents(null)[1]));
let activePath, activeGlyphs = glyphs;

export function providerGlyph(provider) {
    let path = providerIconPath('fonts/glyphs.json', `${ROOT}/assets/provider-icons`);
    try {
        const installed = GLib.file_read_link(`${GLib.get_user_data_dir()}/fonts/UsageStatProviderIcons.ttf`);
        const owned = `${GLib.get_user_data_dir()}/usagestat-bar-icons/fonts/`;
        if (installed.startsWith(owned) && /^\d+\.\d+\.\d+-[a-f0-9]{64}\/UsageStatProviderIcons\.ttf$/.test(installed.slice(owned.length)))
            path = `${GLib.path_get_dirname(installed)}/glyphs.json`;
    } catch { /* The bundled installation may not use a shared updated font. */ }
    if (path !== activePath) {
        activePath = path;
        try { activeGlyphs = JSON.parse(new TextDecoder().decode(Gio.File.new_for_path(path).load_contents(null)[1])); }
        catch { activeGlyphs = glyphs; }
    }
    const name = resolveProviderIcon(provider.iconId)?.file.replace(/\.svg$/, '') || 'generic';
    return String.fromCodePoint(Object.hasOwn(activeGlyphs, name) ? activeGlyphs[name] : activeGlyphs.generic);
}
