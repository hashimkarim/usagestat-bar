import Gio from 'gi://Gio';
import {ROOT} from '../linux/settings.js';
import {resolveProviderIcon} from '../../providerMetadata.js';

const file = Gio.File.new_for_path(`${ROOT}/platforms/polybar/glyphs.json`);
const glyphs = JSON.parse(new TextDecoder().decode(file.load_contents(null)[1]));

export function providerGlyph(provider) {
    const name = resolveProviderIcon(provider.iconId)?.file.replace(/\.svg$/, '') || 'generic';
    return String.fromCodePoint(Object.hasOwn(glyphs, name) ? glyphs[name] : glyphs.generic);
}
