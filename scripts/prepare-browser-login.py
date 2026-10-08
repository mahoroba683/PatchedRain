#!/usr/bin/env python3
"""Configure the inspected Safari handoff and preserve Discord URL schemes."""
import plistlib
import re
import sys
import zipfile
from pathlib import Path

ipa, extension = map(Path, sys.argv[1:3])
content = extension / 'OpenInDiscord Extension/Resources/content.js'
text = content.read_text()
old = "new URL('com.hammerandchisel.discord://login')"
if text.count(old) != 1:
    raise SystemExit('OpenInDiscord browser callback signature changed; refusing to build')
content.write_text(text.replace(old, "new URL('raintweak-login://login')"))
with zipfile.ZipFile(ipa) as archive:
    infos = [n for n in archive.namelist() if n.startswith('Payload/') and n.count('/') == 2 and n.endswith('/Info.plist')]
    if len(infos) != 1:
        raise SystemExit('Cannot identify the main app Info.plist')
    original = plistlib.loads(archive.read(infos[0]))
    bundled_locales = sorted({match.group(1) for name in archive.namelist()
                             if (match := re.search(r'/assets/\.cache/intl/aW50bA==/([A-Za-z0-9-]+)\.messages\.', name))})
patch = plistlib.loads(Path('patch.plist').read_bytes())
schemes = original.get('CFBundleURLTypes', [])
if not any('raintweak-login' in item.get('CFBundleURLSchemes', []) for item in schemes):
    schemes.append({'CFBundleURLName': 'Rain Browser Login', 'CFBundleURLSchemes': ['raintweak-login']})
patch['CFBundleURLTypes'] = schemes
# Discord keeps translations in JS rather than main-bundle lproj directories.
# Declare every locale actually bundled by this IPA, preserving original and
# patch declarations. The base English messages live in the JS bundle.
localizations = list(dict.fromkeys(original.get('CFBundleLocalizations', []) + patch.get('CFBundleLocalizations', []) + ['en'] + bundled_locales))
patch['CFBundleLocalizations'] = localizations
Path('build-patch.plist').write_bytes(plistlib.dumps(patch))
