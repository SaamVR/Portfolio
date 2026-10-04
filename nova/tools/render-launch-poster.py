import os,json,numpy as np
from PIL import Image,ImageFilter
from pathlib import Path
assets=Path(__file__).resolve().parents[1]/'site/assets'
meshes=json.load(open('/tmp/nova-poster-geometry.json'));W=H=1200
canvas=np.zeros((H,W,4),dtype=np.uint8);depth=np.ones((H,W),dtype=np.float32)*np.inf
light=np.array([-.45,.7,1.0]);light/=np.linalg.norm(light)
for m in meshes:
 v=np.array(m['vertices']);uv=np.array(m['uvs']);norm=np.array(m['normals']);idx=np.array(m['indices']).reshape(-1,3)
 tex=np.array(Image.open(assets/m['texture']).convert('RGB')) if m.get('texture') else np.ones((1,1,3),dtype=np.uint8)*110
 th,tw=tex.shape[:2]
 for ids in idx:
  tri=v[ids]; x0=max(0,int(np.floor(tri[:,0].min())));x1=min(W-1,int(np.ceil(tri[:,0].max())));y0=max(0,int(np.floor(tri[:,1].min())));y1=min(H-1,int(np.ceil(tri[:,1].max())))
  if x1<x0 or y1<y0:continue
  (ax,ay,_),(bx,by,_),(cx,cy,_)=tri;den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
  if abs(den)<1e-5:continue
  xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
  a=((by-cy)*(xx-cx)+(cx-bx)*(yy-cy))/den;b=((cy-ay)*(xx-cx)+(ax-cx)*(yy-cy))/den;c=1-a-b
  z=a*tri[0,2]+b*tri[1,2]+c*tri[2,2];mask=(a>=0)&(b>=0)&(c>=0)&(z<depth[y0:y1+1,x0:x1+1])
  if not mask.any():continue
  tu=a*uv[ids[0],0]+b*uv[ids[1],0]+c*uv[ids[2],0];tv=a*uv[ids[0],1]+b*uv[ids[1],1]+c*uv[ids[2],1]
  pixels=tex[np.clip(((1-tv)*th).astype(int),0,th-1),np.clip((tu*tw).astype(int),0,tw-1)].astype(float)
  normals=a[...,None]*norm[ids[0]]+b[...,None]*norm[ids[1]]+c[...,None]*norm[ids[2]]
  normals/=np.maximum(np.linalg.norm(normals,axis=-1,keepdims=True),.001)
  diffuse=np.clip((normals*light).sum(-1),0,1)
  spec=np.clip(normals[...,2],0,1)**22
  pixels=np.clip(pixels*(.56+.60*diffuse[...,None])+spec[...,None]*18,0,255).astype(np.uint8)
  patch=canvas[y0:y1+1,x0:x1+1];patch[mask,:3]=pixels[mask];patch[mask,3]=255;depth[y0:y1+1,x0:x1+1][mask]=z[mask]
img=Image.fromarray(canvas);box=img.getbbox();img=img.crop((max(0,box[0]-35),max(0,box[1]-35),min(W,box[2]+35),min(H,box[3]+35)))
img.thumbnail((1050,1050),getattr(Image,'Resampling',Image).LANCZOS);out=Image.new('RGBA',(1200,1200));out.alpha_composite(img,((1200-img.width)//2,(1200-img.height)//2))
out.save(assets/os.environ.get('NOVA_POSTER_OUTPUT','product-poster.webp'),lossless=True)
preview=Image.new('RGBA',out.size,(238,232,220,255));preview.alpha_composite(out);preview.convert('RGB').save('/tmp/nova-poster-preview.jpg')
print('Poster:',box,'bytes:',(assets/os.environ.get('NOVA_POSTER_OUTPUT','product-poster.webp')).stat().st_size)
