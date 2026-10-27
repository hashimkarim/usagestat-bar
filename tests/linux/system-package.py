#!/usr/bin/env python3
"""Exercise package staging without allowing installation into the build host."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]

with tempfile.TemporaryDirectory(prefix='usagestat-system-package.') as temp:
    base = Path(temp)
    bundle, dest = base / 'bundle', base / 'dest'
    subprocess.run(['python3', str(ROOT / 'platforms/linux/package.py'), 'stage', str(bundle)], check=True)
    subprocess.run(['python3', str(ROOT / 'packaging/stage.py'), '--source', str(bundle),
                    '--destdir', str(dest), '--version', '0.2.0-rc.1', '--component', 'runtime', '--component', 'plasma',
                    '--component', 'cinnamon', '--component', 'mate'], check=True)
    launcher = dest / 'usr/bin/usagestat-bar'
    assert launcher.stat().st_mode & 0o111
    assert '/usr/share/usagestat-bar/platforms/linux/usagestat-bar' in launcher.read_text()
    subprocess.run(['bash', '-n', str(launcher)], check=True)
    service = dest / 'usr/share/dbus-1/services/io.github.HashimK.UsageStatBar.service'
    assert 'Exec=/usr/bin/usagestat-bar service\n' in service.read_text()
    assert (dest / 'usr/share/plasma/plasmoids/io.github.HashimK.usagestat/contents/ui/main.qml').is_file()
    assert (dest / 'usr/share/cinnamon/applets/usagestat-bar@hashimkarim/applet.js').is_file()
    assert (dest / 'usr/share/mate-panel/applets/io.github.HashimK.UsageStat.mate-panel-applet').is_file()
    assert not (dest / 'usr/share/usagestat-bar/platforms/linux/install.py').exists()
    assert not (dest / 'usr/share/usagestat-bar/platforms/polybar/build.sh').exists()
    assert not (dest / 'etc').exists(), 'Packaging must not enable sessions or touch configuration'
    probe = base / 'render-import.js'
    probe.write_text('await import(ARGV[0]);\n')
    subprocess.run(['gjs', '-m', str(probe),
                    (dest / 'usr/share/usagestat-bar/platforms/linux/render.js').as_uri()], check=True)
    for path in dest.rglob('*'):
        if path.is_file() and path.suffix in ('.service', '.desktop'):
            assert str(base) not in path.read_text(), f'Build path leaked: {path}'
    print('Passed: staged runtime and desktop registration use final paths without host installation')
