"use strict";
/* Pages vitrine : accueil, plan d'accès, soutien, contacts d'urgence, comité & adhérents. */
const byOrder=(a,b)=>(a.ordre??999)-(b.ordre??999)||String(a.nom||a.q||"").localeCompare(b.nom||b.q||"");
const addBtn=(id,l="Ajouter")=>`<button class="btn primary sm" id="${id}">${ico("plus")} ${l}</button>`;
const editBtn=(attr,id)=>`<button class="iconbtn" ${attr}="${esc(id)}" aria-label="Modifier">${ico("edit")}</button>`;

/* ---------- Accueil ---------- */
VIEWS.accueil={t:"Accueil",r(){
  const next=upcoming().slice(0,3);
  const dispo=all("portees").filter(p=>(p.chiots||[]).some(c=>c.dispo)).length;
  return`<section class="hero">
      <picture><source srcset="img/logo-blanc.png" media="(prefers-color-scheme: dark)"><img class="hero-logo" alt="Boxer Club Vaud" src="img/logo-noir.png"></picture>
      <p class="lead">${rich(CFG.accueil)}</p>
      <div class="row wrap">${ME?`<a class="btn primary" href="#agenda">${ico("cal")} Voir les cours</a>`:`<a class="btn primary" href="#compte">${ico("user")} Créer mon compte</a><a class="btn" href="#agenda">${ico("cal")} Les cours</a>`}</div>
    </section>
    ${installBanner()}
    ${CFG.annonce?`<div class="banner">${ico("bell")}<div>${rich(CFG.annonce)}</div></div>`:""}
    ${ME&&ME.role==="attente"?`<div class="banner info">${ico("clock")}<div>Ton compte attend la validation du comité. En attendant, tu peux tout consulter sauf le tchat et la liste des adhérents.</div></div>`:""}
    <h2 class="h">Prochains rendez-vous</h2>
    ${next.length?`<div class="list">${next.map(coursCard).join("")}</div><a class="more" href="#agenda">Tout l’agenda →</a>`:`<p class="muted">Aucun cours annoncé pour le moment.</p>`}
    <h2 class="h">Le club</h2>
    <div class="tiles">
      <a class="tile" href="#moniteurs">${ico("coach")}<span>Nos moniteurs</span></a>
      <a class="tile" href="#chiots">${ico("paw")}<span>Chiots${dispo?` <em class="pill">${dispo}</em>`:""}</span></a>
      <a class="tile" href="#wiki">${ico("book")}<span>Questions sur le boxer</span></a>
      <a class="tile" href="#club">${ico("club")}<span>Le comité</span></a>
      <a class="tile" href="#acces">${ico("map")}<span>Venir au club</span></a>
      <a class="tile" href="#soutenir">${ico("heart")}<span>Soutenir</span></a>
    </div>
    <div class="card soft"><h3>Première visite ?</h3><p>${rich(CFG.premiereVisite)}</p>${CFG.telClub?`<a class="btn sm" href="tel:${esc(CFG.telClub.replace(/[^\d+]/g,""))}">${ico("phone")} Contacter le club</a>`:""}</div>`;
}};

/* ---------- Plan d'accès ---------- */
VIEWS.acces={t:"Plan d’accès",r(){
  const{lat,lon}=CLUB,d=.006;
  const osm=`https://www.openstreetmap.org/export/embed.html?bbox=${lon-d*1.6},${lat-d},${lon+d*1.6},${lat+d}&layer=mapnik&marker=${lat},${lon}`;
  return`<div class="card"><h3>${ico("map")} Terrain et cabane du Boxer Club</h3><p class="addr">${esc(CLUB.adresse)}</p>
      <p class="small muted">GPS : ${lat}, ${lon}</p>
      <div class="row wrap">
        <a class="btn primary" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}">${ico("ext")} Itinéraire Google Maps</a>
        <a class="btn" target="_blank" rel="noopener" href="https://maps.apple.com/?daddr=${lat},${lon}&q=Boxer%20Club%20Vaud">${ico("ext")} Plans (Apple)</a>
        <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=transit">${ico("ext")} En transports publics</a>
        <button class="btn" id="copyAddr">Copier l’adresse</button>
      </div></div>
    <div class="map"><iframe title="Plan d’accès au Boxer Club Vaud" loading="lazy" src="${osm}"></iframe></div>
    <p class="small"><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}">Agrandir la carte</a> · © contributeurs OpenStreetMap</p>
    <div class="card soft"><h3>Bon à savoir</h3><p>${rich(CFG.acces)}</p></div>`;
},bind(m){$("#copyAddr",m).onclick=()=>navigator.clipboard.writeText(CLUB.adresse).then(()=>toast("Adresse copiée"))}};

