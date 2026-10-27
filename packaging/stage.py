#!/usr/bin/env python3
"""Stage package-owned files; never run the interactive user-prefix installer."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

APP_ID = 'io.github.HashimK.UsageStatBar'
COMPONENTS = ('runtime', 'plasma', 'cinnamon', 'mate', 'xfce', 'budgie', 'lxqt', 'waybar')


def stage(source, dest, components, libdir, version):
    def output(name):
        path = dest / name.lstrip('/')
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def copy(relative, name):
        origin, target = source / relative, output(name)
        if origin.is_dir():
            shutil.copytree(origin, target, dirs_exist_ok=True)
        else:
            shutil.copy2(origin, target)

    def write(name, content, executable=False):
        target = output(name)
        target.write_text(content)
        target.chmod(0o755 if executable else 0o644)

    runtime = '/usr/share/usagestat-bar'
    if 'runtime' in components:
        for name in ('cli.js', 'config.js', 'preferences.js', 'providerMetadata.js', 'providerCatalog.js', 'iconUpdateData.js', 'providerIconUpdates.js', 'customIcons.js', 'assets'):
            copy(name, f'{runtime}/{name}')
        copy('LICENSE', '/usr/share/licenses/usagestat-bar/LICENSE')
        copy('platforms/linux', f'{runtime}/platforms/linux')
        for name in ('icons.js', 'glyphs.json'):
            copy(f'platforms/polybar/{name}', f'{runtime}/platforms/polybar/{name}')
        (dest / f'{runtime.lstrip("/")}/platforms/linux/install.py').unlink()
        write('/usr/bin/usagestat-bar', f'#!/bin/sh\nexec {runtime}/platforms/linux/usagestat-bar "$@"\n', True)
        write(f'/usr/share/dbus-1/services/{APP_ID}.service',
              f'[D-BUS Service]\nName={APP_ID}\nExec=/usr/bin/usagestat-bar service\n')
        write(f'/usr/share/applications/{APP_ID}.desktop',
              '[Desktop Entry]\nType=Application\nName=UsageStat Bar\nComment=AI provider quotas and costs\n'
              'Exec=usagestat-bar tray\nIcon=office-chart-pie\nTerminal=false\nCategories=Utility;Monitor;\n')
    for component, directory in (
        ('plasma', '/usr/share/plasma/plasmoids/io.github.HashimK.usagestat'),
        ('cinnamon', '/usr/share/cinnamon/applets/usagestat-bar@hashimkarim'),
    ):
        if component not in components:
            continue
        copy(f'platforms/{component}', directory)
        metadata = output(f'{directory}/metadata.json')
        data = json.loads(metadata.read_text())
        if component == 'plasma':
            data['KPlugin']['Version'] = version
            data['KPlugin']['Website'] = 'https://github.com/hashimkarim/usagestat-bar'
        else:
            data['version'] = version
        metadata.write_text(json.dumps(data, indent=2) + '\n')
    if 'mate' in components:
        copy('platforms/mate/applet.py', f'{runtime}/platforms/mate/applet.py')
        write('/usr/share/dbus-1/services/org.mate.panel.applet.UsageStatAppletFactory.service',
              '[D-BUS Service]\nName=org.mate.panel.applet.UsageStatAppletFactory\n'
              f'Exec=/usr/bin/python3 {runtime}/platforms/mate/applet.py\n')
        write('/usr/share/mate-panel/applets/io.github.HashimK.UsageStat.mate-panel-applet',
              '[Applet Factory]\nId=UsageStatAppletFactory\nInProcess=false\nName=UsageStat Bar\n\n'
              '[UsageStatApplet]\nName=UsageStat Bar\nDescription=AI provider quotas and costs\nIcon=office-chart-pie\n')
    for component in ('xfce', 'budgie', 'waybar', 'lxqt'):
        if component not in components:
            continue
        if component == 'xfce':
            library = f'{libdir}/xfce4/panel/plugins/libusagestat.so'
            write('/usr/share/xfce4/panel/plugins/usagestat.desktop',
                  '[Xfce Panel]\nType=X-XFCE-PanelPlugin\nName=UsageStat Bar\n'
                  'Comment=AI provider quotas and costs\nIcon=office-chart-pie\n'
                  'X-XFCE-Module=usagestat\nX-XFCE-API=2.0\n')
        elif component == 'budgie':
            library = f'{libdir}/budgie-desktop/plugins/usagestat/libusagestat.so'
            copy('platforms/budgie/usagestat.plugin', f'{libdir}/budgie-desktop/plugins/usagestat/usagestat.plugin')
        elif component == 'lxqt':
            library = f'{libdir}/lxqt-panel/libusagestat.so'
            copy('platforms/lxqt/usagestat.desktop', '/usr/share/lxqt/lxqt-panel/usagestat.desktop')
        else:
            library = f'{libdir}/usagestat-bar/libusagestat-waybar.so'
            copy('platforms/waybar/style.css', f'{runtime}/platforms/waybar/style.css')
            write(f'{runtime}/platforms/waybar/native.jsonc', json.dumps({
                'cffi/usagestat': {'module_path': library, 'height': 28}}, indent=2) + '\n')
        target = output(library)
        build = source / 'platforms' / ('lxqt/build.sh' if component == 'lxqt' else 'gtk-panel/build.sh')
        args = ['bash', str(build)] + ([] if component == 'lxqt' else [component]) + [str(target)]
        subprocess.run(args, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Extracted portable runtime bundle')
    parser.add_argument('--destdir', type=Path, required=True)
    parser.add_argument('--component', choices=COMPONENTS, action='append', required=True)
    parser.add_argument('--libdir', default='/usr/lib', help='Final distro library directory, without DESTDIR')
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    dest = args.destdir.absolute()
    if dest == Path('/') or dest.is_symlink():
        parser.error('DESTDIR must be a staging directory, not the host root or a symlink')
    if not args.libdir.startswith('/usr/lib') or '..' in Path(args.libdir).parts:
        parser.error('libdir must be an absolute /usr/lib directory')
    stage(args.source.resolve(), dest, set(args.component), args.libdir, args.version)


if __name__ == '__main__':
    main()
