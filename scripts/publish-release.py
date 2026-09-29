#!/usr/bin/env python3
"""Publish an already verified candidate; dry-run unless --publish is explicit."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile

import release


def validate(directory, tag):
    manifest = release.candidate(directory)
    if tag != 'v' + manifest['version']:
        raise ValueError('Tag must exactly match release.json and the candidate version')
    verification = release.read(directory / 'verification.json')
    if (verification['commit'] != manifest['commit'] or verification['manifestSha256'] != release.sha(directory / 'manifest.json')
            or set(verification['targets']) != set(release.config()['targets'])):
        raise ValueError('Missing full candidate verification')
    records = {}
    for line in (directory / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split('  ', 1)
        if name in records or not re.fullmatch('[a-f0-9]{64}', digest):
            raise ValueError('Invalid/duplicate checksum entry')
        if release.sha(release.safe_file(directory, name)) != digest:
            raise ValueError(f'Changed release asset: {name}')
        records[name] = digest
    required = {*manifest['artifacts'], 'manifest.json', 'verification.json', 'RELEASE_NOTES.md',
                f'usagestat-bar-{manifest["version"]}-evidence.tar.gz'}
    if set(records) != required:
        raise ValueError('Release assets are incomplete or unexpected')
    return manifest, [*sorted(records), 'SHA256SUMS']


def gh(*args):
    return release.command(['gh', *args])


def publish(directory, tag, apply=False):
    manifest, names = validate(directory, tag)
    repository = release.config()['repository']
    if not apply:
        print(json.dumps({'dryRun': True, 'repository': repository, 'tag': tag, 'assets': names,
                          'prerelease': '-' in manifest['version']}, indent=2))
        return
    # Read the live immutable tag and main before any publication. Never create/move tags here.
    release.command(['git', 'fetch', '--no-tags', 'origin', 'main:refs/remotes/origin/main'])
    release.command(['git', 'fetch', '--no-tags', 'origin', f'refs/tags/{tag}'])
    live_tag = release.command(['git', 'rev-parse', 'FETCH_HEAD^{commit}'])
    if live_tag != manifest['commit']:
        raise ValueError('Remote tag differs from the verified candidate')
    subprocess.run(['git', 'merge-base', '--is-ancestor', manifest['commit'], 'origin/main'], cwd=release.ROOT, check=True)
    # Listing succeeds with an empty result for absence; API/auth failures are never treated as absence.
    pages = json.loads(gh('api', '--paginate', '--slurp', '-H', 'Cache-Control: no-cache', f'repos/{repository}/releases?per_page=100'))
    existing = next((item for page in pages for item in page if item['tag_name'] == tag), None)
    if existing:
        if not existing['draft']:
            raise ValueError(f'{tag} is already published; release assets are immutable (use a new version)')
        assets = json.loads(gh('api', '--paginate', '--slurp', '-H', 'Cache-Control: no-cache',
                              f'repos/{repository}/releases/{existing["id"]}/assets?per_page=100'))
        assets = [asset for page in assets for asset in page]
        if {item['name'] for item in assets} - set(names):
            raise ValueError('Existing draft has unexpected assets; inspect it before retrying')
        # Retry only missing assets; compare content before reusing anything already uploaded.
        with tempfile.TemporaryDirectory(prefix='usagestat-release-retry.') as temp:
            for asset in assets:
                path = Path(temp) / asset['name']
                with path.open('wb') as stream:
                    subprocess.run(['gh', 'api', '-H', 'Accept: application/octet-stream', '-H', 'Cache-Control: no-cache',
                                    f'repos/{repository}/releases/assets/{asset["id"]}'], stdout=stream, check=True)
                if release.sha(path) != release.sha(directory / asset['name']):
                    raise ValueError(f'Existing draft asset differs: {asset["name"]}; never overwritten')
        present = {item['name'] for item in assets}
    else:
        gh('release', 'create', tag, '--repo', repository, '--verify-tag', '--draft',
           '--title', f'UsageStat Bar {manifest["version"]}', '--notes-file', str(directory / 'RELEASE_NOTES.md'))
        present = set()
    for name in names:
        if name not in present:
            gh('release', 'upload', tag, str(directory / name), '--repo', repository)
    # --latest=false avoids downgrading the latest release on a delayed/retried older tag.
    gh('release', 'edit', tag, '--repo', repository, '--draft=false', '--latest=false',
       '--prerelease=' + str('-' in manifest['version']).lower(), '--notes-file', str(directory / 'RELEASE_NOTES.md'))
    print(f'https://github.com/{repository}/releases/tag/{tag}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', required=True, type=Path)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    try:
        publish(args.directory.resolve(), args.tag, args.publish)
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error)) from error
