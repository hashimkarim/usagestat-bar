#!/usr/bin/env bash
set -euo pipefail

uuid="usagestat-bar@hashimkarim"
source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${1:-$source_dir/${uuid}.shell-extension.zip}"
if [[ "$out" != /* ]]; then
    out="$PWD/$out"
fi
stage_dir="$(mktemp -d -t usagestat-package.XXXXXX)"
trap 'rm -rf -- "$stage_dir"' EXIT

for app_file in extension.js prefs.js preferences.js providerMetadata.js providerCatalog.js iconUpdateData.js providerIconUpdates.js customIcons.js cli.js config.js stylesheet.css metadata.json schemas assets LICENSE; do
    cp -a "$source_dir/$app_file" "$stage_dir/"
done
glib-compile-schemas --strict "$stage_dir/schemas/"

mkdir -p "$(dirname "$out")"
rm -f "$out"
cd "$stage_dir"
zip -qr "$stage_dir/full.zip" \
    extension.js \
    prefs.js \
    preferences.js \
    providerMetadata.js \
    providerCatalog.js \
    iconUpdateData.js \
    providerIconUpdates.js \
    customIcons.js \
    cli.js \
    config.js \
    stylesheet.css \
    metadata.json \
    schemas/ \
    assets/ \
    LICENSE \
    -x "schemas/.fuse_hidden*" "schemas/gschemas.compiled"

python3 "$source_dir/scripts/prepare-gnome-store.py" --archive "$stage_dir/full.zip" \
    --sha256 "$(sha256sum "$stage_dir/full.zip" | cut -d ' ' -f 1)" --output "$out" >/dev/null

echo "Built: $out"
