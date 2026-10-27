%global upstream_version 0.1.0-rc.1
Name:           usagestat-bar
Version:        0.1.0~rc.1
Release:        1%{?dist}
Summary:        Desktop panel frontends for UsageStat
License:        MIT
URL:            https://github.com/hashimkarim/usagestat-bar
Source0:        %{name}-%{upstream_version}.tar.gz
BuildRequires:  python3 glib2 gcc gcc-c++ cmake make
BuildRequires:  pkgconfig(gtk+-3.0) pkgconfig(json-glib-1.0) pkgconfig(gmodule-2.0)
BuildRequires:  pkgconfig(libxfce4panel-2.0) pkgconfig(budgie-3.0) libpeas-devel
BuildRequires:  lxqt-panel-devel qt6-qtbase-devel
Requires:       gjs gtk4 >= 4.12
Requires:       libadwaita >= 1.4
Requires:       libsoup3 python3 python3-gobject librsvg2 dbus-daemon bash
Recommends:     usagestat
Recommends:     gtk4-layer-shell
ExclusiveArch:  x86_64

%description
Shared UsageStat service and preferences. Install a panel adapter separately.
The independent usagestat CLI is needed to obtain provider usage data.

%package plasma
Summary:        UsageStat widget for Plasma 6.4 and later
Requires:       %{name} = %{version}-%{release}
Requires:       plasma-workspace >= 6.4
%description plasma
Native Plasma widget communicating with the shared UsageStat service.

%package cinnamon
Summary:        UsageStat applet for Cinnamon
Requires:       %{name} = %{version}-%{release}
Requires:       cinnamon
%description cinnamon
Native Cinnamon applet communicating with the shared UsageStat service.

%package mate
Summary:        UsageStat applet for MATE
Requires:       %{name} = %{version}-%{release}
Requires:       mate-panel python3-gobject python3-cairo
%description mate
Out-of-process MATE panel applet with session D-Bus activation.

%package xfce
Summary:        UsageStat plugin for Xfce
Requires:       %{name} = %{version}-%{release}
Requires:       xfce4-panel
%description xfce
Native Xfce panel plugin built against this distribution's panel libraries.

%package budgie
Summary:        UsageStat plugin for Budgie
Requires:       %{name} = %{version}-%{release}
Requires:       budgie-desktop
%description budgie
Native Budgie panel plugin built against this distribution's panel libraries.

%package lxqt
Summary:        UsageStat plugin for LXQt
Requires:       %{name} = %{version}-%{release}
Requires:       lxqt-panel
%description lxqt
Native Qt 6 LXQt panel plugin built against this distribution's panel libraries.

%package waybar
Summary:        UsageStat native module for Waybar
Requires:       %{name} = %{version}-%{release}
Requires:       waybar gtk4-layer-shell
%description waybar
Native Waybar CFFI module. Include the supplied waybar.jsonc configuration and
add cffi/usagestat to the panel module list. Stock Hyprland acceptance is pending.

%prep
%autosetup -n %{name}-%{upstream_version}

%build
python3 platforms/linux/package.py stage build/runtime

%install
python3 packaging/stage.py --source build/runtime --destdir %{buildroot} \
  --version %{upstream_version} --libdir %{_libdir} \
  --component runtime --component plasma --component cinnamon --component mate \
  --component xfce --component budgie --component lxqt --component waybar

%files
%license LICENSE
%{_bindir}/usagestat-bar
%dir %{_datadir}/usagestat-bar
%{_datadir}/usagestat-bar/*.js
%{_datadir}/usagestat-bar/assets
%dir %{_datadir}/usagestat-bar/platforms
%{_datadir}/usagestat-bar/platforms/linux
%{_datadir}/usagestat-bar/platforms/polybar
%{_datadir}/applications/io.github.HashimK.UsageStatBar.desktop
%{_datadir}/dbus-1/services/io.github.HashimK.UsageStatBar.service

%files plasma
%{_datadir}/plasma/plasmoids/io.github.HashimK.usagestat
%files cinnamon
%{_datadir}/cinnamon/applets/usagestat-bar@hashimkarim
%files mate
%{_datadir}/usagestat-bar/platforms/mate
%{_datadir}/mate-panel/applets/io.github.HashimK.UsageStat.mate-panel-applet
%{_datadir}/dbus-1/services/org.mate.panel.applet.UsageStatAppletFactory.service
%files xfce
%{_libdir}/xfce4/panel/plugins/libusagestat.so
%{_datadir}/xfce4/panel/plugins/usagestat.desktop
%files budgie
%{_libdir}/budgie-desktop/plugins/usagestat
%files lxqt
%{_libdir}/lxqt-panel/libusagestat.so
%{_datadir}/lxqt/lxqt-panel/usagestat.desktop
%files waybar
%{_libdir}/usagestat-bar
%{_datadir}/usagestat-bar/platforms/waybar
