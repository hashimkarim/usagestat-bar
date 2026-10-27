#!/usr/bin/env python3
"""Prepare distro source recipes from a checksummed release source archive."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import zipfile


def prepare(source, output, expected_sha):
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != expected_sha:
        raise ValueError('Source archive does not match the expected SHA-256')
    output.mkdir(parents=True, exist_ok=False)
    with tarfile.open(source) as archive:
        archive.extractall(output / 'source', filter='data')
    roots = list((output / 'source').iterdir())
    if len(roots) != 1 or not roots[0].is_dir():
        raise ValueError('Expected one source directory')
    root = roots[0]
    version = json.loads((root / 'release.json').read_text())['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?', version):
        raise ValueError('Invalid release version')
    if root.name != f'usagestat-bar-{version}':
        raise ValueError('Source directory and release version differ')
    aur = output / 'aur'
    aur.mkdir()
    template = (root / 'packaging/aur/PKGBUILD.in').read_text()
    for key, value in {'VERSION': version, 'ARCH_VERSION': version.replace('-', ''), 'SHA256': digest}.items():
        template = template.replace(f'@{key}@', value)
    (aur / 'PKGBUILD').write_text(template)
    rpm = output / 'rpm'
    (rpm / 'SOURCES').mkdir(parents=True)
    (rpm / 'SPECS').mkdir()
    shutil.copy2(source, rpm / 'SOURCES' / f'usagestat-bar-{version}.tar.gz')
    spec = (root / 'packaging/rpm/usagestat-bar.spec').read_text()
    spec = re.sub(r'(?m)^%global upstream_version .+$', f'%global upstream_version {version}', spec)
    spec = re.sub(r'(?m)^Version:.*$', f'Version:        {version.replace("-", "~")}', spec)
    (rpm / 'SPECS/usagestat-bar.spec').write_text(spec)
    deb = output / 'deb'
    deb.mkdir()
    deb_version = version.replace('-', '~')
    shutil.copy2(source, deb / f'usagestat-bar_{deb_version}.orig.tar.gz')
    shutil.copytree(root, deb / root.name)
    shutil.copytree(root / 'packaging/debian', deb / root.name / 'debian')
    changelog = deb / root.name / 'debian/changelog'
    changelog.write_text(re.sub(r'^usagestat-bar \([^)]+\)', f'usagestat-bar ({deb_version}-1ppa1)', changelog.read_text()))
    stores = output / 'stores'
    stage = stores / 'stage'
    subprocess.run([sys.executable, str(root / 'packaging/stage.py'), '--source', str(root),
                    '--destdir', str(stage), '--version', version, '--component', 'plasma'], check=True)
    widget = stage / 'usr/share/plasma/plasmoids/io.github.HashimK.usagestat'
    with zipfile.ZipFile(stores / f'usagestat-bar-{version}.plasmoid', 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(widget.rglob('*')):
            if path.is_file():
                info = zipfile.ZipInfo(str(path.relative_to(widget)))
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, path.read_bytes())
    shutil.rmtree(stage)
    (output / 'source.json').write_text(json.dumps({'version': version, 'sha256': digest}, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source, args.output, args.sha256)
