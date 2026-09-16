"""Identify Tanya's fused pistol triangles and torso remap region in the source rig.
Uses the source texture to retain flesh at the grip; never edits the source master.
"""
import io,json,struct,sys
from PIL import Image
b=open(sys.argv[1],'rb').read();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
def values(idx):
 a=g['accessors'][idx];v=g['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];kind={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']];fmt='<'+kind*size;stride=v.get('byteStride',struct.calcsize(fmt));off=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from(fmt,binary,off+i*stride) for i in range(a['count'])]
p=g['meshes'][0]['primitives'][0];pos=values(p['attributes']['POSITION']);uv=values(p['attributes']['TEXCOORD_0']);weights=values(p['attributes']['WEIGHTS_0']);joints=values(p['attributes']['JOINTS_0']);indices=[v[0] for v in values(p['indices'])]
v=g['bufferViews'][g['images'][0]['bufferView']];im=Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB')
def color(u,v):return im.getpixel((max(0,min(im.width-1,int(u*im.width))),max(0,min(im.height-1,int(v*im.height)))))
weapons=[]
for face in range(len(indices)//3):
 ids=indices[face*3:face*3+3];x,y,z=[sum(pos[i][k] for i in ids)/3 for k in range(3)];u,v=[sum(uv[i][k] for i in ids)/3 for k in range(2)]
 # Black metal at the hanging hands, below the wrist; exclude skin-coloured grip faces.
 if .57<y<.855 and abs(x)>.245 and max(color(u,v))<100:weapons.append(face)
bone_names=[g['nodes'][i]['name'] for i in g['skins'][0]['joints']]
remap=[]
for i,(x,y,z) in enumerate(pos):
 torso=sum(w for j,w in zip(joints[i],weights[i]) if bone_names[j] in ['Spine','Spine01','Spine02'])
 remap.append(1 if 1.00<y<1.405 and abs(x)<.245 and torso>.10 else 0)
print(json.dumps({'weaponFaces':weapons,'teamMask':remap,'method':'source-rest coordinates and texture; pistol threshold max RGB < 100; torso skin weights > 0.10'}))
