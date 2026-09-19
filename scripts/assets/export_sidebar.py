"""Convert original faction sidebar chrome and cursor SHP animations."""
import json, io
from PIL import Image
from pathlib import Path
import export_assets as e

def main():
 e.manifest=json.loads((e.OUT/'manifest.json').read_text())
 for side in ['sidec01','sidec02']:
  pal=bytes(v*4 for v in e.M[side].get('sidebar.pal'))
  required=json.loads(Path(__file__).with_name('sidebar-assets.json').read_text())
  for name,frames in required.items():
   # Prefer the selected faction; some distributions place extra frames in CD MIX.
   source,b=next(((key,e.M[key].get(name+'.shp')) for key in [side+'cd',side] if key in e.M and e.M[key].get(name+'.shp')), (None,None))
   if not b:raise RuntimeError(f'Missing required sidebar asset: {side}/{name}.shp')
   entry=e.export(side+'-'+name,b,pal,kind='ui',maxframes=frames,shadow=False,anchor=(0,0))
   if entry['frames']!=frames:raise RuntimeError(f'Incomplete sidebar frames: {side}/{name}')
   entry['originalFile']=name+'.shp'
   entry['originalArchive']=source+'.mix'
 for name,pal,archive in [('mnscrnl','shell','neutral'),('mnscrns','shell','neutral'),('glsl','gls','local')]:
  b=e.M[archive].get(name+'.shp');pb=e.find(pal+'.pal')
  if b and pb:e.export(name,b,bytes(v*4 for v in pb),kind='ui',shadow=False,anchor=(0,0))
 for name,spec in json.loads(Path(__file__).with_name('menu-assets.json').read_text()).items():
  source,b=next(((key,m.get(spec['file'])) for key,m in e.M.items() if m.get(spec['file'])),(None,None))
  if not b:raise RuntimeError(f'Missing menu asset: {spec["file"]}')
  if spec['file'].endswith('.shp'):
   entry=e.export(name,b,e.palette(spec['palette']),kind='ui',maxframes=spec['frames'],shadow=False,anchor=(0,0))
  else:
   im=Image.open(io.BytesIO(b)).convert('RGB');im.save(e.OUT/'ui'/f'{name}.png')
   entry={'src':f'/assets/ui/{name}.png','width':im.width,'height':im.height,'frameWidth':im.width,'frameHeight':im.height,'frames':1,'columns':1,'anchorX':0,'anchorY':0}
   e.manifest['ui'][name]=entry
  if entry['frames']!=spec['frames']:raise RuntimeError(f'Incomplete menu frames: {name}')
  entry.update(originalFile=spec['file'],originalArchive=source+'.mix')
 # Cursor .sha has the same TS SHP frame layout.
 b=e.find('mouse.sha');pal=e.find('mousepal.pal')
 if b and pal:e.export('mouse',b,bytes(v*4 for v in pal),kind='ui',maxframes=512,shadow=False,anchor=(0,0))
 e.manifest['source']['sha256']='5388c54d7d7b73060083563ff1926bca0d2663a76678b807e23e9a8d491441ce'
 e.manifest['source']['formatReferences']=['https://moddingwiki.shikadi.net/wiki/Westwood_SHP_Format_(TS)','https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Mods.Cnc/FileSystem/MixFile.cs','https://github.com/sh4faq/Red-Alert-2--Modding-Guide/blob/master/01-VXL-HVA-Format.md','https://ppmforums.com/topic-46489/audioidxbag-format/']
 (e.OUT/'manifest.json').write_text(json.dumps(e.manifest,indent=2));print('ui',len(e.manifest['ui']))
if __name__=='__main__':main()
