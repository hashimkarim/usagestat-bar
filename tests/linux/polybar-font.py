#!/usr/bin/env python3
"""Check that bundled Polybar glyphs retain their SVG silhouettes and cutouts.

Development check: fonttools, Pillow, PyGObject and the librsvg pixbuf loader.
"""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFont
import gi
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf

ET.register_namespace('', 'http://www.w3.org/2000/svg')

ROOT = Path(__file__).resolve().parents[2]
folder = ROOT / 'platforms/polybar'
mapping = json.loads((folder/'glyphs.json').read_text())
font = TTFont(folder/'UsageStatProviderIcons.ttf')
cmap = font.getBestCmap()
raster_fonts = {}
assert len(set(mapping.values())) == len(mapping)
catalog = json.loads((ROOT/'assets/provider-icons/manifest.json').read_text())
paths = sorted({ROOT/'assets/provider-icons'/icon['monochrome'] for icon in catalog['icons'].values()})
assert {mapping['generic'], *(mapping[path.stem] for path in paths)} <= set(cmap)
failures = []
for path in paths:
    # Prefer large outlines to avoid grid fitting moving thin strokes. Older
    # FreeType versions can overflow their raster pool on complex glyphs at
    # 1000px; compare BOTH images at a smaller size with the same threshold.
    for size in (1000, 500, 200):
        if size not in raster_fonts:
            raster_fonts[size] = ImageFont.truetype(str(folder/'UsageStatProviderIcons.ttf'), size)
        actual = Image.new('L', (size, size))
        try:
            ImageDraw.Draw(actual).text((0, size * 9 // 10), chr(mapping[path.stem]), font=raster_fonts[size], fill=255, anchor='ls')
        except OSError as error:
            if 'raster overflow' not in str(error).lower() or size == 200:
                raise OSError(f'{path.name} at {size}px: {error}') from error
            print(f'{path.name}: raster overflow at {size}px; retrying at a smaller size.')
        else:
            break
    root = ET.parse(path).getroot()
    root.set('width', str(size * 9 // 10)); root.set('height', str(size * 9 // 10))
    # The monochrome font intentionally uses one opacity for the whole logo.
    for element in root.iter():
        for key in ['opacity', 'fill-opacity', 'stroke-opacity']: element.attrib.pop(key, None)
    loader = GdkPixbuf.PixbufLoader.new_with_type('svg')
    loader.write(ET.tostring(root)); loader.close()
    pix = loader.get_pixbuf()
    image = Image.frombytes('RGBA', (pix.get_width(), pix.get_height()), bytes(pix.get_pixels()), 'raw', 'RGBA', pix.get_rowstride())
    expected = Image.new('L', (size, size))
    expected.paste(image.getchannel('A'), (size // 20, size // 20))
    expected = expected.point(lambda value: 255 if value > 100 else 0)
    actual = actual.point(lambda value: 255 if value > 100 else 0)
    intersection = sum(ImageChops.darker(expected, actual).histogram()[1:])
    union = sum(ImageChops.lighter(expected, actual).histogram()[1:])
    similarity = intersection / union if union else 0
    if similarity < .93: failures.append((path.name, round(similarity, 4)))
assert not failures, f'Logo outlines differ from their source SVGs: {failures}'
print(f'Passed: {len(paths)} provider glyphs, aliases available, source silhouettes and cutouts retained.')
