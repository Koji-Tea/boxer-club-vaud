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
    ${tchatApercu()}
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

// Vue rapide du tchat sur l'accueil (membres) : les derniers messages du fil général et des groupes rejoints.
function tchatApercu(){
  if(!isMember())return"";
  const grp=new Map(all("groupes").filter(dansGroupe).map(g=>[g.id,g]));
  const l=[...all("messages").map(x=>({...x,_c:""})),...all("gmsgs").filter(x=>grp.has(x.g)).map(x=>({...x,_c:x.g}))]
    .sort((a,b)=>String(b.at).localeCompare(a.at)).slice(0,4);
  const nl=tchatNonLus();
  return`<div class="row between"><h2 class="h">Tchat${dotNL(nl)}</h2><a class="more" href="#tchat">Ouvrir le tchat →</a></div>
    ${l.length?`<div class="card apercu">${l.map(x=>{const u=get("users",x.uid)||(x.uid===ME.uid?ME:null),nom=x.pseudo||(u&&u.pseudo)||"",pre=u&&u.prenom,g=grp.get(x._c);
      const neuf=x.uid!==ME.uid&&String(x.at)>vuLe(x._c||"general");
      return`<a class="ap-msg${neuf?" neuf":""}" href="#tchat${x._c?"/"+esc(x._c):""}">${avatar(nom,u&&u.photo,"sm")}<span class="grow"><b>${esc(nom)}${pre?` <span class="muted">· ${esc(pre)}</span>`:""}</b>
        <span class="small muted"> · ${g?esc(g.nom):"Général"} · ${esc(fmtAgo(x.at))}</span><br><span class="small ap-txt">${esc(String(x.texte).slice(0,140))}</span></span></a>`}).join("")}</div>`
      :`<p class="muted">Aucun message pour l’instant. <a href="#tchat">Lance la discussion</a></p>`}`;
}

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
        ${qrSrc()?`<div class="row wrap"><button class="btn primary" data-qr>${ico("qr")} Payer l’adhésion (QR code)</button></div>`:""}
        <div class="row wrap">${L(CLUB.dossier,"Dossier d’inscription (PDF)")}${L(CLUB.statutsBCV,"Statuts BCV")}${L(CLUB.statutsBCS,"Statuts BCS")}</div></div>
      <div class="card"><h3>${ico("paw")} Vêtements et autocollants</h3><p>Portez les couleurs du club : la vente finance ses activités.</p>
        <div class="row wrap">${L(CLUB.prix,"Liste de prix")}${L(CLUB.catalogue,"Catalogue 2025")}${L(CLUB.commande,"Commander")}</div></div>
      <div class="card"><h3>${ico("shield")} Boxer en détresse</h3><p>${rich(/placement/i.test(CFG.detresse||"")?CFG.detresse:(CFG.detresse||"")+" Les frais de placement sont de 200 CHF.")}</p>
        <div class="row wrap"><a class="btn" href="tel:0764818925">${ico("phone")} Suzanne Rochat</a></div></div>
      <div class="card"><h3>${ico("user")} Devenir bénévole</h3><p>Coup de main à la cabane, aux événements ou à Boxer en détresse : écrivez au comité.</p>
        <div class="row wrap"><a class="btn" href="mailto:president@boxerclubvaud.ch">${ico("mail")} Écrire au comité</a></div></div>
      <div class="card"><h3>${ico("ext")} Suivre le club</h3><div class="row wrap">${L(CLUB.site,"boxerclubvaud.ch")}${L(CLUB.facebook,"Facebook")}${L(CLUB.instagram,"Instagram")}${L(CLUB.galeries,"Galeries photos")}${L(CLUB.bcs,"Boxer Club Suisse")}</div></div>
    </div>`;
},bind(m){bindQR(m)}};

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
  const tab=ARG==="adherents"?"adherents":ARG==="documents"&&isComite()?"documents":"comite";
  return`<div class="seg"><a href="#club" class="${tab==="comite"?"on":""}">Le comité</a><a href="#club/adherents" class="${tab==="adherents"?"on":""}">Adhérents</a>${isComite()?`<a href="#club/documents" class="${tab==="documents"?"on":""}">${ico("shield")} Documents du comité</a>`:""}</div>
    ${tab==="comite"?comiteHTML():tab==="adherents"?adherentsHTML():docsComiteHTML()}`;
},bind(m){
  const ed=o=>{
    const lie=o.compte&&get("users",o.compte);
    const fields=[...COM_FIELDS];
    // Le comité relie la fiche au compte de la personne dans l'app pour lui donner son rôle (président·e, caissier·ère…).
    if(isAdhEdit())fields.push(
      {k:"compte",l:"Son compte dans l’app",t:"select",o:[["","— pas encore de compte —"],...all("users").sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo)).map(u=>[u.id,u.pseudo+(u.prenom?" · "+u.prenom:"")])],h:"La personne doit d’abord créer son compte dans l’app (Mon compte › Créer un compte)."},
      {k:"appRole",l:"Rôle dans l’app",t:"select",o:roleChoices(lie||{}),d:lie?lie.role:"comite",h:"Donne les droits correspondants. Président·e et Caissier·ère : par l’admin ou le/la président·e seulement."});
    editSheet(o.id?"Modifier":"Nouveau membre du comité",fields,{...o,appRole:lie?lie.role:undefined},{wide:true,
      save:async v=>{const r=v.appRole;delete v.appRole;await put("comite",{...o,...v});
        const u=v.compte&&get("users",v.compte);if(u&&r&&r!==u.role&&canGiveRole(u.role,r)){await setRole(u.id,r);toast("Rôle de "+u.pseudo+" : "+ROLES[r].l)}},
      remove:o.id&&(()=>del("comite",o.id))});
  };
  const a=$("#addCom",m);if(a)a.onclick=()=>ed({});
  if(ARG==="documents")bindDocsComite(m);
  $$("[data-com]",m).forEach(b=>b.onclick=()=>ed(get("comite",b.dataset.com)));
  const q=$("#adhQ",m);if(q)q.oninput=()=>{const t=norm(q.value);$$(".adh",m).forEach(x=>x.hidden=t&&!norm(x.dataset.s).includes(t))};
  $$("[data-user]",m).forEach(b=>b.onclick=()=>userSheet(get("users",b.dataset.user)));
  bindRoleSelects(m);bindCotis(m);bindQR(m);
  const ib=$("#infoBcs",m);if(ib)ib.onclick=()=>sheet("Adhésion au Boxer Club Suisse",`<p>${esc(INFO_BCS)}</p>`);
  $$("[data-adhf]",m).forEach(b=>b.onclick=()=>{ls("bcv-adh-f",b.dataset.adhf);rerender()});
}};
function comiteHTML(){
  return`<p class="lead">Les membres du comité du Boxer Club Vaud.</p>
    ${canWrite("comite")?`<div class="row end">${addBtn("addCom")}</div>`:""}
    <div class="people">${all("comite").sort(byOrder).map(p=>{const u=isComite()&&p.compte&&get("users",p.compte);
      return`<div class="card com"><div class="person">${avatar(p.nom,p.photo,"lg")}<div class="grow"><b>${esc(p.nom)}</b><span class="role">${esc(p.role)}</span>
      <div class="small">${p.tel?telLink(p.tel)+"<br>":""}${mailLink(p.email)}</div></div>${canWrite("comite")?editBtn("data-com",p.id):""}</div>
      ${isComite()&&(u||isAdhEdit())?`<div class="adh-foot">${u?`<span class="small">Compte <b>${esc(u.pseudo)}</b></span><label class="role-lab">Rôle ${roleSelect(u)}</label>`:`<span class="small muted">Pas de compte lié : touche ✎ pour choisir son compte et son rôle.</span>`}</div>`:""}</div>`}).join("")}</div>`;
}
// Liste déroulante du rôle d'un compte : admin seulement par l'admin, président·e et caissier·ère par l'admin ou le/la président·e.
const roleChoices=u=>Object.keys(ROLES).filter(r=>r===u.role||(!ROLES[r].old&&canGiveRole(u.role||"attente",r))).map(r=>[r,ROLES[r].l]);
const roleBadge=u=>`<span class="badge r-${esc(u.role)}">${esc((ROLES[u.role]||{}).l||u.role)}</span>`;
function roleSelect(u){
  if(!isAdhEdit()||(u.id===ME.uid&&!isAdmin()))return roleBadge(u);
  const ch=roleChoices(u);if(ch.length<2)return roleBadge(u);
  return`<select class="role-sel" data-role-of="${esc(u.id)}" aria-label="Rôle de ${esc(u.pseudo)}">${ch.map(([r,l])=>`<option value="${r}"${u.role===r?" selected":""}>${l}</option>`).join("")}</select>`;
}
function bindRoleSelects(m){$$("[data-role-of]",m).forEach(s=>s.onchange=()=>{setRole(s.dataset.roleOf,s.value);toast("Rôle de "+((get("users",s.dataset.roleOf)||{}).pseudo||"")+" : "+ROLES[s.value].l)})}

/* ---------- Documents du comité : PV, convocations, correspondance (comité seulement) ---------- */
const DOC_TYPES=["PV","Convocation","Correspondance","Rapport","Contrat","Clôture comptable","Autre"];
const DOC_FIELDS=[{k:"type",l:"Type",t:"select",o:DOC_TYPES,half:true},{k:"date",l:"Date du document",t:"date",req:true,half:true},
  {k:"titre",l:"Titre",req:true,ph:"PV de l’assemblée générale, convocation du comité…"},
  {k:"fichiers",l:"Document",t:"files",h:"Scanne chaque page avec l’appareil photo, ou joins le PDF."},{k:"remarque",l:"Remarque",t:"textarea",rows:2}];
let DOC_AN=ls("bcv-docs-an")||"";
function docsComiteHTML(){
  const l=all("docscomite"),ans=[...new Set([anneeCotis(),...l.map(o=>exoDe(o.date)).filter(Boolean)])].sort().reverse();
  const an=ans.includes(DOC_AN)?DOC_AN:ans[0],f=ls("bcv-docs-type")||"";
  const q=l.filter(o=>exoDe(o.date)===an&&(!f||o.type===f)).sort((a,b)=>String(b.date).localeCompare(a.date));
  return`<div class="row between wrap"><p class="small muted">${ico("shield")} Visible seulement par les membres du comité.</p>${addBtn("addDoc","Nouveau document")}</div>
    <div class="row between wrap"><div class="seg">${[["","Tous"],...DOC_TYPES.map(t=>[t,t])].map(([k,n])=>`<button data-dtype="${k}" class="${f===k?"on":""}">${n} <span class="muted">${l.filter(o=>exoDe(o.date)===an&&(!k||o.type===k)).length||""}</span></button>`).join("")}</div>
      <label class="small an-sel">Année <select id="docAn">${ans.map(a=>`<option value="${a}"${a===an?" selected":""}>${labelAn(a)}</option>`).join("")}</select></label></div>
    ${q.length?`<div class="list">${q.map(o=>`<div class="card doc" data-doc="${esc(o.id)}"><div class="row"><span class="grow"><b>${esc(o.titre)}</b><br><span class="small muted">${esc(o.type||"")} · ${esc(fmtDayY(o.date))}</span></span>${editBtn("data-edoc",o.id)}</div>
      ${o.remarque?`<p class="small">${rich(o.remarque)}</p>`:""}${fichiersHTML(o.fichiers)}</div>`).join("")}</div>`
      :`<p class="muted">Aucun document${f?" de ce type":""} archivé pour ${labelAn(an)}.</p>`}`;
}
function bindDocsComite(m){
  const ed=o=>editSheet(o.id?"Modifier le document":"Nouveau document",DOC_FIELDS,o,{wide:true,
    save:v=>put("docscomite",{...o,...v,annee:exoDe(v.date),uid:o.uid||ME.uid}),remove:o.id&&(()=>{del("docscomite",o.id);supprimerFichiers(o.fichiers)})});
  const a=$("#addDoc",m);if(a)a.onclick=()=>ed({type:"PV",date:today()});
  $$("[data-edoc]",m).forEach(b=>b.onclick=()=>ed(get("docscomite",b.dataset.edoc)));
  $$("[data-dtype]",m).forEach(b=>b.onclick=()=>{ls("bcv-docs-type",b.dataset.dtype);rerender()});
  const s=$("#docAn",m);if(s)s.onchange=()=>{DOC_AN=s.value;ls("bcv-docs-an",DOC_AN);rerender()};
  bindFichiers(m);
}

/* ---------- Cotisations (coche + date de paiement) ---------- */
function cotisCtrl(u,an=anneeCotis()){
  const ok=cotisPayee(u.id,an),dt=cotisDate(u.id,an);
  if(!isCotisEdit())return`<span class="badge ${ok?"good":"bad"}">${ok?`${ico("check")} Cotisation ${labelAn(an)} payée${dt?" le "+esc(fmtDayY(dt)):""}`:`Cotisation ${labelAn(an)} pas encore payée`}</span>`;
  return`<label class="chk"><input type="checkbox" data-cotis="${esc(u.id)}" data-an="${an}"${ok?" checked":""}> Cotisation membre Boxer Club Vaud ${labelAn(an)} payée</label>
    <label class="small cotis-date">le <input type="date" data-cotisdate="${esc(u.id)}" data-an="${an}" value="${esc(dt)}"${ok?"":" disabled"}></label>`;
}
function bindCotis(m){
  $$("[data-cotis]",m).forEach(c=>c.onchange=()=>{
    const d=$(`[data-cotisdate="${c.dataset.cotis}"]`,m);if(d){d.disabled=!c.checked;if(c.checked&&!d.value)d.value=today();if(!c.checked)d.value=""}
    setCotis(c.dataset.cotis,c.checked,d&&d.value,c.dataset.an);toast(c.checked?"Cotisation notée comme payée":"Cotisation notée comme non payée")});
  $$("[data-cotisdate]",m).forEach(d=>d.onchange=()=>{if(!d.value)return;setCotis(d.dataset.cotisdate,true,d.value,d.dataset.an);toast("Date de paiement enregistrée")});
}

/* ---------- QR code de paiement de l'adhésion ---------- */
function qrSheet(){
  sheet("Payer mon adhésion",`<p>Cotisation annuelle au Boxer Club Vaud : <b>${chf(montantCotis())}</b>. Scanne ce QR code avec l’app de ta banque, ou télécharge-le pour le garder.</p>
    <img class="qr-big" alt="QR code de paiement de l’adhésion" src="${qrSrc()}">
    <div class="row end"><a class="btn primary" href="${qrSrc()}" download="QR-adhesion-Boxer-Club-Vaud${qrSrc().startsWith("data:image/jpeg")?".jpg":".png"}">${ico("download")} Télécharger le QR code</a></div>`);
}
const bindQR=m=>$$("[data-qr]",m).forEach(b=>b.onclick=qrSheet);

const INFO_BCS="L’adhésion au Boxer Club Suisse est également obligatoire et facturée séparément, à 93 CHF/an, avec 18 CHF de frais d’entrée uniques selon le tarif 2025. Ces montants restent à confirmer pour 2026–2027.";
/* ---------- Adhérents ----------
   Tout le monde voit pseudo, prénom et chiens. Le comité voit en plus e-mail, téléphone, adhésions et cotisations. */
function adherentsHTML(){
  const qr=qrSrc()?`<div class="banner good qr-banner">${ico("qr")}<div class="grow"><b>Payer son adhésion au Boxer Club Vaud</b><br><span class="small">Télécharge le QR code de paiement (cotisation ${chf(montantCotis())} par an).</span></div><button class="btn sm primary" data-qr>${ico("download")} QR code</button></div>`
    :isComite()?`<p class="small muted">${ico("qr")} Ajoute le QR code de paiement de l’adhésion dans <a href="#reglages">Réglages</a> : un bouton pour le télécharger s’affichera ici.</p>`:"";
  const info=`<div class="row end"><button class="btn sm ghost" id="infoBcs" aria-label="Information sur l’adhésion au Boxer Club Suisse">${ico("info")} Info adhésion Boxer Club Suisse</button></div>`;
  const lock=membersOnly("La liste des adhérents");if(lock)return info+qr+lock;
  const com=isComite(),an=anneeCotis(),f=com?(ls("bcv-adh-f")||"tous"):"tous";
  const list=all("users").filter(u=>MEMBERS.includes(u.role)).sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const nb=com?list.filter(u=>cotisPayee(u.id)).length:0;
  const shown=list.filter(u=>f==="tous"||(f==="paye")===cotisPayee(u.id));
  return`${info}${qr}<p class="muted">${list.length} membre${list.length>1?"s":""} et adhérent·es inscrit·es dans l’app.</p>
    ${com?`<div class="banner info cotis">${ico("check")}<div><b>Cotisations ${labelAn(an)} : ${nb} sur ${list.length} payée${nb>1?"s":""}.</b><br><span class="small">Contacts et cotisations : visibles seulement par le comité.</span></div></div>
      <div class="seg">${[["tous","Tous"],["paye","Cotisation payée"],["non","Pas encore payée"]].map(([k,l])=>`<button data-adhf="${k}" class="${f===k?"on":""}">${l}</button>`).join("")}</div>`:""}
    <div class="search">${ico("search")}<input id="adhQ" type="search" placeholder="Chercher un pseudo, un prénom, un chien…"></div>
    <div class="list">${shown.map(u=>`<div class="card adh" data-s="${esc([u.pseudo,u.prenom,u.chien,com?priveDe(u.id).email:""].join(" "))}">${userRow(u)}${com?`<div class="adh-foot">${cotisCtrl(u,an)}</div>`:""}</div>`).join("")}</div>`;
}
function userRow(u){
  const com=isComite(),p=com?priveDe(u.id):{};
  return`<button class="adh-main row" data-user="${esc(u.id)}">${avatar(u.pseudo,u.photo)}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?` <span class="muted">· ${esc(u.prenom)}</span>`:""}
    ${u.chien?`<br><span class="small">🐾 ${esc(u.chien)}</span>`:""}${com&&(p.email||p.tel)?`<br><span class="small muted">${[p.tel,p.email].filter(Boolean).map(esc).join(" · ")}</span>`:""}</span>
    <span class="badges">${roleBadge(u)}${com&&u.bcv?`<span class="badge">BCV</span>`:""}${com&&u.bcs?`<span class="badge">BCS</span>`:""}</span></button>`;
}
// Fiche d'un·e adhérent·e et de ses chiens, avec un bouton pour lui écrire.
function userSheet(u){
  if(!u)return;
  const com=isComite(),p=com?priveDe(u.id):{},an=anneeCotis(),dt=cotisDate(u.id);
  const kv=(l,v)=>`<div class="kv"><span>${l}</span><div>${v||"—"}</div></div>`;
  const s=sheet(u.pseudo,`<div class="row">${avatar(u.pseudo,u.photo,"lg")}<div class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?` · ${esc(u.prenom)}`:""}<br>${roleBadge(u)}</div></div>
    ${isMember()&&u.id!==ME.uid&&MEMBERS.includes(u.role)?`<div class="row"><a class="btn primary" href="#boite/m/${esc(u.id)}">${ico("mail")} Envoyer un message</a></div>`:""}
    ${com?`<div class="card soft">${kv("E-mail",mailLink(p.email))}${kv("Téléphone",telLink(p.tel))}${kv("Adhésion",[u.bcv?"Boxer Club Vaud":"",u.bcs?"Boxer Club Suisse":""].filter(Boolean).join(" · "))}
      ${kv("Cotisation "+an,cotisPayee(u.id)?"Payée"+(dt?" le "+esc(fmtDayY(dt)):""):"Pas encore payée")}<p class="small muted">Visible seulement par le comité.</p></div>`:""}
    ${(u.chiens||[]).length?`<h3>Ses chiens</h3>${dogsHTML(u.chiens,u.id)}`:`<p class="muted">Aucun chien renseigné.</p>`}`);
  bindFichiers(s);
}
// Vaccins du chien et carnet joint : visibles seulement par la personne elle-même et le comité.
function vaccinHTML(c,uid){
  if(!uid||!(isComite()||(ME&&uid===ME.uid)))return"";
  const st=c.vaccin?`<span class="badge good">💉 Vacciné${c.sexe==="F"?"e":""}${c.vaccinDate?" · rappel le "+esc(fmtDayY(c.vaccinDate)):""}</span>`:c.vaccin===false?`<span class="badge bad">Pas vacciné${c.sexe==="F"?"e":""}</span>`:"";
  const voir=uid&&(isComite()||(ME&&uid===ME.uid));
  return(st||(voir&&(c.carnet||[]).length)?`<div class="vacc">${st}${voir?fichiersHTML(c.carnet):""}</div>`:"");
}
function dogsHTML(list,uid){
  return`<div class="dogs">${(list||[]).map(c=>`<div class="dog">${avatar(c.nom,c.photo,"lg")}<div><b>${esc(c.nom||"Sans nom")}</b>
    <div class="small">${[SEXES[c.sexe],c.race,c.naissance?ageFrom(c.naissance)+" (né"+(c.sexe==="F"?"e":"")+" le "+fmtDayY(c.naissance)+")":""].filter(Boolean).map(esc).join(" · ")}</div>
    ${c.remarque?`<p class="small">${rich(c.remarque)}</p>`:""}${vaccinHTML(c,uid)}</div></div>`).join("")}</div>`;
}
