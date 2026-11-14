"use strict";
/* Galerie photo du club : visible par tous les membres validés ; le comité crée les galeries et y ajoute
   des photos (prises au téléphone) ou des PDF. Les photos sont dans « fichiers » avec galerie:true,
   ce qui les rend lisibles par les membres (voir firestore.rules). Les anciennes galeries du site
   boxerclubvaud.ch peuvent être importées : leurs photos restent sur le site (adresse src). */
const GAL_FIELDS=[{k:"titre",l:"Nom de la galerie",req:true,ph:"Halloween, entretien de la cabane, repas de fin d’année…"},
  {k:"date",l:"Date",t:"date",req:true,half:true},
  {k:"desc",l:"Description",t:"textarea",rows:2},
  {k:"photos",l:"Photos et PDF",t:"files",galerie:true,h:"Prends des photos avec le téléphone ou choisis-en plusieurs d’un coup ; un PDF s’ajoute aussi."}];
// Galeries de l'ancien site (2019, jour exact inconnu : on n'affiche que l'année) : à importer d'un clic par le comité.
const GAL_SITE="https://boxerclubvaud.ch/";
const GAL_ANCIENNES=[
  {titre:"Entretien de la cabane",date:"2019-01-01",desc:"Journée de travail à la cabane : nettoyage, rangement, piquets plantés, câbles et projecteurs réparés, dans la bonne humeur.",
    lien:"galeries/galerie-entretien-de-la-cabane-2019",dir:5,img:["img-1940","img-1969","img-1965","img-1964","img-1962","img-1961","img-1957","img-1955","img-1951","img-1950","img-1947","img-1945","img-1943","img-1971","img-1938","img-1935","img-1929","img-1920","img-1919","img-1917","img-1915","img-1905","img-1903","img-1901","img-1900","img-2005","img-2037","img-2035","img-2032","img-2028","img-2027","img-2026","img-2025","img-2023","img-2020","img-2017","img-2012","img-2009","img-1898","img-2002"]},
  {titre:"Halloween",date:"2019-01-01",lien:"galeries/galerie-halloween-2019",img:[]},
  {titre:"Repas de fin d’année et anniversaire de Rosy et Thérèse, membres depuis 40 ans",date:"2019-01-01",
    lien:"galeries/galerie-repas-de-fin-d-annee-et-anniversaire-40ans-de-membre-rosy-et-therese-2019",dir:2,
    img:["img-20191207-225339","img-20191211-wa0025","img-20191211-wa0024","img-20191211-wa0022","img-20191211-wa0020","img-20191211-wa0019","img-20191211-wa0017","img-20191211-wa0015","img-20191211-wa0010","img-20191211-wa0007","img-20191211-wa0006","img-20191211-wa0004","img-20191211-wa0003","img-20191211-wa0002","img-20191211-wa0001","img-20191207-225340","img-20191207-183021","img-20191207-194058","img-20191207-194055","img-20191207-194028","img-20191207-194022","img-20191207-194019","img-20191207-194017","img-20191207-193959","img-20191207-193947","img-20191207-183105","img-20191207-183101","img-20191207-183055","img-20191207-183033","img-20191207-183030","img-20191207-183026"]},
  {titre:"Joutes",date:"2019-01-01",lien:"galeries/galerie-joute-2019",img:[]},
];
const galDate=x=>x.anneeSeule?String(x.date||"").slice(0,4):fmtDayY(x.date);
const galSrc=(g,n)=>`${GAL_SITE}_multimedias/galeries/${g.dir}/${n}-jpg`;
// Image d'une galerie : photo du site (src) ou photo de l'app (fichier chargé à la demande).
const galImg=(p,cls="")=>p.src?`<img class="${cls}" loading="lazy" alt="" src="${esc(p.src)}" onerror="if(!this.dataset.r){this.dataset.r=1;this.src=this.src.replace(/-jpg$/,'.jpg')}else{this.closest('.gal-it,.gal-cov')?.classList.add('ko');this.style.display='none'}">`
  :/^image\//.test(p.type||"")?`<img class="${cls}" loading="lazy" alt="" data-fid="${esc(p.id)}">`:`<span class="gal-pdf">${ico("file")}<span class="small">${esc(p.nom||"PDF")}</span></span>`;
async function chargerImages(root){
  for(const im of $$("img[data-fid]",root)){if(im.src)continue;
    try{const f=await getFichier(im.dataset.fid);if(f&&f.data)im.src=f.data;else im.closest(".gal-it,.gal-cov")?.classList.add("ko")}catch(e){im.closest(".gal-it,.gal-cov")?.classList.add("ko")}}
}

