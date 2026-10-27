#!/usr/bin/env bash
# Disposable build containers only. /out contains prepare-distribution.py output.
set -euo pipefail
mkdir -p /out/packages
cp -a /out/prepared /tmp/prepared
root=$(find /tmp/prepared/source -mindepth 1 -maxdepth 1 -type d)
case "${DISTRO:?Select fedora, ubuntu or arch}" in
    fedora)
        dnf install -y --setopt=install_weak_deps=False rpm-build python3 glib2 gcc gcc-c++ cmake make \
            gtk3-devel json-glib-devel xfce4-panel-devel budgie-desktop-devel libpeas-devel lxqt-panel-devel qt6-qtbase-devel \
            gjs libadwaita librsvg2 python3-gobject xorg-x11-server-Xvfb dbus-daemon
        rpmbuild -ba --define '_topdir /tmp/prepared/rpm' /tmp/prepared/rpm/SPECS/usagestat-bar.spec
        cp /tmp/prepared/rpm/RPMS/x86_64/*.rpm /tmp/prepared/rpm/SRPMS/*.rpm /out/packages/
        dnf install -y --setopt=install_weak_deps=False /tmp/prepared/rpm/RPMS/x86_64/usagestat-bar-0*.rpm
        ;;
    ubuntu)
        export DEBIAN_FRONTEND=noninteractive
        apt-get update
        apt-get install -y --no-install-recommends debhelper build-essential python3 libglib2.0-bin \
            libgtk-3-dev libjson-glib-dev libxfce4panel-2.0-dev budgie-core-dev libpeas-dev \
            gjs gir1.2-gtk-4.0 gir1.2-adw-1 gir1.2-rsvg-2.0 python3-gi dbus-x11 xvfb
        cd /tmp/prepared/deb/usagestat-bar-*
        dpkg-buildpackage -us -uc -b
        dpkg-buildpackage -us -uc -S -d
        cp ../*.deb ../*.dsc ../*.changes ../*.buildinfo ../*.tar.* /out/packages/
        apt-get install -y --no-install-recommends /out/packages/usagestat-bar_*.deb
        ;;
    arch)
        pacman -Syu --noconfirm --needed python glib2 gtk3 json-glib xfce4-panel budgie-desktop libpeas \
            lxqt-panel qt6-base cmake gjs gtk4 libadwaita librsvg python-gobject dbus xorg-server-xvfb
        useradd -m builder
        version=$(python -c 'import json; print(json.load(open("/tmp/prepared/source.json"))["version"])')
        cp /out/source.tar.gz "/tmp/prepared/aur/usagestat-bar-$version.tar.gz"
        chown -R builder:builder /tmp/prepared
        cd /tmp/prepared/aur
        runuser -u builder -- makepkg --noconfirm
        runuser -u builder -- makepkg --printsrcinfo > .SRCINFO
        cp ./*.pkg.tar.zst PKGBUILD .SRCINFO /out/packages/
        pacman -U --noconfirm ./usagestat-bar-0*.pkg.tar.zst
        ;;
esac
bash "$root/tests/linux/installed.sh"
