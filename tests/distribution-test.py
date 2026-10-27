#!/usr/bin/env python3
"""Verify release-source identity survives conversion to native package recipes."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='usagestat-distribution.') as temp:
    base = Path(temp)
    source = base / 'usagestat-bar-1.2.3-rc.4'
    source.mkdir()
    (source / 'release.json').write_text(json.dumps({'version': '1.2.3-rc.4'}))
    shutil.copytree(ROOT / 'packaging', source / 'packaging')
    shutil.copytree(ROOT / 'platforms/plasma', source / 'platforms/plasma')
    archive = base / 'source.tar.gz'
    with tarfile.open(archive, 'w:gz') as stream:
        stream.add(source, arcname=source.name)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    command = ['python3', str(ROOT / 'scripts/prepare-distribution.py'), '--source', str(archive)]
    rejected = subprocess.run([*command, '--sha256', '0' * 64, '--output', str(base / 'rejected')], capture_output=True)
    assert rejected.returncode != 0 and not (base / 'rejected').exists()
    output = base / 'prepared'
    subprocess.run([*command, '--sha256', digest, '--output', str(output)], check=True)
    pkgbuild = (output / 'aur/PKGBUILD').read_text()
    assert 'pkgver=1.2.3rc.4' in pkgbuild and digest in pkgbuild
    spec = (output / 'rpm/SPECS/usagestat-bar.spec').read_text()
    assert 'Version:        1.2.3~rc.4' in spec and '%global upstream_version 1.2.3-rc.4' in spec
    assert (output / 'deb/usagestat-bar_1.2.3~rc.4.orig.tar.gz').read_bytes() == archive.read_bytes()
    assert '(1.2.3~rc.4-1ppa1)' in (output / 'deb' / source.name / 'debian/changelog').read_text()
    with zipfile.ZipFile(output / 'stores/usagestat-bar-1.2.3-rc.4.plasmoid') as package:
        assert json.loads(package.read('metadata.json'))['KPlugin']['Version'] == '1.2.3-rc.4'
        assert package.read('contents/ui/main.qml') == (ROOT / 'platforms/plasma/contents/ui/main.qml').read_bytes()
print('Passed: checksum rejection, prerelease ordering, source preservation and native widget metadata')
