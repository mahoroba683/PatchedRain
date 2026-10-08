#!/usr/bin/env python3
"""Restore Discord's bundled intl cache after IPA repackaging, before signing."""
import os
from pathlib import Path
import shutil
import sys
import tempfile
import zipfile

def app_prefix(archive):
    infos=[n for n in archive.namelist() if n.startswith('Payload/') and n.count('/')==2 and n.endswith('/Info.plist')]
    if len(infos)!=1:
        raise ValueError('Cannot identify main application')
    return infos[0][:-len('Info.plist')]

def restore(source, output):
    source, output=Path(source),Path(output)
    if source.resolve()==output.resolve():
        raise ValueError('Source and output IPA must differ')
    temporary=None
    try:
        with zipfile.ZipFile(source) as original, zipfile.ZipFile(output) as built:
            original_prefix, output_prefix=app_prefix(original),app_prefix(built)
            cache_prefix=original_prefix+'assets/.cache/intl/'
            entries=[i for i in original.infolist() if i.filename.startswith(cache_prefix)]
            messages=[i for i in entries if '/aW50bA==/' in i.filename and '.messages.' in i.filename and not i.is_dir()]
            if not messages:
                raise ValueError('Original IPA lacks intl messages; use a complete Discord IPA')
            target_names={output_prefix+i.filename[len(original_prefix):] for i in entries}
            fd,temporary=tempfile.mkstemp(prefix='rain-intl-',suffix='.ipa',dir=output.parent)
            os.close(fd)
            with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED) as repaired:
                repaired.comment=built.comment
                for entry in built.infolist():
                    if entry.filename in target_names:
                        continue
                    with built.open(entry) as src, repaired.open(entry,'w') as dst:
                        shutil.copyfileobj(src,dst)
                for entry in entries:
                    # Copy metadata before changing the output app's directory name.
                    import copy
                    target=copy.copy(entry)
                    target.filename=output_prefix+entry.filename[len(original_prefix):]
                    with original.open(entry) as src,repaired.open(target,'w') as dst:
                        shutil.copyfileobj(src,dst)
            with zipfile.ZipFile(temporary) as checked:
                for entry in messages:
                    name=output_prefix+entry.filename[len(original_prefix):]
                    if checked.read(name)!=original.read(entry):
                        raise ValueError('Intl asset verification failed')
        os.replace(temporary,output)
        temporary=None
        print(f'Restored {len(entries)} intl cache entries; all bundled base-locale messages verified')
    finally:
        if temporary and os.path.exists(temporary):os.unlink(temporary)

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: restore-intl-assets.py ORIGINAL.ipa BUILT.ipa')
    try:restore(*sys.argv[1:])
    except Exception as error:raise SystemExit(f'Intl asset restore failed: {error}')
