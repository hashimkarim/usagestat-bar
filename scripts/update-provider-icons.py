#!/usr/bin/env python3
"""Refresh the offline icon bundle and Polybar font from the latest stable release."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'agenticdriver/provider-icons'
API = f'https://api.github.com/repos/{REPOSITORY}/releases/latest'
TARGETS = ('assets/provider-icons', 'platforms/polybar/UsageStatProviderIcons.ttf', 'platforms/polybar/glyphs.json')


def fetch(url, limit, *, api=False):
    headers = {'User-Agent': 'usagestat-bar-icon-updater'}
    if api:
        headers['Accept'] = 'application/vnd.github+json'
        token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
        if token:
            headers['Authorization'] = f'Bearer {token}'
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Upstream response exceeds size limit')
    return data


def release_asset(release):
    tag = release.get('tag_name', '')
    if (release.get('draft') or release.get('prerelease') or not isinstance(tag, str)
            or not re.fullmatch(r'v\d+\.\d+\.\d+', tag)):
        raise ValueError('Expected a published stable provider-icons release')
    version = tag[1:]
    name = f'agenticdriver-provider-icons-{version}.tgz'
    assets = [asset for asset in release.get('assets', []) if asset.get('name') == name]
    if len(assets) != 1:
        raise ValueError(f'{tag}: expected one {name} release asset')
    asset = assets[0]
    url = f'https://github.com/{REPOSITORY}/releases/download/{tag}/{name}'
    digest = asset.get('digest', '')
    if (asset.get('browser_download_url') != url or not isinstance(digest, str)
            or not re.fullmatch(r'sha256:[0-9a-f]{64}', digest)):
        raise ValueError(f'{tag}: missing verified release URL or SHA-256 digest')
    return {'version': version, 'archive': url, 'sha256': digest.removeprefix('sha256:')}


def latest_release():
    return release_asset(json.loads(fetch(API, 1_000_000, api=True)))


def read(path):
    return json.loads(path.read_text())


def matches(root, release):
    try:
        return (read(root / 'assets/provider-icons/package.json')['version'] == release['version'] and
                read(root / 'assets/provider-icons/source.json') == {key: release[key] for key in ('archive', 'sha256')})
    except (OSError, ValueError, KeyError):
        return False


def validate_bundle(root, version):
    bundle = root / 'assets/provider-icons'
    package, manifest = read(bundle / 'package.json'), read(bundle / 'manifest.json')
    if (package.get('name') != '@agenticdriver/provider-icons' or package.get('version') != version or
            manifest.get('version') != 1 or manifest.get('packageVersion') != version or not manifest.get('icons')):
        raise ValueError('Archive identity, version or manifest schema mismatch')
    files = {'index.js', 'manifest.js', 'react-names.js', 'LICENSE', 'NOTICE', 'provenance.json'}
    artwork = set()
    for icon in manifest['icons'].values():
        for variant in [icon, *icon.get('artworks', {}).values()]:
            artwork.add(variant['monochrome'])
            if variant.get('color'):
                artwork.add(variant['color'])
    for name in files | artwork:
        if Path(name).name != name or (bundle / name).is_symlink() or not (bundle / name).is_file():
            raise ValueError(f'Missing or unsafe catalog file: {name}')
    return len(manifest['icons']), len(artwork)


def install_staged(root, stage):
    """Replace only owned outputs; restore them all if a replacement fails."""
    backups, installed = [], []
    try:
        for index, name in enumerate(TARGETS):
            destination = root / name
            if destination.is_symlink():
                raise ValueError(f'Refusing symlink destination: {name}')
            backup = stage / f'previous-{index}'
            if destination.exists():
                destination.rename(backup)
                backups.append((backup, destination))
            (stage / name).rename(destination)
            installed.append(destination)
    except Exception:
        for destination in reversed(installed):
            if destination.is_dir():
                shutil.rmtree(destination)
            else:
                destination.unlink()
        for backup, destination in reversed(backups):
            backup.rename(destination)
        raise


def refresh(root, release, data):
    # Use the already pinned vendorer; never execute scripts from the download.
    spec = importlib.util.spec_from_file_location('provider_icon_vendor', root / 'assets/provider-icons/scripts/vendor.py')
    vendor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vendor)
    files = vendor.package_files(data, release['sha256'])
    (root / 'artifacts').mkdir(exist_ok=True)
    # Same filesystem permits renames and rollback of the bundle/font as a set.
    with tempfile.TemporaryDirectory(prefix='provider-icons-update.', dir=root / 'artifacts') as temporary:
        stage = Path(temporary)
        vendor.write_package(files, stage / 'assets/provider-icons',
                             {key: release[key] for key in ('archive', 'sha256')})
        counts = validate_bundle(stage, release['version'])
        fonts = stage / 'platforms/polybar'
        fonts.mkdir(parents=True)
        for name in ('build-font.py', 'glyphs.json'):
            shutil.copy2(root / 'platforms/polybar' / name, fonts / name)
        subprocess.run([sys.executable, str(fonts / 'build-font.py')], check=True)
        install_staged(root, stage)
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if the bundle differs from the latest stable release; do not modify files')
    parser.add_argument('--force', action='store_true', help='Rebuild the bundle/font even when the release is unchanged')
    args = parser.parse_args()
    try:
        release = latest_release()
        current = matches(ROOT, release)
        if args.check and not current:
            print(f'Bundled provider-icons is stale; latest is v{release["version"]}. Run scripts/update-provider-icons.sh, test and commit before tagging.', file=sys.stderr)
            return 1
        if current and (args.check or not args.force):
            counts = validate_bundle(ROOT, release['version'])
            print(f'provider-icons v{release["version"]} is current: {counts[0]} marks, {counts[1]} SVG variants')
            return 0
        counts = refresh(ROOT, release, fetch(release['archive'], 4_000_000))
        print(f'Updated to provider-icons v{release["version"]}: {counts[0]} marks, {counts[1]} SVG variants; SHA-256 verified, Polybar font rebuilt')
        return 0
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f'Icon refresh failed: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
