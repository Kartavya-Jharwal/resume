"""Build static, correctly named Newsreader faces for editable Word documents."""
import hashlib
import io
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

canon = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
fingerprint = hashlib.sha256(Path(__file__).read_bytes() + json.dumps(canon, sort_keys=True).encode() + Path(canon['fonts']['roman']).read_bytes() + Path(canon['fonts']['italic']).read_bytes()).hexdigest()
cache = out / 'fingerprint.txt'
if cache.exists() and cache.read_text() == fingerprint and (out / 'manifest.json').exists():
    raise SystemExit(0)
faces = []
for kind, family, size in [('text', canon['fonts']['familyText'], canon['scale']['s0Pt']), ('title', canon['fonts']['familyTitle'], canon['scale']['namePt'])]:
    styles = [('Regular', 400, False), ('Bold', 600, False), ('Italic', 400, True), ('BoldItalic', 600, True)] if kind == 'text' else [('Regular', 400, False)]
    for style, weight, italic in styles:
        source = canon['fonts']['italic' if italic else 'roman']
        font = TTFont(source)
        axes = {axis.axisTag: axis.defaultValue for axis in font['fvar'].axes}
        axes.update(wght=weight, opsz=size)
        instantiateVariableFont(font, axes, inplace=True)
        style_name = 'Bold Italic' if style == 'BoldItalic' else style
        for record in font['name'].names:
            value = {1: family, 2: style_name, 3: family + '-' + style, 4: family + ' ' + style_name, 6: family.replace(' ', '') + '-' + style, 16: family, 17: style_name}.get(record.nameID)
            if value:
                record.string = value.encode(record.getEncoding(), errors='replace')
        font['OS/2'].fsSelection &= ~(1 | 32 | 64)
        font['OS/2'].fsSelection |= (1 if italic else 0) | (32 if weight >= 600 else 0) | (64 if weight == 400 and not italic else 0)
        font['head'].macStyle = (1 if weight >= 600 else 0) | (2 if italic else 0)
        path = out / f'{kind}-{style}.ttf'
        font.save(path)
        faces.append({'family': family, 'style': style, 'path': str(path.resolve())})
(out / 'manifest.json').write_text(json.dumps(faces, indent=2), encoding='utf-8')
cache.write_text(fingerprint)
