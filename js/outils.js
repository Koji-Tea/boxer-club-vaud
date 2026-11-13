"use strict";
/* Petits outils partagés : sélection, échappement, dates, icônes, fenêtres et messages. */
const VIEWS={}; // écrans de l’app, remplis par js/vues/*.js
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
// localStorage peut être bloqué (navigation privée) : on ne plante jamais pour ça.
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);return v}catch(e){return null}}
// Texte saisi : on garde les retours à la ligne et on rend les liens cliquables.
const rich=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,"<br>");
const telLink=t=>t?`<a href="tel:${esc(String(t).replace(/[^\d+]/g,""))}">${esc(t)}</a>`:"";
const mailLink=m=>m?`<a href="mailto:${esc(m)}">${esc(m)}</a>`:"";

/* ---------- Dates ---------- */
const pad=n=>String(n).padStart(2,"0");
const isoDay=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>isoDay(new Date());
const JOURS=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const parseDay=s=>{const[y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1)};
const fmtDay=s=>{if(!s)return"";const d=parseDay(s);return`${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`};
const fmtDayY=s=>{if(!s)return"";const d=parseDay(s);return`${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`};
const startOf=c=>{const d=parseDay(c.date);const[h,m]=(c.debut||"00:00").split(":").map(Number);d.setHours(h||0,m||0,0,0);return d};
const endOf=c=>{const d=parseDay(c.date);const[h,m]=(c.fin||c.debut||"23:59").split(":").map(Number);d.setHours(h||0,m||0,0,0);return d};
function fmtAgo(iso){
  const d=new Date(iso),n=new Date(),s=(n-d)/1000;
  if(s<60)return"à l’instant";if(s<3600)return`il y a ${Math.floor(s/60)} min`;
  const hm=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if(isoDay(d)===isoDay(n))return hm;
  const y=new Date(n);y.setDate(y.getDate()-1);if(isoDay(d)===isoDay(y))return"hier "+hm;
  return`${d.getDate()} ${MOIS[d.getMonth()].slice(0,4)}. ${hm}`;
}
function ageFrom(s){
  if(!s)return"";const d=parseDay(s),n=new Date();const j=Math.floor((n-d)/864e5);
  if(j<0)return"naissance prévue";if(j<14)return`${j} jour${j>1?"s":""}`;if(j<70)return`${Math.floor(j/7)} semaines`;const mo=Math.floor(j/30.44);if(mo<24)return`${mo} mois`;const an=Math.floor(mo/12),r=mo%12;return`${an} ans${r?" et "+r+" mois":""}`;
}

