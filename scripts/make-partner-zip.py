"""Package site/ as a static zip that API site owners can host and rebrand via config.json.

Usage:
    python scripts/make-partner-zip.py [--out DIR]

Writes <DIR>/omnicreator-site-<version>.zip (default DIR: ./dist). The zip contains a single
top-level folder omnicreator-site-<version>/ with the site files and PARTNER_README.md.
Before zipping, config-fallback.js is regenerated from config.json so file:// previews match.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')

# Development-only files that partners do not need.
EXCLUDE_FILES = {'SCREENSHOTS_TODO.md', '.DS_Store', 'Thumbs.db'}
EXCLUDE_EXT = {'.map', '.psd', '.tmp', '.log'}


def included(rel):
    name = os.path.basename(rel)
    if name in EXCLUDE_FILES or name.startswith('.'):
        return False
    return os.path.splitext(name)[1].lower() not in EXCLUDE_EXT


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'dist'))
    a = ap.parse_args()

    with open(os.path.join(SITE, 'config.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    version = cfg['release']['version']

    sync = subprocess.run(['node', os.path.join(ROOT, 'scripts', 'check-site.mjs'), '--sync'], cwd=ROOT)
    if sync.returncode != 0:
        sys.exit('could not regenerate config-fallback.js (is Node.js installed?)')

    top = f'omnicreator-site-{version}'
    os.makedirs(a.out, exist_ok=True)
    out = os.path.join(os.path.abspath(a.out), f'{top}.zip')
    files = []
    for dirpath, dirnames, filenames in os.walk(SITE):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith('.'))
        for n in sorted(filenames):
            full = os.path.join(dirpath, n)
            rel = os.path.relpath(full, SITE).replace(os.sep, '/')
            if included(rel):
                files.append((full, rel))

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for full, rel in files:
            z.write(full, f'{top}/{rel}')

    digest = hashlib.sha256(open(out, 'rb').read()).hexdigest()
    print(f'{out}\n  {len(files)} files, {os.path.getsize(out):,} bytes\n  sha256 {digest}')
    for _, rel in files:
        print(f'  {rel}')


if __name__ == '__main__':
    main()
