# Prépare les images de l'application à partir du logo original (tools/logoNoir.png, petit PNG noir sur fond transparent).
# Usage : python3 tools/preparer_images.py
# Le logo est agrandi avec des bords lissés, décliné en noir et en blanc (mode sombre), et sert d'icône carrée à l'app.
import os
from PIL import Image,ImageFilter
import numpy as np
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); IMG=os.path.join(ROOT,'img')
src=Image.open(os.path.join(ROOT,'tools','logoNoir.png')).convert('RGBA')

def agrandir(alpha,f):
    # Agrandit le masque puis resserre le contour : des bords nets au lieu d'un flou d'agrandissement.
    a=alpha.resize((alpha.width*f,alpha.height*f),Image.BICUBIC)
    x=np.array(a).astype(float)/255; x=np.clip((x-0.5)*2.2+0.5,0,1); x=x*x*(3-2*x)
    return Image.fromarray((x*255).astype('uint8'))

def colorer(mask,rgb):
    im=Image.new('RGBA',mask.size,rgb+(0,)); im.putalpha(mask); return im

A=agrandir(src.getchannel('A'),6)
colorer(A,(0,0,0)).save(os.path.join(IMG,'logo-noir.png'),optimize=True)
colorer(A,(255,255,255)).save(os.path.join(IMG,'logo-blanc.png'),optimize=True)

# Icône de l'app : le logo complet (texte + tête du boxer), centré sur un carré blanc.
# Marge de 14 % : le logo reste entier même quand Android découpe l'icône en rond (zone sûre « maskable »).
LOGO=A
def icone(taille,marge=0.14,fond=(255,255,255)):
    l=colorer(LOGO,(0,0,0)); l=l.crop(l.getbbox())
    k=taille*(1-2*marge)/max(l.size); l=l.resize((round(l.width*k),round(l.height*k)),Image.LANCZOS)
    c=Image.new('RGBA',(taille,taille),fond+(255,)); c.alpha_composite(l,((taille-l.width)//2,(taille-l.height)//2)); return c
icone(512).save(os.path.join(ROOT,'icon-512.png'),optimize=True)
icone(192).save(os.path.join(ROOT,'icon-192.png'),optimize=True)
icone(180,0.08).convert('RGB').save(os.path.join(ROOT,'apple-touch-icon.png'),optimize=True)
f=icone(64,0.04); f.save(os.path.join(IMG,'favicon.png'),optimize=True)
f.save(os.path.join(ROOT,'favicon.ico'),sizes=[(16,16),(32,32),(48,48),(64,64)])
print('ok')
