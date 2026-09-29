import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Rsvg from 'gi://Rsvg?version=2.0';

export function svgPixels(svg, width, height = width) {
    // Use librsvg directly; sandboxed image loaders can lack fonts in the lab.
    const sized = svg.replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(?:width|height)=["'][^"']*["']/g, '')
        .replace('<svg', `<svg width="${Math.round(width)}" height="${Math.round(height)}"`));
    return Rsvg.Handle.new_from_data(new TextEncoder().encode(sized)).get_pixbuf();
}

export function customIconSvg(path, neutral) {
    try {
        if (!path || !GLib.path_is_absolute(path)) return '';
        const file = Gio.File.new_for_path(path);
        if (file.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR) return '';
        let svg = new TextDecoder().decode(file.load_contents(null)[1]), pixels;
        if (/<svg\b/.test(svg)) {
            svg = svg.replaceAll('currentColor', neutral);
            const handle = Rsvg.Handle.new_from_data(new TextEncoder().encode(svg));
            const [hasSize, width, height] = handle.get_intrinsic_size_in_pixels();
            const [, , , , hasViewBox, box] = handle.get_intrinsic_dimensions();
            const w = hasSize ? width : hasViewBox ? box.width : 0;
            const h = hasSize ? height : hasViewBox ? box.height : 0;
            if (!(w > 0 && h > 0)) return '';
            if (!hasViewBox) svg = svg.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
            const scale = 128 / Math.max(w, h);
            pixels = svgPixels(svg, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
        } else {
            pixels = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 128, 128, true);
        }
        // Isolate custom namespaces/definitions from composed panel SVGs and
        // give raster images the same sizing and usage-fill behavior as SVGs.
        const [, bytes] = pixels.save_to_bufferv('png', [], []);
        const width = pixels.get_width(), height = pixels.get_height();
        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image width="${width}" height="${height}" xlink:href="data:image/png;base64,${GLib.base64_encode(bytes)}"/></svg>`;
    } catch { return ''; }
}

export function customIconFile(path, neutral) {
    try {
        const svg = customIconSvg(path, neutral);
        if (!svg) return null;
        const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, svg, -1);
        const directory = Gio.File.new_for_path(`${GLib.get_user_cache_dir()}/usagestat-bar/custom-icons`);
        if (!directory.query_exists(null)) directory.make_directory_with_parents(null);
        const file = directory.get_child(`${hash}.svg`);
        if (!file.query_exists(null))
            file.replace_contents(new TextEncoder().encode(svg), null, false, Gio.FileCreateFlags.PRIVATE, null);
        return file;
    } catch { return null; }
}
