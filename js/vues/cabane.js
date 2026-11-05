"use strict";
/* Gestion de la cabane, visible seulement par le comité : échéances (gaz, extincteur…), inventaire, travaux et frais,
   fournisseurs, clés et infos pratiques. Tout est dans la collection « cabane », avec un champ kind. */
const CAB={
  echeance:{l:"Échéances",n:"Nouvelle échéance",fields:[
    {k:"nom",l:"Quoi",req:true,ph:"Bouteille de gaz, extincteur, trousse de secours…"},
    {k:"derniere",l:"Dernier remplacement ou contrôle",t:"date",half:true},{k:"frequence",l:"À refaire tous les … mois",t:"number",min:0,half:true},
    {k:"prochaine",l:"Prochaine échéance",t:"date",h:"Laisse vide : elle se calcule avec la date et la fréquence."},
    {k:"remarque",l:"Remarque",t:"textarea",rows:2}]},
  inventaire:{l:"Inventaire",n:"Nouvel objet",fields:[
    {k:"nom",l:"Objet",req:true},{k:"quantite",l:"Quantité",t:"number",min:0,half:true},{k:"lieu",l:"Rangé où",half:true,ph:"Cuisine, réduit, container…"},
    {k:"etat",l:"État",t:"select",o:["Bon","Usé","À réparer","À remplacer","Hors service"],half:true},{k:"valeur",l:"Valeur (CHF)",t:"number",min:0,half:true},
    {k:"remarque",l:"Remarque",t:"textarea",rows:2}]},
  travaux:{l:"Travaux & frais",n:"Nouveau travail ou achat",fields:[
    {k:"nom",l:"Travail ou achat à prévoir",req:true},{k:"montant",l:"Montant estimé (CHF)",t:"number",min:0,half:true},
    {k:"priorite",l:"Priorité",t:"select",o:["Haute","Moyenne","Basse"],d:"Moyenne",half:true},
    {k:"statut",l:"Où on en est",t:"select",o:["A faire","En cours","Fait"],half:true},{k:"date",l:"Prévu pour",t:"date",half:true},
    {k:"fournisseur",l:"Fournisseur ou artisan"},{k:"fichiers",l:"Devis, photos",t:"files"},{k:"remarque",l:"Remarque",t:"textarea",rows:2}]},
  fournisseur:{l:"Fournisseurs",n:"Nouveau fournisseur",fields:[
    {k:"nom",l:"Nom",req:true},{k:"categorie",l:"Pour quoi",ph:"Gaz, boissons, bois, entretien, électricien…"},
    {k:"contact",l:"Personne de contact",half:true},{k:"tel",l:"Téléphone",t:"tel",half:true},{k:"email",l:"E-mail",t:"email",half:true},{k:"site",l:"Site web",half:true},
    {k:"client",l:"Numéro de client",half:true},{k:"remarque",l:"Remarque",t:"textarea",rows:2}]},
  cle:{l:"Clés",n:"Nouvelle clé remise",fields:[
    {k:"nom",l:"Qui a la clé",req:true},{k:"nombre",l:"Nombre de clés",t:"number",min:0,d:1,half:true},{k:"depuis",l:"Remise le",t:"date",half:true},
    {k:"remarque",l:"Quelles clés",t:"textarea",rows:2,ph:"Cabane, cadenas du container, boîte aux lettres…"}]},
  info:{l:"Infos pratiques",n:"Nouvelle info",fields:[
    {k:"nom",l:"Titre",req:true,ph:"Fermeture de la cabane, compteur d’eau, location…"},{k:"texte",l:"Texte",t:"textarea",rows:5}]},
};
const ECH_HABITUELLES=[["Bouteille de gaz",12],["Extincteur (contrôle)",24],["Trousse de secours",12],["Détecteur de fumée (pile)",12],["Chauffage et ramonage",12],["Assurance du bâtiment",12]];
const addMois=(s,n)=>{const d=parseDay(s);d.setMonth(d.getMonth()+Number(n||0));return isoDay(d)};
const prochaine=o=>o.prochaine||(o.derniere&&o.frequence?addMois(o.derniere,o.frequence):"");
const joursAvant=s=>s?Math.round((parseDay(s)-parseDay(today()))/864e5):null;
function etatEch(o){const j=joursAvant(prochaine(o));if(j===null)return["","—"];if(j<0)return["bad","En retard"];if(j<=30)return["warn","Dans "+j+" jour"+(j>1?"s":"")];return["good","OK"]}
// Échéances dépassées ou dans les 30 jours (pastille du menu).
const cabaneAlertes=()=>isComite()?all("cabane").filter(o=>o.kind==="echeance"&&["bad","warn"].includes(etatEch(o)[0])):[];
const cabDe=k=>all("cabane").filter(o=>o.kind===k);

