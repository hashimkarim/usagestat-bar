#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Update this URL and digest together after reviewing a new library release.
python3 "$root/assets/provider-icons/scripts/vendor.py" \
  https://github.com/agenticdriver/provider-icons/releases/download/v0.1.0-alpha.1/agenticdriver-provider-icons-0.1.0-alpha.1.tgz \
  --sha256 a98be910723f37595ba4755bc5d0a3fa00b7fa9436ae3fee5a55a305b4f2639a \
  --target "$root/assets/provider-icons"