/* ---------- Soutenir ---------- */
VIEWS.soutenir={t:"Soutenir le club",r(){
  const L=(u,l)=>`<a class="btn" target="_blank" rel="noopener" href="${esc(u)}">${ico("ext")} ${l}</a>`;
  return`<p class="lead">Le Boxer Club Vaud vit grâce à ses membres, ses bénévoles et ses donateurs. Merci pour votre soutien !</p>
    <div class="grid2">
      <div class="card"><h3>${ico("heart")} Faire un don par Twint</h3><p>Scannez le code avec l’app Twint.</p>
        <img class="twint" alt="Code QR Twint du Boxer Club Vaud" src="${CLUB.twintImg}" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'small muted',textContent:'Le code QR est affiché sur boxerclubvaud.ch.'}))">
        <div class="row wrap">${L(CLUB.site+"#contact","Voir sur le site du club")}</div></div>
      <div class="card"><h3>${ico("club")} Devenir membre</h3><p>Rejoignez le club : cours d’éducation, sorties, entraide et convivialité.</p>
        <div class="row wrap">${L(CLUB.dossier,"Dossier d’inscription (PDF)")}${L(CLUB.statutsBCV,"Statuts BCV")}${L(CLUB.statutsBCS,"Statuts BCS")}</div></div>
      <div class="card"><h3>${ico("paw")} Vêtements et autocollants</h3><p>Portez les couleurs du club : la vente finance ses activités.</p>
        <div class="row wrap">${L(CLUB.prix,"Liste de prix")}${L(CLUB.catalogue,"Catalogue 2025")}${L(CLUB.commande,"Commander")}</div></div>
      <div class="card"><h3>${ico("shield")} Boxer en détresse</h3><p>${rich(CFG.detresse)}</p>
        <div class="row wrap"><a class="btn" href="tel:0764818925">${ico("phone")} Suzanne Rochat</a></div></div>
      <div class="card"><h3>${ico("user")} Devenir bénévole</h3><p>Coup de main à la cabane, aux événements ou à Boxer en détresse : écrivez au comité.</p>
        <div class="row wrap"><a class="btn" href="mailto:president@boxerclubvaud.ch">${ico("mail")} Écrire au comité</a></div></div>
      <div class="card"><h3>${ico("ext")} Suivre le club</h3><div class="row wrap">${L(CLUB.site,"boxerclubvaud.ch")}${L(CLUB.facebook,"Facebook")}${L(CLUB.galeries,"Galeries photos")}${L(CLUB.bcs,"Boxer Club Suisse")}</div></div>
    </div>`;
}};

/* ---------- Contacts d'urgence ---------- */
const URG_FIELDS=[{k:"nom",l:"Nom",req:true},{k:"tel",l:"Téléphone",t:"tel"},{k:"cat",l:"Catégorie",t:"select",o:["Chiens","Personnes","Club"]},{k:"desc",l:"Précisions",t:"textarea",rows:2},{k:"ordre",l:"Ordre d’affichage",t:"number",h:"Les plus petits nombres en premier."}];
VIEWS.urgences={t:"Contacts d’urgence",r(){
  const cats=["Chiens","Personnes","Club"];const list=all("urgences").sort(byOrder);
  return`<div class="banner bad">${ico("sos")}<div><b>Chien en danger (torsion d’estomac, coup de chaleur, intoxication, accident) : appelez tout de suite un vétérinaire.</b> Ne donnez rien à manger ni à boire en attendant.</div></div>
    ${canWrite("urgences")?`<div class="row end">${addBtn("addUrg")}</div>`:""}
    ${cats.map(c=>{const l=list.filter(u=>(u.cat||"Club")===c);return l.length?`<h2 class="h">${c==="Chiens"?"Pour votre chien":c==="Personnes"?"Pour les personnes":"Le club"}</h2><div class="list">${l.map(u=>`
      <div class="card urg"><div class="grow"><b>${esc(u.nom)}</b>${u.desc?`<p class="small">${rich(u.desc)}</p>`:""}</div>
      ${u.tel?`<a class="btn call" href="tel:${esc(u.tel.replace(/[^\d+]/g,""))}">${ico("phone")} ${esc(u.tel)}</a>`:`<span class="small muted">numéro à compléter</span>`}
      ${canWrite("urgences")?editBtn("data-urg",u.id):""}</div>`).join("")}</div>`:""}).join("")}`;
},bind(m){
  const ed=o=>editSheet(o.id?"Modifier le contact":"Nouveau contact",URG_FIELDS,o,{save:v=>put("urgences",{...o,...v}),remove:o.id&&(()=>del("urgences",o.id))});
  const a=$("#addUrg",m);if(a)a.onclick=()=>ed({cat:"Chiens"});
  $$("[data-urg]",m).forEach(b=>b.onclick=()=>ed(get("urgences",b.dataset.urg)));
}};

