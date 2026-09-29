import {providerIcons, resolveProviderIcon} from './index.js';
import {svg} from './svg-data.js';
import {renderArtwork} from './render.js';

/** Original artwork or a complete layout, with optional intrinsic sizing. */
export function providerIconSvg(provider, options = {}) {
    const artwork = options.artwork ?? 'icon';
    const composed = artwork === 'combine' || artwork === 'avatar';
    const resolved = resolveProviderIcon(provider, {...options, artwork: composed ? 'icon' : artwork});
    if (!resolved) return undefined;
    const entry = providerIcons[resolved.id];
    const files = {icon: entry, ...entry.artworks};
    const artworks = Object.fromEntries(Object.entries(files).map(([key, value]) =>
        [key, Object.fromEntries(['monochrome', 'color'].filter(style => value[style]).map(style => [style, svg[value[style]]]))]));
    return renderArtwork(artworks, options);
}
