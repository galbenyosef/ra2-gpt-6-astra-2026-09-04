"""Record exact built-in ImageGen inputs, output fingerprints and current blockers."""
import hashlib,json,pathlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[2]
REF=ROOT/'assets/hd/batch-three/references'
CACHE='.cache/batch-three/'
OUTPUT='/Users/zzn/.codex/generated_images/01a0c934-e4cf-7da2-bc73-3bae5ab78203/'
specs={
 'tree01':('exec-4f0203b2-f81d-48f2-aa41-9666b15474fc.png',['source/tree01.png']),
 'gi-v1':('exec-c9b51b62-12a7-4222-803a-805d0262067e.png',['source/gi-composite.png','source/gi-evidence.png']),
 'nahand':('exec-518549e6-09c9-4469-9f69-d85cf7927a95.png',['source/nahand.png']),
 'gtnk-v1':('exec-6a2a526c-0df7-4f65-88b2-95cc0c659578.png',['source/gtnk.png','inspection/original-gtnk-threequarter.png','inspection/original-gtnk-top.png','inspection/original-gtnk-left.png']),
 'dred-v1':('exec-3473a28a-98f6-4630-866a-dd0fd7012e7f.png',['source/dred.png','inspection/original-dred-threequarter.png','inspection/original-dred-top.png','inspection/original-dred-left.png']),
 'gtnk':('exec-c46302a9-29e4-41fb-a9d3-06716112518b.png',['ref:gtnk-v1.png']),
 'dred':('exec-902edb32-31bd-4fe9-9d50-067b055d6c80.png',['ref:dred-v1.png']),
 'gi':('exec-cddbc114-8ab3-4d59-a2a1-eebbc338f885.png',['ref:gi-v1.png','source/gi.png']),
 'curved-road':('exec-c0ab1534-c535-4d06-80d0-3cb948fc03fb.png',['source/road-177-top.png'])
}
def fingerprint(path):
    data=path.read_bytes()
    im=Image.open(path)
    return {'path':str(path.relative_to(ROOT)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'size':im.size,'mode':im.mode}
records=[]
for ident,(output,inputs) in specs.items():
    records.append({'asset':ident,'tool':'built-in image_gen','toolOutputPath':OUTPUT+output,'output':fingerprint(REF/(ident+'.png')),'inputs':[fingerprint(REF/p[4:] if p.startswith('ref:') else ROOT/CACHE/p) for p in inputs],'promptKey':ident,'promptFile':'assets/hd/batch-three/references/prompts.json','status':'rejected draft' if ident.endswith('-v1') else 'selected candidate','unknown':['seed','API quality setting','model version']})
(REF/'generation-record.json').write_text(json.dumps({'records':records,'meshyStatus':'No task submitted; explicit user upload authorization pending after automatic approval review rejected the attempt.'},indent=2)+'\n')
print('Recorded nine image outputs and the exact source/edit input fingerprints.')
