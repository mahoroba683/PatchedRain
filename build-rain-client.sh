#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
stamp=$(find RainClient/src RainClient/scripts RainClient/shims RainClient/package.json -type f -exec shasum -a 256 {} + | LC_ALL=C sort | shasum -a 256 | awk '{print $1}')
if [ -s Resources/rain-client.js ] && [ -f Resources/rain-client.sha256 ] && [ "$(cat Resources/rain-client.sha256)" = "$stamp" ]; then
    exit 0
fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
    echo '[-] Node.js 22+ and npm are required to build the patched Rain client.' >&2
    exit 1
fi
echo '[*] Building patched Rain client (v58, UI base v34)...'
(
    cd RainClient
    if [ ! -f node_modules/.rain-build-ready ]; then
        npm install --legacy-peer-deps --no-audit --no-fund
        touch node_modules/.rain-build-ready
    fi
    node scripts/build.mjs --release-branch main --build-minify
)
mkdir -p Resources
cp RainClient/dist/rain.min.js Resources/rain-client.js
printf '%s\n' "$stamp" > Resources/rain-client.sha256
