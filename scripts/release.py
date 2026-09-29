#!/usr/bin/env python3
"""Build Linux candidates and require native evidence before assembling a release."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import gzip
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import platform
import re
import shutil
import struct
import subprocess
import tarfile
import tempfile
import time
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
SEMVER = r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:alpha|beta|rc)\.[1-9]\d*)?'
SUITES = {'shared': ['bash', 'tests/run.sh'], 'linux': ['bash', 'tests/linux/run.sh'],
          'gnome-package': ['bash', 'tests/package.sh'], 'linux-package': ['python3', 'tests/linux/package.py'],
          'release-tools': ['python3', 'tests/release-test.py']}


def read(path):
    return json.loads(path.read_text())


def write(path, data):
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + '\n')


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def command(args, **kwargs):
    return subprocess.check_output([str(arg) for arg in args], cwd=ROOT, text=True, **kwargs).strip()


def clean_commit():
    if command(['git', 'status', '--porcelain', '--untracked-files=no']):
        raise ValueError('Commit tracked changes before creating release evidence')
    return command(['git', 'rev-parse', 'HEAD'])


def config():
    data = read(ROOT / 'release.json')
    if data['schemaVersion'] != 1 or not re.fullmatch(SEMVER, data['version']):
        raise ValueError('release.json requires a semantic version (optionally alpha/beta/rc.N)')
    if type(data['gnomeVersion']) is not int or data['gnomeVersion'] < 1:
        raise ValueError('gnomeVersion must be a positive integer')
    return data


def file_record(path):
    return {'sha256': sha(path), 'bytes': path.stat().st_size}


def safe_file(directory, name):
    if not isinstance(name, str) or not name or Path(name).name != name:
        raise ValueError(f'Expected a plain filename: {name!r}')
    path = directory / name
    if path.is_symlink() or not path.is_file():
        raise ValueError(f'Missing regular file: {path}')
    return path


def canonical_tar(source, output, epoch):
    with output.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=epoch) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for path in [source, *sorted(source.rglob('*'))]:
                if path.is_symlink():
                    raise ValueError(f'Release staging contains a symlink: {path}')
                info = archive.gettarinfo(str(path), str(Path(source.name) / path.relative_to(source)))
                info.uid = info.gid = 0
                info.uname = info.gname = ''
                info.mtime = epoch
                info.mode = 0o755 if path.is_dir() or path.stat().st_mode & 0o111 else 0o644
                if path.is_file():
                    with path.open('rb') as stream:
                        archive.addfile(info, stream)
                else:
                    archive.addfile(info)


def canonical_zip(source, output, epoch, metadata):
    with zipfile.ZipFile(source) as original, zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(original.namelist()):
            if name.endswith('/'):
                continue
            info = zipfile.ZipInfo(name, time.gmtime(max(epoch, 315532800))[:6])
            info.create_system = 3
            info.external_attr = (0o100644 << 16)
            info.compress_type = zipfile.ZIP_DEFLATED
            data = original.read(name)
            if name == 'metadata.json':
                data = (json.dumps({**json.loads(data), **metadata}, indent=2) + '\n').encode()
            archive.writestr(info, data)


def check(output):
    commit = clean_commit()
    output.mkdir(parents=True, exist_ok=False)
    results = {}
    for name, args in SUITES.items():
        print(f'Running {name}', flush=True)
        with (output / f'{name}.log').open('w') as log:
            results[name] = subprocess.run(args, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT).returncode
    write(output / 'checks.json', {'commit': commit, 'configSha256': sha(ROOT / 'release.json'), 'suites': results})
    if commit != clean_commit() or any(results.values()):
        raise ValueError(f'Fast checks failed: {results}; see {output}')


def build(output, checks):
    commit, cfg = clean_commit(), config()
    fast = read(checks / 'checks.json')
    if fast != {'commit': commit, 'configSha256': sha(ROOT / 'release.json'), 'suites': {name: 0 for name in SUITES}}:
        raise ValueError('Candidate requires all fast checks at this commit/configuration')
    epoch = int(command(['git', 'show', '-s', '--format=%ct', commit]))
    output.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix='usagestat-release.') as temp:
        temp = Path(temp)
        source = temp / 'source'
        source.mkdir()
        snapshot = subprocess.check_output(['git', 'archive', commit], cwd=ROOT)
        with tarfile.open(fileobj=io.BytesIO(snapshot)) as archive:
            archive.extractall(source, filter='data')
        subprocess.run(['bash', str(source / 'build.sh'), str(temp / 'gnome.zip')], check=True)
        gnome_name = f'usagestat-bar-{cfg["version"]}.shell-extension.zip'
        canonical_zip(temp / 'gnome.zip', output / gnome_name, epoch,
                      {'version': cfg['gnomeVersion'], 'version-name': cfg['version']})
        stage = temp / 'usagestat-bar'
        subprocess.run(['python3', str(source / 'platforms/linux/package.py'), 'stage', str(stage)], check=True)
        # The installer compiles schemas on the destination, avoiding host GLib output in portable assets.
        (stage / 'platforms/linux/schemas/gschemas.compiled').unlink()
        write(stage / 'release.json', {'version': cfg['version'], 'commit': commit})
        linux_name = f'usagestat-bar-{cfg["version"]}-linux.tar.gz'
        canonical_tar(stage, output / linux_name, epoch)
    manifest = {'schemaVersion': 1, 'version': cfg['version'], 'commit': commit, 'epoch': epoch,
                'configSha256': sha(ROOT / 'release.json'), 'architecture': cfg['architecture'], 'scope': cfg['scope'],
                'backend': cfg['backend'], 'providerIcons': read(ROOT / 'assets/provider-icons/source.json'),
                'artifacts': {name: file_record(output / name) for name in [gnome_name, linux_name]},
                'targetArtifacts': {target: gnome_name if target == 'gnome' else linux_name for target in cfg['targets']},
                'checks': fast}
    write(output / 'manifest.json', manifest)
    if commit != clean_commit():
        raise ValueError('Source changed while building')
    print(output / 'manifest.json')


def candidate(directory):
    data, cfg = read(directory / 'manifest.json'), config()
    if (data['schemaVersion'] != 1 or data['commit'] != clean_commit() or
            data['configSha256'] != sha(ROOT / 'release.json') or data['version'] != cfg['version'] or
            data['architecture'] != cfg['architecture']):
        raise ValueError('Candidate source/version/scope does not match this clean checkout')
    expected_names = {f'usagestat-bar-{cfg["version"]}.shell-extension.zip', f'usagestat-bar-{cfg["version"]}-linux.tar.gz'}
    if set(data['artifacts']) != expected_names or set(data['targetArtifacts']) != set(cfg['targets']):
        raise ValueError('Candidate has missing or unexpected artifacts/targets')
    for target, name in data['targetArtifacts'].items():
        expected = f'usagestat-bar-{cfg["version"]}' + ('.shell-extension.zip' if target == 'gnome' else '-linux.tar.gz')
        if name != expected:
            raise ValueError(f'{target}: wrong candidate artifact')
    for name, record in data['artifacts'].items():
        if file_record(safe_file(directory, name)) != record:
            raise ValueError(f'Candidate checksum mismatch: {name}')
    if data['checks'] != {'commit': data['commit'], 'configSha256': data['configSha256'], 'suites': {name: 0 for name in SUITES}}:
        raise ValueError('Candidate fast checks are incomplete')
    return data


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


def native(artifacts, output, targets, jobs):
    manifest = candidate(artifacts)
    selected = list(config()['targets']) if targets == 'all' else targets.split(',')
    if not selected or len(selected) != len(set(selected)) or set(selected) - set(config()['targets']):
        raise ValueError('Select all or unique comma-separated release target IDs')
    if platform.machine() != manifest['architecture']:
        raise ValueError(f'This release scope requires {manifest["architecture"]}')
    output.mkdir(parents=True, exist_ok=False)
    raw = output / 'raw'
    raw.mkdir()
    review = module('linux_review', ROOT / 'tests/linux/review.py')
    report = module('linux_report', ROOT / 'tests/linux/report.py')
    outcomes = {}

    def run(target):
        archive = artifacts / manifest['targetArtifacts'][target]
        try:
            if target == 'gnome':
                env = {**os.environ, 'USAGESTAT_TEST_INTERACTIONS': '1', 'USAGESTAT_TEST_OUTPUT_DIR': str(raw / target),
                       'USAGESTAT_TEST_EXTENSION_ARCHIVE': str(archive)}
                with (output / 'gnome-launch.log').open('w') as log:
                    subprocess.run(['bash', str(ROOT / 'tests/gnome-session.sh'), '--check'], env=env,
                                   stdout=log, stderr=subprocess.STDOUT, timeout=180, check=True)
            else:
                result = review.run(target, raw / target, archive)
                if result['status'] != 'passed':
                    raise ValueError(f'{target}: native scenarios failed')
            return {'status': 'completed'}
        except Exception as error:
            return {'status': 'failed', 'error': str(error)}

    with ThreadPoolExecutor(max_workers=jobs) as pool:
        futures = {pool.submit(run, target): target for target in selected}
        for future in as_completed(futures):
            target = futures[future]
            outcomes[target] = future.result()
            print(target, outcomes[target], flush=True)
    write(output / 'run.json', {'commit': manifest['commit'], 'manifestSha256': sha(artifacts / 'manifest.json'),
                                'targets': outcomes})
    # Only publish fixture evidence, never frozen source trees, frame caches, or process environment dumps.
    gallery = output / 'gallery'
    if list(raw.glob('*/result.json')):
        runs = report.collect([raw], gallery, [], {})
        for run in runs:
            run['source'] = 'native release lab'
            if outcomes[run['target']]['status'] != 'completed':
                run['status'] = 'failed'
                run['note'] = outcomes[run['target']].get('error', '')
        for path in gallery.glob('*/capture-env.json'):
            path.unlink()
        for target in selected:
            path = raw / target / 'archive.sha256'
            if path.exists():
                shutil.copy2(path, gallery / target / path.name)
        write(gallery / 'summary.json', runs)
        (gallery / 'index.html').write_text(report.render(runs, f'UsageStat Bar {manifest["version"]} · {manifest["commit"][:12]}'))
    # Retain setup logs for profiles that failed before producing result.json as well.
    logs = output / 'logs'
    logs.mkdir()
    for target in selected:
        for path in (raw / target).glob('*.log'):
            shutil.copy2(path, logs / f'{target}-{path.name}')
    if manifest['commit'] != clean_commit() or any(item['status'] != 'completed' for item in outcomes.values()):
        raise ValueError(f'Native run has failures; inspect {output}')


def validate_png(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Invalid PNG: {path}')
    position, pixels, dimensions = 8, bytearray(), None
    ended = False
    while position + 12 <= len(data):
        size = struct.unpack('>I', data[position:position + 4])[0]
        chunk = data[position + 4:position + 8 + size]
        end = position + size + 12
        if end > len(data) or zlib.crc32(chunk) != struct.unpack('>I', data[end - 4:end])[0]:
            raise ValueError(f'PNG checksum/truncation: {path}')
        if chunk[:4] == b'IHDR':
            dimensions = struct.unpack('>II', chunk[4:12])
        if chunk[:4] == b'IDAT':
            pixels.extend(chunk[4:])
        if chunk[:4] == b'IEND':
            ended = end == len(data)
            break
        position = end
    if not ended or not dimensions or min(dimensions) < 1 or not zlib.decompress(pixels):
        raise ValueError(f'Incomplete PNG: {path}')


def validate_video(path, last_step):
    probe = json.loads(command(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                'stream=codec_name,width,height:format=duration', '-of', 'json', path], timeout=30))
    streams = probe.get('streams', [])
    duration = float(probe.get('format', {}).get('duration', 0))
    if (not streams or streams[0]['codec_name'] != 'h264' or min(streams[0]['width'], streams[0]['height']) < 320
            or not math.isfinite(duration) or duration < max(1, last_step - 2)):
        raise ValueError(f'Missing/short/invalid native recording: {path}')
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:v:0', '-f', 'null', '-'],
                   check=True, timeout=180)
    return duration


def validate_target(target, rules, folder, manifest):
    raw, env = read(folder / 'result.json'), read(folder / 'environment.json')
    if raw['status'] != 'passed':
        raise ValueError(f'{target}: profile failed')
    if target == 'gnome':
        identity = env.get('sourceCommit') == manifest['commit'] and env.get('trackedChanges') is False
        artifact_hash = (folder / 'archive.sha256').read_text().split()[0]
    else:
        identity = (env.get('commit') == manifest['commit'] and env.get('dirty') is False
                    and env.get('target') == target and bool(env.get('image')))
        artifact_hash = env.get('bundleSha256')
    if not identity or artifact_hash != manifest['artifacts'][manifest['targetArtifacts'][target]]['sha256']:
        raise ValueError(f'{target}: stale source or different candidate archive')
    checks = raw.get('checks', raw.get('results', []))
    names = [item['name'] for item in checks]
    if len(names) != len(set(names)) or set(rules['requiredChecks']) - set(names):
        raise ValueError(f'{target}: duplicate or missing required checks')
    last_step = 0
    for item in checks:
        status, name = item['status'], item['name']
        if status == 'skipped':
            if name not in rules['compatibilitySkips'] or not item.get('reason', '').strip():
                raise ValueError(f'{target}/{name}: unapproved skip or missing reason')
        elif status != 'passed':
            raise ValueError(f'{target}/{name}: {status} blocks release')
        if status == 'passed':
            shot = safe_file(folder, item.get('screenshot'))
            if shot.suffix != '.png':
                raise ValueError(f'{target}/{name}: missing PNG screenshot')
            validate_png(shot)
            seconds = item.get('seconds')
            if not isinstance(seconds, (int, float)) or not math.isfinite(seconds) or seconds < 0:
                raise ValueError(f'{target}/{name}: missing video timestamp')
            last_step = max(last_step, seconds)
    duration = validate_video(safe_file(folder, 'review.mp4'), last_step)
    return {'counts': dict(Counter(item['status'] for item in checks)), 'videoSeconds': duration}


def verify(artifacts, evidence):
    manifest, cfg = candidate(artifacts), config()
    run = read(evidence / 'run.json')
    if (run.get('commit') != manifest['commit'] or run.get('manifestSha256') != sha(artifacts / 'manifest.json')
            or set(run.get('targets', {})) != set(cfg['targets'])
            or any(item.get('status') != 'completed' for item in run['targets'].values())):
        raise ValueError('Full release requires every native target at this candidate; partial/failed runs cannot publish')
    results = {}
    for target, rules in cfg['targets'].items():
        print(f'Verifying {target} evidence', flush=True)
        results[target] = validate_target(target, rules, evidence / 'gallery' / target, manifest)
    return {'commit': manifest['commit'], 'manifestSha256': run['manifestSha256'], 'targets': results}


def assemble(artifacts, evidence, output):
    verified = verify(artifacts, evidence)
    manifest = candidate(artifacts)
    output.mkdir(parents=True, exist_ok=False)
    for name in [*manifest['artifacts'], 'manifest.json']:
        shutil.copy2(artifacts / name, output / name)
    write(output / 'verification.json', verified)
    with tempfile.TemporaryDirectory(prefix='usagestat-evidence.') as temp:
        stage = Path(temp) / 'evidence'
        shutil.copytree(evidence / 'gallery', stage)
        shutil.copy2(evidence / 'run.json', stage / 'run.json')
        canonical_tar(stage, output / f'usagestat-bar-{manifest["version"]}-evidence.tar.gz', manifest['epoch'])
    notes = (ROOT / 'docs/RELEASE_NOTES.md').read_text()
    (output / 'RELEASE_NOTES.md').write_text(f'UsageStat Bar {manifest["version"]}\n\nSource: `{manifest["commit"]}`\n\n' + notes)
    sums = ''.join(f'{sha(path)}  {path.name}\n' for path in sorted(output.iterdir()))
    (output / 'SHA256SUMS').write_text(sums)
    print(f'Verified candidate ready at {output}; no release was published')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ['check', 'build', 'native', 'verify', 'assemble']:
        cmd = sub.add_parser(name)
        if name != 'verify':
            cmd.add_argument('--output', required=True, type=Path)
        if name == 'build':
            cmd.add_argument('--checks', required=True, type=Path)
        if name in ['native', 'verify', 'assemble']:
            cmd.add_argument('--artifacts', required=True, type=Path)
        if name in ['verify', 'assemble']:
            cmd.add_argument('--evidence', required=True, type=Path)
        if name == 'native':
            cmd.add_argument('--targets', default='all')
            cmd.add_argument('--jobs', type=int, choices=range(1, 5), default=2)
    args = vars(parser.parse_args())
    task = args.pop('command')
    for name, value in args.items():
        if isinstance(value, Path):
            args[name] = value.resolve()
    result = globals()[task](**args)
    if result:
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error)) from error
