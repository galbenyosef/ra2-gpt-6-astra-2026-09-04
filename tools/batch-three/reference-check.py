"""Uniformly downsample exact candidates to native opaque bounds, preserving aspect."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,sys
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.cache/batch-three/reference-check';OUT.mkdir(parents=True,exist_ok=True)
ids=sys.argv[1:] or ['tree01','gi','nahand','gtnk','dred']
board=Image.new('RGB',(1000,len(ids)*260),(42,42,42));draw=ImageDraw.Draw(board)
for row,ident in enumerate(ids):
    source=Image.open(ROOT/'.cache/batch-three/source'/f'{ident}.png').convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a:255 if a>200 else 0))
    sb=source.getbbox();source=source.crop(sb)
    path=ROOT/'assets/hd/batch-three/references'/f'{ident}.png'
    ref=Image.open(path).convert('RGB')
    # Neutral charcoal is framing only; do not alter the submitted image.
    mask=Image.new('L',ref.size)
    mask.putdata([255 if max(rgb)>82 or max(rgb)-min(rgb)>26 else 0 for rgb in ref.getdata()])
    rb=mask.getbbox();ref=ref.crop(rb)
    ratio=source.height/ref.height
    small=ref.resize((round(ref.width*ratio),source.height),Image.Resampling.LANCZOS)
    small.save(OUT/f'{ident}-downsample.png')
    source.save(OUT/f'{ident}-original.png')
    zoom=min(6,220/source.height)
    for col,im in enumerate([source,small]):
        im=im.resize((round(im.width*zoom),round(im.height*zoom)),Image.Resampling.NEAREST)
        board.paste(im,(20+col*490,row*260+30),im if im.mode=='RGBA' else None)
    draw.text((20,row*260+5),f'{ident}: original | HD uniformly downsampled, same height and ground baseline',fill='white')
    rec={'asset':ident,'status':'pending','referenceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'originalOpaqueBounds':sb,'referenceBounds':rb,'originalSize':source.size,'downsampleSize':small.size,'widthRatio':small.width/source.width,'comparison':str((OUT/'comparison.png').relative_to(ROOT)),'alignment':'same facing, uniform height match, opaque ground baseline; no aspect distortion','limitations':'charcoal threshold gives approximate reference bounds; no automatic fidelity claim'}
    (OUT/f'{ident}.json').write_text(json.dumps(rec,indent=2)+'\n')
board.save(OUT/'comparison.png')
print('Saved native-size images and enlarged review board for '+', '.join(ids))