VIEWS.galerie={t:"Galerie photo",r(){
  const lock=membersOnly("La galerie photo");if(lock)return lock;
  const g=ARG&&get("galeries",ARG);
  if(ARG&&!g)return`<p class="muted">Cette galerie n’existe plus.</p><a class="btn" href="#galerie">${ico("back")} Toutes les galeries</a>`;
  if(g){const ph=g.photos||[];
    return`<div class="row between wrap"><a class="btn sm ghost" href="#galerie">${ico("back")} Toutes les galeries</a>${isComite()?`<div class="row wrap"><button class="btn sm primary" id="galAdd">${ico("camera")} Ajouter des photos</button>${editBtn("data-edgal",g.id)}</div>`:""}</div>
      <h2 class="h">${esc(g.titre)}</h2><p class="small muted">${esc(galDate(g))} · ${ph.length} élément${ph.length>1?"s":""}${g.lien?` · <a target="_blank" rel="noopener" href="${esc(GAL_SITE+g.lien)}">voir sur l’ancien site</a>`:""}</p>
      ${g.desc?`<p>${rich(g.desc)}</p>`:""}
      ${ph.length?`<div class="gal-grid">${ph.map((p,i)=>`<button class="gal-it" data-ph="${i}">${galImg(p)}</button>`).join("")}</div>`:`<p class="muted">Pas encore de photo dans cette galerie.</p>`}`}
  const l=all("galeries").sort((a,b)=>String(b.date).localeCompare(a.date));
  return`<p class="lead">Les photos des cours, sorties et fêtes du club.</p>
    ${isComite()?`<div class="row end wrap">${!l.some(x=>x.lien)?`<button class="btn sm ghost" id="galImport">${ico("download")} Importer les galeries de l’ancien site</button>`:""}${addBtn("galNew","Nouvelle galerie")}</div>`:""}
    ${l.length?`<div class="gal-list">${l.map(x=>{const c=(x.photos||[]).find(p=>p.src||/^image\//.test(p.type||""));
      return`<a class="card gal-card" href="#galerie/${esc(x.id)}"><div class="gal-cov">${c?galImg(c):`<span class="gal-pdf">${ico("camera")}</span>`}</div>
        <b>${esc(x.titre)}</b><span class="small muted">${esc(galDate(x))} · ${(x.photos||[]).length} photo${(x.photos||[]).length>1?"s":""}</span></a>`}).join("")}</div>`
      :`<p class="muted">Aucune galerie pour l’instant.${isComite()?" Crée la première avec « Nouvelle galerie ».":""}</p>`}`;
},bind(m){
  if(!isMember())return;
  chargerImages(m);
  const ed=o=>editSheet(o.id?"Modifier la galerie":"Nouvelle galerie",GAL_FIELDS,o,{wide:true,
    save:async v=>{const n=await put("galeries",{...o,...v,anneeSeule:v.date===o.date&&!!o.anneeSeule,uid:o.uid||ME.uid});if(!o.id)setTimeout(()=>location.hash="#galerie/"+n.id,50)},
    remove:o.id&&(async()=>{closeSheet();await del("galeries",o.id);supprimerFichiers((o.photos||[]).filter(p=>p.id));location.hash="#galerie"})});
  const b=(id,f)=>{const e=$("#"+id,m);if(e)e.onclick=f};
  b("galNew",()=>ed({date:today()}));
  b("galImport",async()=>{for(const a of GAL_ANCIENNES)await put("galeries",{titre:a.titre,date:a.date,anneeSeule:true,desc:a.desc||"",lien:a.lien,photos:a.img.map(n=>({src:galSrc(a,n),nom:n})),uid:ME.uid});toast(GAL_ANCIENNES.length+" galeries importées")});
  $$("[data-edgal]",m).forEach(x=>x.onclick=()=>ed(get("galeries",x.dataset.edgal)));
  const g=ARG&&get("galeries",ARG);if(!g)return;
  // Ajout rapide : on choisit les photos, elles s'ajoutent directement à la galerie.
  b("galAdd",()=>{const inp=document.createElement("input");inp.type="file";inp.accept="image/*,application/pdf";inp.multiple=true;
    inp.onchange=async()=>{const l=[];toast("Envoi de "+inp.files.length+" fichier(s)…");
      for(const file of inp.files){try{const p=await lireFichier(file);const tmp=uid();PENDING[tmp]=p;l.push({tmp,nom:p.nom,type:p.type})}catch(e){toast(e.message,"bad")}}
      try{const out=await envoyerFichiers(l,{galerie:true});const cur=get("galeries",g.id)||g;await put("galeries",{...cur,photos:[...(cur.photos||[]),...out]});toast(out.length+" ajouté(s) à la galerie")}catch(e){toast(e.message||"Envoi impossible","bad")}};
    inp.click()});
  $$("[data-ph]",m).forEach(x=>x.onclick=()=>{const p=(g.photos||[])[+x.dataset.ph];if(!p)return;
    if(p.id)return voirFichier(p.id);
    sheet(g.titre,`<img class="scan" alt="" src="${esc(x.querySelector("img")?.src||p.src)}"><div class="row end"><a class="btn" target="_blank" rel="noopener" href="${esc(x.querySelector("img")?.src||p.src)}">${ico("eye")} Ouvrir</a></div>`)});
}};