/* ---------- Comité & adhérents ---------- */
const COM_FIELDS=[{k:"nom",l:"Nom",req:true},{k:"role",l:"Rôle",req:true},{k:"email",l:"E-mail",t:"email"},{k:"tel",l:"Téléphone",t:"tel"},{k:"photo",l:"Photo",t:"photo"},{k:"ordre",l:"Ordre d’affichage",t:"number"}];
VIEWS.club={t:"Comité & adhérents",r(){
  const tab=ARG==="adherents"?"adherents":"comite";
  return`<div class="seg"><a href="#club" class="${tab==="comite"?"on":""}">Le comité</a><a href="#club/adherents" class="${tab==="adherents"?"on":""}">Adhérents</a></div>
    ${tab==="comite"?comiteHTML():adherentsHTML()}`;
},bind(m){
  const ed=o=>editSheet(o.id?"Modifier":"Nouveau membre du comité",COM_FIELDS,o,{save:v=>put("comite",{...o,...v}),remove:o.id&&(()=>del("comite",o.id))});
  const a=$("#addCom",m);if(a)a.onclick=()=>ed({});
  $$("[data-com]",m).forEach(b=>b.onclick=()=>ed(get("comite",b.dataset.com)));
  const q=$("#adhQ",m);if(q)q.oninput=()=>{const t=norm(q.value);$$(".adh",m).forEach(x=>x.hidden=t&&!norm(x.dataset.s).includes(t))};
  $$("[data-user]",m).forEach(b=>b.onclick=()=>userSheet(get("users",b.dataset.user)));
  $$("[data-cotis]",m).forEach(c=>c.onchange=()=>{setCotis(c.dataset.cotis,c.checked);toast(c.checked?"Cotisation notée comme réglée":"Cotisation notée comme non réglée")});
}};
function comiteHTML(){
  return`<p class="lead">Les membres du comité du Boxer Club Vaud.</p>
    ${canWrite("comite")?`<div class="row end">${addBtn("addCom")}</div>`:""}
    <div class="people">${all("comite").sort(byOrder).map(p=>`<div class="card person">${avatar(p.nom,p.photo,"lg")}<div class="grow"><b>${esc(p.nom)}</b><span class="role">${esc(p.role)}</span>
      <div class="small">${p.tel?telLink(p.tel)+"<br>":""}${mailLink(p.email)}</div></div>${canWrite("comite")?editBtn("data-com",p.id):""}</div>`).join("")}</div>`;
}
function adherentsHTML(){
  const lock=membersOnly("La liste des adhérents");if(lock)return lock;
  const list=all("users").filter(u=>MEMBERS.includes(u.role)).sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const an=anneeCotis(),fin=isFinance(),nb=fin?list.filter(u=>cotisPayee(u.id)).length:0;
  return`<p class="muted">${list.length} membre${list.length>1?"s":""} et adhérent·es inscrit·es dans l’app.</p>
    ${fin?`<div class="banner info cotis">${ico("check")}<div><b>Cotisations ${an} : ${nb} sur ${list.length} réglée${nb>1?"s":""}.</b><br><span class="small">Cette information n’est visible que par l’admin, le/la président·e et le/la caissier·ère.</span></div></div>`:""}
    <div class="search">${ico("search")}<input id="adhQ" type="search" placeholder="Chercher un pseudo, un prénom, un chien…"></div>
    <div class="list">${list.map(u=>`<div class="card adh" data-s="${esc([u.pseudo,u.prenom,u.chien].join(" "))}"><button class="adh-main row" data-user="${esc(u.id)}">
      ${avatar(u.pseudo,u.photo)}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?` <span class="muted">· ${esc(u.prenom)}</span>`:""}<br><span class="small">${u.chien?"🐾 "+esc(u.chien):""}</span></span>
      <span class="badge r-${esc(u.role)}">${esc(ROLES[u.role].l)}</span></button>
      ${fin?`<label class="chk cotis-chk"><input type="checkbox" data-cotis="${esc(u.id)}"${cotisPayee(u.id)?" checked":""}> Cotisation ${an} réglée</label>`:""}</div>`).join("")}</div>`;
}
// Fiche d'un·e adhérent·e et de ses chiens.
function userSheet(u){
  if(!u)return;
  sheet(u.pseudo,`<div class="row">${avatar(u.pseudo,u.photo,"lg")}<div><b>${esc(u.pseudo)}</b>${u.prenom?` · ${esc(u.prenom)}`:""}<br><span class="badge r-${esc(u.role)}">${esc((ROLES[u.role]||{}).l||"")}</span></div></div>
    ${(u.chiens||[]).length?`<h3>Ses chiens</h3>${dogsHTML(u.chiens)}`:`<p class="muted">Aucun chien renseigné.</p>`}`);
}
function dogsHTML(list){
  return`<div class="dogs">${(list||[]).map(c=>`<div class="dog">${avatar(c.nom,c.photo,"lg")}<div><b>${esc(c.nom||"Sans nom")}</b>
    <div class="small">${[SEXES[c.sexe],c.race,c.naissance?ageFrom(c.naissance)+" (né"+(c.sexe==="F"?"e":"")+" le "+fmtDayY(c.naissance)+")":""].filter(Boolean).map(esc).join(" · ")}</div>
    ${c.remarque?`<p class="small">${rich(c.remarque)}</p>`:""}</div></div>`).join("")}</div>`;
}
