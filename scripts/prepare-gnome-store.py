#!/usr/bin/env python3
"""Keep GNOME runtime artwork and attribution without unused web bindings."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import zipfile

PREFIX = 'assets/provider-icons/'
METADATA = {'manifest.js', 'manifest.json', 'package.json', 'source.json',
            'provenance.json', 'LICENSE', 'NOTICE'}


def prepare(source, output, expected):
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != expected:
        raise ValueError('Extension archive checksum mismatch')
    with zipfile.ZipFile(source) as original:
        files = {}
        for entry in original.infolist():
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename or stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError('Unsafe extension archive path')
            if entry.is_dir():
                continue
            if entry.filename in files:
                raise ValueError('Duplicate extension archive path')
            relative = entry.filename.removeprefix(PREFIX)
            if entry.filename.startswith(PREFIX) and not (
                    relative in METADATA or path.suffix == '.svg' or relative.startswith('licenses/')):
                continue
            files[entry.filename] = (entry, original.read(entry))
        catalog = json.loads(files[PREFIX + 'manifest.json'][1])
        for icon in catalog['icons'].values():
            for artwork in [icon, *icon.get('artworks', {}).values()]:
                for style in ['monochrome', 'color']:
                    if style in artwork and PREFIX + artwork[style] not in files:
                        raise ValueError('Missing runtime icon artwork')
        for name in ['extension.js', 'prefs.js', 'providerCatalog.js', 'providerIconUpdates.js',
                     PREFIX + 'manifest.js', PREFIX + 'LICENSE', PREFIX + 'NOTICE']:
            if name not in files:
                raise ValueError(f'Missing runtime file: {name}')
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
            for name, (entry, data) in files.items():
                target.writestr(entry, data)
    return {'sourceSha256': digest, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'bytes': output.stat().st_size, 'files': len(files)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--sha256', required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.archive, args.output, args.sha256), indent=2))
