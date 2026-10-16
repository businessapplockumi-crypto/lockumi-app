# Copia literal del arte de la portada de la landing (markup + CSS) al app.
import re, json
L = open('/workspace/lockumi/landing/index.html').read().split('\n')
ini = next(i for i, l in enumerate(L) if 'class="hero-halo"' in l)
fin = next(i for i, l in enumerate(L) if 'chip-glass--3' in l)
inner = '\n'.join(L[ini:fin + 1])
css = re.sub(r'/\*.*?\*/', '', open('/workspace/lockumi/landing/css/styles.css').read(), flags=re.S)
def blocks(s):
    out = []; i = 0
    while True:
        j = s.find('{', i)
        if j < 0: break
        pre = s[i:j].strip(); d = 1; k = j + 1
        while d:
            d += {'{': 1, '}': -1}.get(s[k], 0); k += 1
        out.append((pre, s[j + 1:k - 1])); i = k
    return out
clases = {'portada__arte'} | {c for v in re.findall(r'class="([^"]+)"', inner) for c in v.split()}
print('clases del markup:', sorted(clases))
PAT = re.compile(r'\.(' + '|'.join(map(re.escape, sorted(clases, key=len, reverse=True))) + r')(?![\w-])')
anims = set()
def take(sel, body):
    if not PAT.search(sel): return None
    for m in re.finditer(r'animation(?:-name)?\s*:\s*([^;}]+)', body):
        for part in m.group(1).split(','):
            w = part.replace('!important', ' ').split()
            if w and w[0] != 'none': anims.add(w[0])
    return f'{sel}{{{body.strip()}}}'
kf = {}; res = []
for sel, body in blocks(css):
    if sel.startswith('@keyframes'):
        kf[sel.split()[1]] = f'{sel}{{{body.strip()}}}'; res.append(('kf', sel.split()[1]))
    elif sel.startswith('@'):
        r = [x for x in (take(s, b) for s, b in blocks(body)) if x]
        if r: res.append(('r', sel + '{\n  ' + '\n  '.join(r) + '\n}'))
    else:
        t = take(sel, body)
        if t: res.append(('r', t))
out = [v if k == 'r' else kf[v] for k, v in res if k == 'r' or v in anims]
print('animaciones:', sorted(anims), 'faltan:', [a for a in anims if a not in kf])
hdr = ('/* COPIA LITERAL de landing/css/styles.css (main b87873e): reglas que usan cualquier clase del arte\n'
       '   de la portada (.portada__arte y todas las clases de su markup) en el mismo orden, con sus @media y @keyframes.\n'
       '   Comentarios quitados. Regenerar con: python3 scripts/copiar-logo.py */\n')
open('src/logo-landing.css', 'w').write(hdr + '\n'.join(out) + '\n')
open('src/logoLandingMarkup.ts', 'w').write('// COPIA LITERAL del markup dentro de .portada__arte (landing/index.html, main b87873e). Regenerar con scripts/copiar-logo.py\nexport const LOGO_LANDING_HTML = ' + json.dumps(inner) + '\n')
