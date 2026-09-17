"""Extract original identities, animation frames and terrain evidence locally."""
import hashlib, json, math, os, pathlib, re, struct, sys
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = pathlib.Path(os.environ.get('RA2_SOURCE_CACHE', '/Users/zzn/ws/xinbenlv/ra2-gpt-6-astra-2026-09-04/.cache'))
SRC = BASE / 'ra2-assets-rebuild-result'
RAW = BASE / 'ra2-assets-rebuild-test'
OUT = ROOT / '.cache/batch-three/source'
OUT.mkdir(parents=True, exist_ok=True)
os.environ['RA2_ASSET_CACHE'] = str(RAW)
os.environ['RA2_PUBLIC_DIR'] = str(ROOT / '.cache/batch-three/extract')
sys.path.insert(0, str(ROOT / 'scripts/assets'))
from export_assets import find, shp_frames, palette, colorize, ART, RULES

sha = lambda b: hashlib.sha256(b).hexdigest()
manifest = json.loads((SRC / 'assets/manifest.json').read_text())
records = {'sourceRoot': str(SRC), 'configSha256': {name:sha((RAW/'raw'/name).read_bytes()) for name in ['rules.ini','art.ini','temperat.ini']}, 'assets': {}, 'rawEntries': {}}
for ident, rule, frame in [('gi','E1',5), ('gtnk','MTNK',24), ('dred','DRED',24), ('nahand','NAHAND',0)]:
    entry = manifest['sprites'][ident]
    path = SRC / entry['src'].lstrip('/')
    atlas = Image.open(path)
    w, h, cols = entry['frameWidth'], entry['frameHeight'], entry['columns']
    def crop(i):
        return atlas.crop((i % cols*w, i//cols*h, i % cols*w+w, i//cols*h+h))
    crop(frame).save(OUT / f'{ident}.png')
    if ident == 'gi':
        crop(frame).save(OUT / 'gi-composite.png')
        colorize(shp_frames(find('gi.shp'))[frame],palette('unittem')).save(OUT / 'gi.png')
    records['assets'][ident] = {'rulesId': rule, 'rules': RULES[rule.lower()], 'art': ART[ident], 'sprite': entry, 'referenceFrame': frame, 'atlasSha256': sha(path.read_bytes())}
    if ident == 'gi':
        for action, spec in entry['sequences'].items():
            start, count, stride = spec[:3]
            if count == 0: continue
            dirs = [0,2,4,6] if stride else [0]
            board = Image.new('RGBA', (count*w, len(dirs)*h))
            for row, facing in enumerate(dirs):
                for i in range(count): board.paste(crop(start+facing*stride+i), (i*w,row*h))
            board.save(OUT / f'gi-{action}.png')
        board=Image.new('RGBA',(8*w,3*h))
        for row,start in enumerate([0,164,292]):
            for facing in range(8):
                board.paste(crop(start+facing*(6 if start==164 else 1)),(facing*w,row*h))
        board.resize((w*24,h*9),Image.Resampling.NEAREST).save(OUT/'gi-evidence.png')

scenery = json.loads((SRC / 'assets/scenery/manifest-scenery.json').read_text())
board = Image.new('RGB',(800,360),(42,42,42))
draw = ImageDraw.Draw(board)
for j, ident in enumerate(['tree01','tree10','tree22','tree26']):
    entry = scenery['temperate:'+ident]
    path = SRC / entry['src'].lstrip('/')
    im = Image.open(path).convert('RGBA')
    im.save(OUT / f'{ident}.png')
    records['assets'][ident] = {'sprite':entry, 'sha256':sha(path.read_bytes()), 'opaqueBounds':im.getbbox()}
    zoom = im.resize((im.width*2,im.height*2), Image.Resampling.NEAREST)
    board.paste(zoom,(j*200+(200-zoom.width)//2,40),zoom)
    draw.text((j*200+20,10),ident,fill='white')
board.save(OUT/'trees-comparison.png')

names = ['gtnk','gtnktur','gtnkbarl','dred','dredwo','dmisl']
files = [n+ext for n in names for ext in ['.vxl','.hva']]
files += ['gi.shp','nghand.shp','nghandmk.shp','nahandmk.shp','nghand_a.shp','nghand_ad.shp','tree01.tem']
for name in files:
    data = find(name)
    rec = {'found': bool(data)}
    records['rawEntries'][name] = rec
    if not data: continue
    (OUT/name).write_bytes(data)
    rec.update(bytes=len(data), sha256=sha(data))
    if ('hand' in name) and name.endswith('.shp'):
        frames = shp_frames(data)
        rec['framesIncludingShadow'] = len(frames)
        count = len(frames)//2
        rec['visibleFrames'] = count
        ids = list(range(count)) if count < 16 else list(range(0,count,max(1,count//16)))
        w,h = frames[0].size
        sheet = Image.new('RGBA',(4*w,math.ceil(len(ids)/4)*h))
        for j,i in enumerate(ids):
            im = colorize(frames[i],palette('unittem'))
            im.save(OUT/f'{name}-{i}.png')
            sheet.paste(im,(j%4*w,j//4*h))
        sheet.save(OUT/f'{name}-contact.png')

tiles = json.loads((SRC/'assets/terrain/manifest-tiles.json').read_text())
terrain = json.loads((SRC/'maps/terrain.json').read_text())['temperate']
sheet = Image.new('RGB',(900,math.ceil(24/5)*150),(42,42,42))
draw = ImageDraw.Draw(sheet)
for row, tile in enumerate(range(176,200)):
    meta=terrain[tile]; data=find(meta['file']); nx,ny,tw,th=struct.unpack_from('<4I',data)
    rec={'tileId':tile,'metadata':meta,'tmpDimensions':[nx,ny,tw,th],'bytes':len(data),'sha256':sha(data)}
    if tile == 177: records['assets']['curved-road']=rec
    im=Image.new('RGBA',((nx+ny)*30,(nx+ny)*15))
    for i in range(nx*ny):
        entry=tiles.get(f'temperate:{tile}:{i}')
        if not entry: continue
        atlas=Image.open(SRC/entry['src'].lstrip('/'))
        sub=atlas.crop((entry['x'],entry['y'],entry['x']+entry['width'],entry['y']+entry['height']))
        x,y=i%nx,i//nx
        im.alpha_composite(sub,((ny-1+x-y)*30,(x+y)*15))
    im.save(OUT/f'road-{tile}.png')
    if tile == 177:
        im.convert('RGB').transform((512,512),Image.Transform.AFFINE,(60/512,-60/512,60,30/512,30/512,0),Image.Resampling.BICUBIC).save(OUT/'road-177-top.png')
    scale=min(165/im.width,115/im.height)
    small=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
    x,y=(row%5)*180,(row//5)*150
    sheet.paste(small,(x,y+25),small);draw.text((x+5,y+5),f'{tile} {meta["file"]}',fill='white')
sheet.save(OUT/'road-candidates.png')
(ROOT/'assets/hd/batch-three/source-record.json').write_text(json.dumps(records,indent=2)+'\n')
print('Extracted GI sequences, vehicle identities, barracks frames, four trees and 24 bendy road TMPs.')
