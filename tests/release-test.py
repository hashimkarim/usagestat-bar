#!/usr/bin/env python3
"""Regression tests for release rejection paths, immutable assets and real media validation."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import release
import importlib
publish = importlib.import_module('publish-release')
encoder = release.module('gnome_encoder', ROOT / 'tests/encode-gnome.py')


def png(path):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 320, 320, 8, 2, 0, 0, 0))
                     + chunk(b'IDAT', zlib.compress((b'\0' + b'\x80\x80\x80' * 320) * 320)) + chunk(b'IEND', b''))


class Gates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.media = Path(cls.temp.name)
        png(cls.media / 'screen.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-loop', '1', '-i', str(cls.media / 'screen.png'),
                        '-t', '2', '-r', '5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(cls.media / 'review.mp4')], check=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.folder = self.root / 'gnome'
        self.folder.mkdir()
        for name in ['screen.png', 'review.mp4']:
            shutil.copy2(self.media / name, self.folder / name)
        self.rules = {'requiredChecks': ['click', 'fixed-panel'], 'compatibilitySkips': {'fixed-panel': 'fixed architecture'}}
        self.raw = {'status': 'passed', 'results': [
            {'name': 'click', 'status': 'passed', 'seconds': .5, 'screenshot': 'screen.png'},
            {'name': 'fixed-panel', 'status': 'skipped', 'reason': 'fixed architecture'}]}
        self.env = {'sourceCommit': 'a' * 40, 'trackedChanges': False}
        self.manifest = {'commit': 'a' * 40, 'artifacts': {'gnome.zip': {'sha256': 'b' * 64}}, 'targetArtifacts': {'gnome': 'gnome.zip'}}
        (self.folder / 'archive.sha256').write_text('b' * 64 + '  gnome.zip\n')

    def gate(self):
        release.write(self.folder / 'result.json', self.raw)
        release.write(self.folder / 'environment.json', self.env)
        return release.validate_target('gnome', self.rules, self.folder, self.manifest)

    def test_accepts_real_media_and_only_documented_skip(self):
        self.assertEqual(self.gate()['counts'], {'passed': 1, 'skipped': 1})

    def test_missing_duplicate_failed_unknown_and_reasonless_checks_block(self):
        original = copy.deepcopy(self.raw)
        mutations = [lambda checks: checks.pop(0), lambda checks: checks.append(checks[0]),
                     lambda checks: checks[0].update(status='failed'),
                     lambda checks: checks[0].update(status='skipped', reason='No runner'),
                     lambda checks: checks[1].update(reason=''), lambda checks: checks[1].update(status='unsupported'),
                     lambda checks: checks.append({'name': 'unexpected', 'status': 'blocked'})]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.raw = copy.deepcopy(original)
                mutation(self.raw['results'])
                with self.assertRaises(ValueError):
                    self.gate()

    def test_stale_commit_dirty_source_and_different_archive_block(self):
        for env in [{'sourceCommit': 'c' * 40, 'trackedChanges': False}, {'sourceCommit': 'a' * 40, 'trackedChanges': True}]:
            self.env = env
            with self.assertRaises(ValueError):
                self.gate()
        self.env = {'sourceCommit': 'a' * 40, 'trackedChanges': False}
        (self.folder / 'archive.sha256').write_text('c' * 64 + '  gnome.zip')
        with self.assertRaises(ValueError):
            self.gate()

    def test_missing_corrupt_or_outside_screenshot_blocks(self):
        for name in ['absent.png', '../screen.png', '/tmp/screen.png']:
            self.raw['results'][0]['screenshot'] = name
            with self.assertRaises(ValueError):
                self.gate()
        self.raw['results'][0]['screenshot'] = 'screen.png'
        (self.folder / 'screen.png').write_bytes((self.folder / 'screen.png').read_bytes()[:-20])
        with self.assertRaises(ValueError):
            self.gate()

    def test_short_or_corrupt_video_blocks(self):
        self.raw['results'][0]['seconds'] = 60
        with self.assertRaises(ValueError):
            self.gate()
        self.raw['results'][0]['seconds'] = .5
        (self.folder / 'review.mp4').write_bytes(b'broken video')
        with self.assertRaises(subprocess.CalledProcessError):
            self.gate()

    def test_timestamp_is_required(self):
        for seconds in [None, -1, float('nan'), float('inf')]:
            self.raw['results'][0]['seconds'] = seconds
            with self.assertRaises(ValueError):
                self.gate()

    def test_partial_or_failed_native_run_cannot_assemble(self):
        (self.root / 'manifest.json').write_text('{}')
        for targets in [{}, {'gnome': {'status': 'failed'}}]:
            release.write(self.root / 'run.json', {'commit': self.manifest['commit'],
                          'manifestSha256': release.sha(self.root / 'manifest.json'), 'targets': targets})
            with patch.object(release, 'candidate', return_value=self.manifest), patch.object(release, 'config', return_value={'targets': {'gnome': self.rules}}):
                with self.assertRaises(ValueError):
                    release.verify(self.root, self.root)

    def test_gnome_encoder_preserves_observed_timing(self):
        frames = self.root / 'frames'
        frames.mkdir()
        samples = []
        for index, seconds in enumerate([0, .2, 1.8]):
            name = f'frames/{index:05}.png'
            shutil.copy2(self.media / 'screen.png', self.root / name)
            samples.append({'file': name, 'seconds': seconds})
        (self.root / 'frame-times.jsonl').write_text('\n'.join(json.dumps(item) for item in samples))
        encoder.encode(self.root)
        self.assertGreaterEqual(release.validate_video(self.root / 'review.mp4', 1.8), 2)
        samples[-1]['seconds'] = .1
        (self.root / 'frame-times.jsonl').write_text('\n'.join(json.dumps(item) for item in samples))
        with self.assertRaises(ValueError):
            encoder.encode(self.root)

    def test_canonical_archives_ignore_filesystem_mtime(self):
        stage = self.root / 'bundle'
        stage.mkdir()
        (stage / 'runtime.js').write_text('release content')
        release.canonical_tar(stage, self.root / 'one.tgz', 1700000000)
        import os
        os.utime(stage / 'runtime.js', (1000, 1000))
        release.canonical_tar(stage, self.root / 'two.tgz', 1700000000)
        self.assertEqual(release.sha(self.root / 'one.tgz'), release.sha(self.root / 'two.tgz'))
        with tarfile.open(self.root / 'one.tgz') as archive:
            self.assertEqual(archive.extractfile('bundle/runtime.js').read(), b'release content')
        with zipfile.ZipFile(self.root / 'original.zip', 'w') as archive:
            archive.writestr('metadata.json', '{"uuid":"example"}')
            archive.writestr('extension.js', 'content')
        for name in ['one.zip', 'two.zip']:
            release.canonical_zip(self.root / 'original.zip', self.root / name, 1700000000, {'version': 1})
        self.assertEqual(release.sha(self.root / 'one.zip'), release.sha(self.root / 'two.zip'))
        with zipfile.ZipFile(self.root / 'one.zip') as archive:
            self.assertEqual(json.loads(archive.read('metadata.json'))['version'], 1)

    def test_candidate_rejects_changed_assets(self):
        cfg = release.config()
        names = [f'usagestat-bar-{cfg["version"]}.shell-extension.zip', f'usagestat-bar-{cfg["version"]}-linux.tar.gz']
        for name in names:
            (self.root / name).write_bytes(b'candidate')
        manifest = {'schemaVersion': 1, 'commit': 'a' * 40, 'version': cfg['version'], 'architecture': cfg['architecture'],
                    'configSha256': release.sha(ROOT / 'release.json'),
                    'checks': {'commit': 'a' * 40, 'configSha256': release.sha(ROOT / 'release.json'), 'suites': {name: 0 for name in release.SUITES}},
                    'artifacts': {name: release.file_record(self.root / name) for name in names},
                    'targetArtifacts': {target: names[0 if target == 'gnome' else 1] for target in cfg['targets']}}
        release.write(self.root / 'manifest.json', manifest)
        with patch.object(release, 'clean_commit', return_value='a' * 40):
            release.candidate(self.root)
            (self.root / names[0]).write_bytes(b'changed')
            with self.assertRaises(ValueError):
                release.candidate(self.root)

    def test_publish_is_dry_by_default_and_tag_must_match(self):
        manifest = {**self.manifest, 'version': '0.1.0-rc.1'}
        with patch.object(publish, 'validate', return_value=(manifest, ['asset'])), patch.object(publish, 'gh') as gh:
            publish.publish(self.root, 'v0.1.0-rc.1')
            gh.assert_not_called()
        with patch.object(release, 'candidate', return_value=manifest):
            with self.assertRaises(ValueError):
                publish.validate(self.root, 'v0.1.0')

    def test_publish_does_not_treat_api_failure_as_absence(self):
        manifest = {**self.manifest, 'version': '0.1.0-rc.1'}
        with patch.object(publish, 'validate', return_value=(manifest, ['asset'])), \
                patch.object(release, 'command', return_value=manifest['commit']), \
                patch.object(subprocess, 'run'), \
                patch.object(publish, 'gh', side_effect=subprocess.CalledProcessError(1, ['gh'])) as gh:
            with self.assertRaises(subprocess.CalledProcessError):
                publish.publish(self.root, 'v0.1.0-rc.1', True)
            self.assertEqual(gh.call_count, 1)
            self.assertEqual(gh.call_args.args[0], 'api')


if __name__ == '__main__':
    unittest.main()
