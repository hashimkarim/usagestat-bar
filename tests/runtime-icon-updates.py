#!/usr/bin/env python3
"""Run offline update/rollback/scheduling checks with a real release-shaped tarball."""
import gzip
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='usagestat-runtime-icons.') as temp:
    root = Path(temp)
    icon = {'name': 'Future Model', 'monochrome': 'future.svg', 'alternatives': ['future'], 'searchTerms': ['tomorrow'], 'colourTheme': []}
    catalog = {'version': 1, 'packageVersion': '999.0.0', 'icons': {'future': icon}, 'aliases': {'future-model': 'future'}}
    files = {'package.json': json.dumps({'name': '@agenticdriver/provider-icons', 'version': '999.0.0'}),
             'manifest.json': json.dumps(catalog), 'assets/future.svg': '<svg viewBox="0 0 24 24"><circle r="4" cx="12" cy="12"/></svg>',
             'LICENSE': 'MIT', 'NOTICE': 'Offline test fixture', 'index.js': 'throw new Error("Must never execute")'}
    files['fonts/glyphs.json'] = json.dumps({'generic': 0x100000, 'future': 0x100001})
    files['fonts/UsageStatProviderIcons.ttf'] = (ROOT / 'platforms/polybar/UsageStatProviderIcons.ttf').read_bytes()
    def archive(name, entries):
        with tarfile.open(root / name, 'w:gz', format=tarfile.USTAR_FORMAT) as target:
            for name, text in entries.items():
                data = text.encode() if isinstance(text, str) else text
                info = tarfile.TarInfo('package/' + name)
                info.size = len(data)
                target.addfile(info, io.BytesIO(data))
    archive('release.tgz', files)
    invalid = {**files, 'package.json': json.dumps({'name': '@agenticdriver/provider-icons', 'version': '999.0.1'}),
               'manifest.json': json.dumps({**catalog, 'packageVersion': '999.0.1', 'aliases': {},
                   'icons': {'Future': {**icon, 'alternatives': ['Future']}}})}
    archive('invalid-catalog.tgz', invalid)
    malformed = {**files, 'package.json': invalid['package.json'],
                 'manifest.json': json.dumps({**catalog, 'packageVersion': '999.0.1'}),
                 'assets/future.svg': '<svg viewBox="0 0 24 24"><path></svg>'}
    archive('invalid-svg.tgz', malformed)
    subprocess.run(['gjs', '-m', str(ROOT / 'tests/runtime-icon-updates.js'), str(root)], check=True, env={**os.environ, 'XDG_DATA_HOME': str(root / 'data')})
