#!/usr/bin/env python3
"""Downloads 3D illustrations for every picture emoji in scripts/emojis.json.

Source: Microsoft Fluent Emoji (MIT License) – https://github.com/microsoft/fluentui-emoji
Output: public/img/<codepoints>.webp and src/data/image-manifest.json (emoji → file).
Emoji without an illustration keep using the device's emoji font.

Usage:
  pip install emoji pillow
  npm run images:list          # refresh scripts/emojis.json
  python3 scripts/fetch-images.py
"""
import io, json, os, sys, urllib.parse, urllib.request

import emoji as emoji_lib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, 'scripts', 'emojis.json')
OUT_DIR = os.path.join(ROOT, 'public', 'img')
MANIFEST = os.path.join(ROOT, 'src', 'data', 'image-manifest.json')
BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'
SIZE = 160

# Where the Fluent folder name differs from the CLDR name.
OVERRIDES = {
    '🔟': 'Keycap 10',
    '❤️': 'Red heart',
    '🧑‍🍳': 'Cook',
    '🧑‍🚀': 'Astronaut',
    '🧑‍🏫': 'Teacher',
}


def key(e: str) -> str:
    # Must match imageKey() in src/components/Emoji.tsx
    return e.replace('️', '')


def file_name(e: str) -> str:
    return '-'.join(f'{ord(c):x}' for c in key(e)) + '.webp'


def folder_names(e: str):
    if e in OVERRIDES:
        yield OVERRIDES[e]
    name = emoji_lib.demojize(e, delimiters=('', '')).replace('_', ' ')
    if e[0].isdigit():  # keycaps, e.g. "keycap: 1"
        yield 'Keycap ' + e[0]
    name = name.replace(':', '').replace('’', '').replace("'", '').strip().lower()
    yield name[:1].upper() + name[1:]


def candidates(folder: str):
    slug = folder.lower().replace(' ', '_')
    q = urllib.parse.quote
    yield f'{BASE}{q(folder)}/3D/{q(slug)}_3d.png'
    yield f'{BASE}{q(folder)}/Default/3D/{q(slug)}_3d_default.png'


def fetch(url: str):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.read()
    except Exception:
        return None


def main():
    emojis = json.load(open(LIST, encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest, missing, fetched = {}, [], 0
    for e in emojis:
        name = file_name(e)
        path = os.path.join(OUT_DIR, name)
        if not os.path.exists(path):
            data = None
            for folder in folder_names(e):
                for url in candidates(folder):
                    data = fetch(url)
                    if data:
                        break
                if data:
                    break
            if not data:
                missing.append(f'{e} ({list(folder_names(e))[-1]})')
                continue
            img = Image.open(io.BytesIO(data)).convert('RGBA')
            img.thumbnail((SIZE, SIZE), Image.LANCZOS)
            img.save(path, 'WEBP', quality=82, method=6)
            fetched += 1
        manifest[key(e)] = name
    keep = set(manifest.values())
    for f in os.listdir(OUT_DIR):
        if f.endswith('.webp') and f not in keep:
            os.remove(os.path.join(OUT_DIR, f))
    json.dump(dict(sorted(manifest.items())), open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in manifest.values())
    print(f'{len(manifest)}/{len(emojis)} illustrations ({fetched} new, {size / 1e6:.1f} MB)')
    if missing:
        print('No illustration (device emoji is used):', ', '.join(missing), file=sys.stderr)


if __name__ == '__main__':
    main()