VIEWS.cabane={t:"Gestion cabane",r(){
  if(!isComite())return comiteOnly();
  const tab=CAB[ARG]?ARG:"echeance";
  const al=cabaneAlertes(),tr=cabDe("travaux").filter(o=>o.statut!=="Fait");
  return`${al.length?`<div class="banner bad">${ico("clock")}<div><b>${al.length} échéance${al.length>1?"s":""} à surveiller</b> : ${al.map(o=>esc(o.nom)).join(", ")}.</div></div>`:""}
    <div class="seg">${Object.entries(CAB).map(([k,c])=>`<a href="#cabane/${k}" class="${tab===k?"on":""}">${c.l} <span class="muted">${cabDe(k).length||""}</span></a>`).join("")}</div>
    <div class="row between wrap">${tab==="travaux"?`<p class="small">À prévoir : <b>${chf(somme(tr.map(o=>({montant:o.montant}))))}</b> pour ${tr.length} travau${tr.length>1?"x":""} ou achat${tr.length>1?"s":""}.</p>`:"<span></span>"}
      ${addBtn("addCab",CAB[tab].n)}</div>
    ${listeCab(tab)}`;
},bind(m){
  if(!isComite())return;
  const tab=CAB[ARG]?ARG:"echeance";
  const ed=o=>editSheet(o.id?"Modifier":CAB[o.kind].n,CAB[o.kind].fields,o,{wide:true,
    save:v=>put("cabane",{...o,...v}),remove:o.id&&(()=>{del("cabane",o.id);supprimerFichiers(o.fichiers)})});
  $("#addCab",m).onclick=()=>ed({kind:tab});
  $$("[data-cab]",m).forEach(x=>x.onclick=e=>{if(e.target.closest("button:not([data-cab]),a,label"))return;ed(get("cabane",x.dataset.cab))});
  $$("[data-fait]",m).forEach(b=>b.onclick=()=>{const o=get("cabane",b.dataset.fait);put("cabane",{...o,derniere:today(),prochaine:o.frequence?addMois(today(),o.frequence):""});toast(o.nom+" : noté fait aujourd’hui")});
  const s=$("#seedEch",m);if(s)s.onclick=async()=>{for(const[nom,f]of ECH_HABITUELLES)await put("cabane",{kind:"echeance",nom,frequence:f});toast("Échéances ajoutées : complète les dates")};
  bindFichiers(m);
}};
function listeCab(k){
  let l=cabDe(k);
  if(!l.length)return`<p class="muted">Rien pour l’instant.</p>${k==="echeance"?`<button class="btn sm" id="seedEch">${ico("plus")} Ajouter les contrôles habituels (gaz, extincteur, trousse de secours…)</button>`:""}`;
  const card=(o,body,right="")=>`<div class="card cab" data-cab="${esc(o.id)}"><div class="row"><span class="grow"><b>${esc(o.nom)}</b>${body}</span>${right}</div>${o.remarque?`<p class="small">${rich(o.remarque)}</p>`:""}${fichiersHTML(o.fichiers)}</div>`;
  const sm=a=>`<br><span class="small muted">${a.filter(Boolean).map(esc).join(" · ")}</span>`;
  if(k==="echeance")return`<div class="list">${l.sort((a,b)=>String(prochaine(a)||"9").localeCompare(prochaine(b)||"9")).map(o=>{const[c,t]=etatEch(o),p=prochaine(o);
    return card(o,sm([p?"Prochaine : "+fmtDayY(p):"Date à compléter",o.derniere?"Dernière : "+fmtDayY(o.derniere):"",o.frequence?"tous les "+o.frequence+" mois":""]),
      `<span class="badge ${c}">${esc(t)}</span><button class="btn sm" data-fait="${esc(o.id)}">${ico("check")} Fait</button>`)}).join("")}</div>`;
  if(k==="inventaire")return`<div class="list">${l.sort((a,b)=>String(a.nom).localeCompare(b.nom)).map(o=>card(o,sm([o.lieu,o.valeur?chf(o.valeur):""]),`${o.quantite!=null?`<b>× ${esc(o.quantite)}</b>`:""} <span class="badge ${/Bon/.test(o.etat||"Bon")?"":"bad"}">${esc(o.etat||"Bon")}</span>`)).join("")}</div>`;
  if(k==="travaux"){const ord={"A faire":0,"En cours":1,"Fait":2},pr={Haute:0,Moyenne:1,Basse:2};
    return`<div class="list">${l.sort((a,b)=>(ord[a.statut]??0)-(ord[b.statut]??0)||(pr[a.priorite]??1)-(pr[b.priorite]??1)).map(o=>card(o,sm([o.statut==="A faire"?"À faire":o.statut,o.priorite?"priorité "+o.priorite.toLowerCase():"",o.date?"prévu le "+fmtDayY(o.date):"",o.fournisseur]),o.montant?`<b>${chf(o.montant)}</b>`:"")).join("")}</div>`}
  if(k==="fournisseur")return`<div class="list">${l.sort((a,b)=>String(a.nom).localeCompare(b.nom)).map(o=>card(o,`${sm([o.categorie,o.contact,o.client?"client n° "+o.client:""])}<br><span class="small">${[telLink(o.tel),mailLink(o.email),o.site?`<a target="_blank" rel="noopener" href="${esc(/^https?:/.test(o.site)?o.site:"https://"+o.site)}">site</a>`:""].filter(Boolean).join(" · ")}</span>`)).join("")}</div>`;
  if(k==="cle")return`<p class="small">${somme(l.map(o=>({montant:o.nombre})))} clé(s) remise(s).</p><div class="list">${l.sort((a,b)=>String(a.nom).localeCompare(b.nom)).map(o=>card(o,sm([o.depuis?"depuis le "+fmtDayY(o.depuis):""]),`<b>${ico("key")} ${esc(o.nombre??1)}</b>`)).join("")}</div>`;
  return`<div class="list">${l.sort((a,b)=>String(a.nom).localeCompare(b.nom)).map(o=>card(o,o.texte?`<p class="small">${rich(o.texte)}</p>`:"")).join("")}</div>`;
}