/* ---------- Icônes (trait simple, couleur du texte) ---------- */
const ICONS={
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  coach:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  club:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c.8-3 3-5 6-5s5.2 2 6 5M14 15.3c.6-.2 1.3-.3 2-.3 3 0 5.2 2 6 5"/>',
  map:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  sos:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.01"/>',
  heart:'<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
  paw:'<circle cx="6" cy="10" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-5.5 3.5-5.5 6 0 1.5 1.2 2 2.5 2 1.2 0 1.8-.6 3-.6s1.8.6 3 .6c1.3 0 2.5-.5 2.5-2 0-2.5-2.5-6-5.5-6z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  phone:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  send:'<path d="M4 12l16-8-6 16-3-6z"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  clip:'<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  coins:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  cabin:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/><path d="M16 6.5V3h2v5"/>',
  download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  qr:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  group:'<circle cx="9" cy="8" r="3"/><path d="M3 19c.7-3 3-5 6-5s5.3 2 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5M18 14c1.6.7 2.6 2.4 3 5"/>',
};
const ico=(n,cls="")=>`<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||""}</svg>`;
// Pastille avec initiales quand il n'y a pas de photo.
function avatar(name,photo,cls=""){
  if(photo)return`<img class="av ${cls}" alt="" src="${esc(photo)}">`;
  const ini=String(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  let h=0;for(const c of String(name||""))h=(h*31+c.charCodeAt(0))%360;
  return`<span class="av ${cls}" style="--h:${h}">${esc(ini||"?")}</span>`;
}

/* ---------- Messages et fenêtres ---------- */
function toast(msg,kind=""){
  const t=document.createElement("div");t.className="toast "+kind;t.textContent=msg;$("#toastRoot").appendChild(t);
  setTimeout(()=>t.classList.add("out"),3200);setTimeout(()=>t.remove(),3700);
}
// Feuille (fenêtre en bas sur téléphone, au centre sur ordinateur). Renvoie l'élément pour brancher les actions.
function sheet(title,body,{wide=false}={}){
  closeSheet();
  const w=document.createElement("div");w.className="sheet-bg";
  w.innerHTML=`<div class="sheet ${wide?"wide":""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><h2>${esc(title)}</h2><button class="iconbtn" data-close aria-label="Fermer">${ico("x")}</button></div><div class="sheet-b">${body}</div></div>`;
  w.addEventListener("click",e=>{if(e.target===w||e.target.closest("[data-close]"))closeSheet()});
  $("#sheetRoot").appendChild(w);document.body.classList.add("noscroll");
  const f=w.querySelector("input:not([type=hidden]),textarea,select");if(f&&matchMedia("(pointer:fine)").matches)f.focus();
  return w.querySelector(".sheet");
}
function closeSheet(){$("#sheetRoot").innerHTML="";document.body.classList.remove("noscroll")}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
function confirmBox(msg,ok="Supprimer"){
  return new Promise(res=>{
    const s=sheet("Confirmer",`<p>${esc(msg)}</p><div class="row end"><button class="btn" data-close>Annuler</button><button class="btn danger" id="cfOk">${esc(ok)}</button></div>`);
    $("#cfOk",s).onclick=()=>{closeSheet();res(true)};
    $("#sheetRoot .sheet-bg").addEventListener("click",e=>{if(e.target.closest("[data-close]")||e.target.classList.contains("sheet-bg"))res(false)});
  });
}

/* ---------- Formulaires simples ----------
   Un champ : {k:"nom",l:"Libellé",t:"text|textarea|date|time|number|select|tel|email|photo|check",o:[options],req:true,h:"aide"} */
function formHTML(fields,o={}){
  return`<form class="form">${fields.map(f=>{
    const v=o[f.k]??f.d??"";const id="f_"+f.k;const req=f.req?" required":"";
    let inp;
    if(f.t==="textarea")inp=`<textarea id="${id}" name="${f.k}" rows="${f.rows||4}"${req}>${esc(v)}</textarea>`;
    else if(f.t==="select")inp=`<select id="${id}" name="${f.k}"${req}>${f.o.map(x=>{const[val,lab]=Array.isArray(x)?x:[x,x];return`<option value="${esc(val)}"${String(val)===String(v)?" selected":""}>${esc(lab)}</option>`}).join("")}</select>`;
    else if(f.t==="check")return`<label class="chk"><input type="checkbox" name="${f.k}"${v?" checked":""}> ${esc(f.l)}</label>`;
    else if(f.t==="files")inp=`<div class="files-in"><input type="hidden" name="${f.k}" value="${esc(JSON.stringify(Array.isArray(v)?v:[]))}"><div class="chips" data-fl="${f.k}"></div>
      <div class="row wrap"><label class="btn sm">${ico("camera")} Scanner avec l’appareil photo<input type="file" accept="image/*" capture="environment" hidden data-addfile="${f.k}"></label>
      <label class="btn sm">${ico("clip")} Joindre une photo ou un PDF<input type="file" accept="image/*,application/pdf" multiple hidden data-addfile="${f.k}"></label></div></div>`;
    else if(f.t==="photo")inp=`<div class="photo-in">${avatar(o.nom||"",v,"lg")}<input type="hidden" name="${f.k}" value="${esc(v)}"><label class="btn sm">Choisir une photo<input type="file" accept="image/*" hidden data-photo="${f.k}"></label>${v?`<button type="button" class="btn sm ghost" data-nophoto="${f.k}">Retirer</button>`:""}</div>`;
    else inp=`<input id="${id}" name="${f.k}" type="${f.t||"text"}" value="${esc(v)}"${f.min!=null?` min="${f.min}"`:""}${f.t==="number"?` step="any"`:""}${f.ph?` placeholder="${esc(f.ph)}"`:""}${req}>`;
    return`<div class="f${f.half?" half":""}"><label for="${id}">${esc(f.l)}</label>${inp}${f.h?`<small>${esc(f.h)}</small>`:""}</div>`;
  }).join("")}<div class="row end full">${o.id&&o._canDel?`<button type="button" class="btn danger ghost" data-del>${ico("trash")} Supprimer</button><span class="grow"></span>`:""}<button type="button" class="btn" data-close>Annuler</button><button class="btn primary">Enregistrer</button></div></form>`;
}
function readForm(form,fields){
  const o={};fields.forEach(f=>{const el=form.elements[f.k];if(!el)return;
    if(f.t==="check")o[f.k]=el.checked;else if(f.t==="files")o[f.k]=JSON.parse(el.value||"[]");else if(f.t==="number")o[f.k]=el.value===""?null:Number(el.value);else o[f.k]=el.value.trim()});
  return o;
}
// Photo réduite à 320 px et compressée : elle tient dans la fiche, sans service de stockage de fichiers.
function shrinkImage(file,max=320,q=.8){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",q))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(file)});
}
// Ouvre un formulaire d'édition ; save(o) enregistre, remove() supprime.
function editSheet(title,fields,o,{save,remove,wide}={}){
  const s=sheet(title,formHTML(fields,{...o,_canDel:!!remove}),{wide});const form=$("form",s);
  form.addEventListener("submit",async e=>{e.preventDefault();const v=readForm(form,fields);const btn=$("button.primary",form);btn.disabled=true;
    try{for(const f of fields)if(f.t==="files")v[f.k]=await envoyerFichiers(v[f.k]);await save(v);closeSheet()}catch(err){toast(err.message||"Enregistrement impossible","bad")}finally{btn.disabled=false}});
  // Documents joints (factures, tickets) : liste, ajout par photo ou fichier, retrait.
  const drawFiles=k=>{const h=form.elements[k],l=JSON.parse(h.value||"[]"),box=$(`[data-fl="${k}"]`,form);
    box.innerHTML=l.length?l.map((x,i)=>`<span class="chip">${x.id?`<button type="button" class="lnk" data-viewfile="${esc(x.id)}">${ico(x.type==="application/pdf"?"file":"camera")} ${esc(x.nom)}</button>`:`${ico(x.type==="application/pdf"?"file":"camera")} ${esc(x.nom)}`}<button type="button" class="x" data-rmfile="${i}" aria-label="Retirer">×</button></span>`).join(""):`<span class="small muted">Aucun document joint.</span>`;
    $$("[data-rmfile]",box).forEach(b=>b.onclick=()=>{l.splice(+b.dataset.rmfile,1);h.value=JSON.stringify(l);drawFiles(k)});
    $$("[data-viewfile]",box).forEach(b=>b.onclick=()=>voirFichier(b.dataset.viewfile,true));
  };
  fields.filter(f=>f.t==="files").forEach(f=>drawFiles(f.k));
  $$("[data-addfile]",form).forEach(inp=>inp.addEventListener("change",async()=>{
    const k=inp.dataset.addfile,h=form.elements[k],l=JSON.parse(h.value||"[]");
    for(const file of inp.files){try{const p=await lireFichier(file);const tmp=uid();PENDING[tmp]=p;l.push({tmp,nom:p.nom,type:p.type})}catch(err){toast(err.message,"bad")}}
    h.value=JSON.stringify(l);inp.value="";drawFiles(k);
  }));
  $$("[data-photo]",form).forEach(inp=>inp.addEventListener("change",async()=>{
    const f=inp.files[0];if(!f)return;const url=await shrinkImage(f);form.elements[inp.dataset.photo].value=url;
    const av=$(".photo-in .av",form);av.outerHTML=`<img class="av lg" alt="" src="${url}">`;
  }));
  $$("[data-nophoto]",form).forEach(b=>b.onclick=()=>{form.elements[b.dataset.nophoto].value="";const av=$(".photo-in .av",form);av.outerHTML=avatar(o.nom||"","","lg");b.remove()});
  const d=$("[data-del]",form);if(d)d.onclick=async()=>{if(await confirmBox("Supprimer définitivement ?")){remove();}};
  return s;
}

/* ---------- Documents joints : affichage ---------- */
const fichiersHTML=l=>(l||[]).length?`<div class="chips">${l.map(x=>`<button class="chip" data-viewfile="${esc(x.id)}">${ico(x.type==="application/pdf"?"file":"camera")} ${esc(x.nom)}</button>`).join("")}</div>`:"";
function bindFichiers(root){$$("[data-viewfile]",root).forEach(b=>b.onclick=e=>{e.stopPropagation();voirFichier(b.dataset.viewfile)})}
// Ouvre un document dans une petite fenêtre, avec un bouton pour le télécharger. over = par-dessus un formulaire ouvert.
async function voirFichier(id,over){
  let f=null;try{f=await getFichier(id)}catch(e){}
  if(!f){toast("Document introuvable.","bad");return}
  const body=`${f.type==="application/pdf"?`<p>${ico("file")} ${esc(f.nom)}</p>`:`<img class="scan" alt="${esc(f.nom)}" src="${f.data}">`}
    <div class="row end"><a class="btn primary" href="${f.data}" download="${esc(f.nom)}">${ico("download")} Télécharger</a></div>`;
  if(over){const w=document.createElement("div");w.className="sheet-bg over";w.innerHTML=`<div class="sheet"><div class="sheet-h"><h2>${esc(f.nom)}</h2><button class="iconbtn" data-x aria-label="Fermer">${ico("x")}</button></div><div class="sheet-b">${body}</div></div>`;
    w.addEventListener("click",e=>{if(e.target===w||e.target.closest("[data-x]"))w.remove()});$("#sheetRoot").appendChild(w);return}
  sheet(f.nom,body);
}
const chf=n=>(Number(n)||0).toLocaleString("fr-CH",{minimumFractionDigits:2,maximumFractionDigits:2})+" CHF";
function telecharger(nom,texte,type="text/csv;charset=utf-8"){
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+texte],{type}));a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
}
