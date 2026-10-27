#!/usr/bin/env bash
set -euo pipefail
directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:?Choose waybar, xfce or budgie}"
output="${2:?Output shared library path required}"
packages=(gtk+-3.0 json-glib-1.0 gmodule-2.0)
case "$target" in
    waybar) source_file="$directory/../waybar/module.c" ;;
    xfce) source_file="$directory/../xfce/plugin.c"; packages+=(libxfce4panel-2.0) ;;
    budgie)
        source_file="$directory/../budgie/plugin.c"
        peas=libpeas-2
        if ! pkg-config --exists "$peas"; then peas=libpeas-1.0; fi
        budgie=budgie-3.0
        if ! pkg-config --exists "$budgie"; then budgie=budgie-1.0; fi
        packages+=("$budgie" "$peas") ;;
    *) echo 'Choose waybar, xfce or budgie' >&2; exit 2 ;;
esac
mkdir -p "$(dirname "$output")"
package_flags="$(pkg-config --cflags --libs "${packages[@]}")"
read -r -a flags <<< "$package_flags"
read -r -a compile_flags <<< "${CFLAGS:--O2} ${CPPFLAGS:-}"
read -r -a link_flags <<< "${LDFLAGS:-}"
"${CC:-cc}" -shared -fPIC "${compile_flags[@]}" -Wall -Wextra -Wno-unused-parameter -Werror \
    "$directory/widget.c" "$source_file" "${flags[@]}" "${link_flags[@]}" -o "$output"
