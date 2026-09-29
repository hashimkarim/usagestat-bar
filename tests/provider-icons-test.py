#!/usr/bin/env python3
"""Offline regressions for release selection and atomic icon/font refreshes."""
from contextlib import redirect_stderr, redirect_stdout
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('icon_updater', ROOT / 'scripts/update-provider-icons.py')
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def archive(version='9.2.3'):
    files = {
        'package.json': json.dumps({'name': '@agenticdriver/provider-icons', 'version': version}),
        'manifest.json': json.dumps({'version': 1, 'packageVersion': version,
                                    'icons': {'fixture': {'monochrome': 'fixture.svg'}}}),
        'assets/fixture.svg': '<svg viewBox="0 0 24 24"/>',
        **{name: '' for name in ['index.js', 'manifest.js', 'react-names.js', 'LICENSE', 'NOTICE', 'provenance.json']},
    }
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as package:
        for name, text in files.items():
            data = text.encode()
            info = tarfile.TarInfo('package/' + name)
            info.size = len(data)
            package.addfile(info, io.BytesIO(data))
    return output.getvalue()


class IconUpdates(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        bundle = self.root / 'assets/provider-icons'
        (bundle / 'scripts').mkdir(parents=True)
        shutil.copy2(ROOT / 'assets/provider-icons/scripts/vendor.py', bundle / 'scripts/vendor.py')
        (bundle / 'old.svg').write_text('old artwork')
        (bundle / 'package.json').write_text('{"version":"0.0.1"}')
        (bundle / 'source.json').write_text('{}')
        fonts = self.root / 'platforms/polybar'
        fonts.mkdir(parents=True)
        (fonts / 'glyphs.json').write_text('{"generic":1048576}')
        (fonts / 'UsageStatProviderIcons.ttf').write_bytes(b'old font')
        (fonts / 'build-font.py').write_text('from pathlib import Path\np=Path(__file__).parent\n'
                                            '(p/"UsageStatProviderIcons.ttf").write_bytes(b"new font")\n')
        (self.root / 'unrelated').write_text('preserve me')
        self.data = archive()
        self.release = {'version': '9.2.3', 'archive': 'https://github.com/agenticdriver/provider-icons/releases/download/v9.2.3/agenticdriver-provider-icons-9.2.3.tgz',
                        'sha256': hashlib.sha256(self.data).hexdigest()}

    def snapshot(self):
        return {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob('*')
                if path.is_file() and 'artifacts' not in path.relative_to(self.root).parts
                and '__pycache__' not in path.parts}

    def metadata(self):
        return {'tag_name': 'v9.2.3', 'draft': False, 'prerelease': False, 'assets': [
            {'name': 'agenticdriver-provider-icons-9.2.3.tgz', 'browser_download_url': self.release['archive'],
             'digest': 'sha256:' + self.release['sha256']}]}

    def run_main(self, *args):
        with patch.object(updater, 'ROOT', self.root), patch.object(updater, 'latest_release', return_value=self.release), \
                patch.object(sys, 'argv', ['updater', *args]), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            return updater.main()

    def test_stable_release_uses_exact_asset_and_digest(self):
        self.assertEqual(updater.release_asset(self.metadata()), self.release)
        for key in ['draft', 'prerelease']:
            value = self.metadata(); value[key] = True
            with self.assertRaises(ValueError): updater.release_asset(value)
        for field, value in [('digest', ''), ('digest', None), ('digest', 'sha256:bad'), ('browser_download_url', 'https://example.test/archive.tgz')]:
            metadata = self.metadata(); metadata['assets'][0][field] = value
            with self.assertRaises(ValueError): updater.release_asset(metadata)

    def test_missing_or_ambiguous_assets_are_errors(self):
        for assets in [[], self.metadata()['assets'] * 2]:
            metadata = self.metadata(); metadata['assets'] = assets
            with self.assertRaises(ValueError): updater.release_asset(metadata)

    def test_freshness_check_fails_without_changing_stale_bundle(self):
        before = self.snapshot()
        self.assertEqual(self.run_main('--check'), 1)
        self.assertEqual(self.snapshot(), before)

    def test_refresh_replaces_obsolete_files_and_font_together(self):
        self.assertEqual(updater.refresh(self.root, self.release, self.data), (1, 1))
        self.assertFalse((self.root / 'assets/provider-icons/old.svg').exists())
        self.assertEqual((self.root / 'platforms/polybar/UsageStatProviderIcons.ttf').read_bytes(), b'new font')
        self.assertEqual((self.root / 'unrelated').read_text(), 'preserve me')
        self.assertTrue(updater.matches(self.root, self.release))
        before = self.snapshot()
        self.assertEqual(self.run_main('--check'), 0)
        self.assertEqual(self.run_main(), 0)
        self.assertEqual(self.snapshot(), before)

    def test_bad_digest_does_not_touch_existing_bundle(self):
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'digest'):
            updater.refresh(self.root, self.release, self.data + b'tampered')
        self.assertEqual(self.snapshot(), before)

    def test_version_mismatch_does_not_touch_existing_bundle(self):
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'version'):
            updater.refresh(self.root, {**self.release, 'version': '9.2.4'}, self.data)
        self.assertEqual(self.snapshot(), before)

    def test_font_failure_preserves_old_bundle(self):
        before = self.snapshot()
        with patch.object(updater.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, ['font'])):
            with self.assertRaises(subprocess.CalledProcessError):
                updater.refresh(self.root, self.release, self.data)
        self.assertEqual(self.snapshot(), before)

    def test_partial_install_rolls_back_every_output(self):
        before = self.snapshot()
        stage = self.root / 'artifacts/stage'
        (stage / 'assets/provider-icons').mkdir(parents=True)
        (stage / 'assets/provider-icons/new.svg').write_text('new')
        with self.assertRaises(FileNotFoundError): updater.install_staged(self.root, stage)
        self.assertEqual(self.snapshot(), before)

    def test_missing_catalog_artwork_fails_the_check(self):
        updater.refresh(self.root, self.release, self.data)
        (self.root / 'assets/provider-icons/fixture.svg').unlink()
        self.assertEqual(self.run_main('--check'), 2)

    def test_network_failure_cannot_report_current(self):
        with patch.object(updater, 'latest_release', side_effect=OSError('offline')), \
                patch.object(sys, 'argv', ['updater', '--check']), redirect_stderr(io.StringIO()):
            self.assertEqual(updater.main(), 2)


if __name__ == '__main__':
    unittest.main()
