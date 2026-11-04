# Prépare les images de l'application à partir du logo original (tools/logoNoir.png, petit PNG noir sur fond transparent).
# Usage : python3 tools/preparer_images.py
# Le logo est agrandi avec des bords lissés, décliné en noir et en blanc (mode sombre), et la tête du boxer sert d'icône.
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

# La tête du boxer (à droite du texte).
tete=src.crop((92,0,src.width,src.height)).getchannel('A'); tete=tete.crop(tete.point(lambda v:255 if v>20 else 0).getbbox())
FAUVE=(200,135,58)
def icone(taille,marge,arrondi=True):
    m=agrandir(tete,max(2,round(taille*(1-2*marge)/tete.height)+1))
    k=taille*(1-2*marge)/max(m.size); m=m.resize((round(m.width*k),round(m.height*k)),Image.LANCZOS)
    # Trait épaissi : la tête reste lisible en petit sur l'écran d'accueil.
    e=max(3,taille//64)|1; m=m.filter(ImageFilter.MaxFilter(e)).filter(ImageFilter.GaussianBlur(taille/600))
    fond=Image.new('RGBA',(taille,taille),FAUVE+(255,))
    d=colorer(m,(26,20,16)); fond.alpha_composite(d,((taille-d.width)//2+taille//40,(taille-d.height)//2))
    return fond
icone(512,0.2).save(os.path.join(IMG,'..','icon-512.png'),optimize=True)
icone(192,0.2).save(os.path.join(IMG,'..','icon-192.png'),optimize=True)
icone(180,0.14).convert('RGB').save(os.path.join(IMG,'..','apple-touch-icon.png'),optimize=True)
f=icone(64,0.1); f.save(os.path.join(IMG,'favicon.png'),optimize=True)
f.save(os.path.join(IMG,'..','favicon.ico'),sizes=[(16,16),(32,32),(48,48),(64,64)])
print('ok')
