"use strict";
/* Agenda des cours (avec inscriptions et rappels) et fiches des moniteurs. */
const NIVEAUX=["Tous","Chiots","Débutants","Intermédiaires","Avancés","FAC","Événement"];
const upcoming=()=>all("cours").filter(c=>endOf(c)>=new Date()).sort((a,b)=>startOf(a)-startOf(b));
const COURS_FIELDS=()=>[
  {k:"type",l:"Type",t:"select",o:[["cours","Cours"],["evenement","Événement du club"],["boxtraordinaire","Boxtraordinaire"]]},
  {k:"titre",l:"Titre",req:true,ph:"Éducation – débutants"},
  {k:"date",l:"Date",t:"date",req:true,half:true},{k:"niveau",l:"Niveau",t:"select",o:NIVEAUX,half:true},
  {k:"debut",l:"Début",t:"time",req:true,half:true},{k:"fin",l:"Fin",t:"time",half:true},
  {k:"moniteur",l:"Donné par",t:"select",o:[["","—"],...all("moniteurs").sort(byOrder).map(m=>[m.id,m.nom])],half:true},
  {k:"places",l:"Places (vide = illimité)",t:"number",min:0,half:true},
  {k:"lieu",l:"Lieu",d:"Terrain d’Ecublens"},
  {k:"description",l:"Description",t:"textarea",rows:3},
  {k:"annule",l:"Cours annulé",t:"check"},
];
function placesTxt(c){
  const n=inscritsDe(c.id).length;
  if(!isMember())return c.places?`${c.places} places`:"";
  return c.places?`${n}/${c.places} inscrit·es`:`${n} inscrit·e${n>1?"s":""}`;
}
function coursCard(c){
  const m=c.moniteur&&get("moniteurs",c.moniteur);const on=estInscrit(c.id);
  return`<button class="card cours ${c.annule?"annule":""} ${on?"inscrit":""}" data-cours="${esc(c.id)}">
    <span class="when"><b>${esc(fmtDay(c.date).split(" ").slice(1).join(" "))}</b><small>${esc(fmtDay(c.date).split(" ")[0])}</small><small>${esc(c.debut||"")}</small></span>
    <span class="grow"><b>${esc(c.titre)}</b>${c.annule?` <span class="badge bad">Annulé</span>`:""}${on?` <span class="badge good">${ico("check")} Inscrit·e</span>`:""}
      <span class="small meta">${[c.debut&&c.fin?c.debut+"–"+c.fin:"",c.niveau&&c.niveau!=="Tous"?c.niveau:"",placesTxt(c)].filter(Boolean).map(esc).join(" · ")}</span>
      ${m?`<span class="small who">${avatar(m.nom,m.photo,"xs")} ${esc(m.nom)}</span>`:""}</span>
    ${c.type==="evenement"?`<span class="badge info">Événement</span>`:c.type==="boxtraordinaire"?`<span class="badge info">Boxtraordinaire</span>`:""}</button>`;
}
VIEWS.agenda={t:"Agenda des cours",r(){
  const past=ARG==="passes";
  const list=past?all("cours").filter(c=>endOf(c)<new Date()).sort((a,b)=>startOf(b)-startOf(a)).slice(0,60):upcoming();
  const groups=new Map();list.forEach(c=>{const k=c.date.slice(0,7);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c)});
  const mine=ME?upcoming().filter(c=>estInscrit(c.id)):[];
  return`<div class="row between wrap"><div class="seg"><a href="#agenda" class="${past?"":"on"}">À venir</a><a href="#agenda/passes" class="${past?"on":""}">Passés</a></div>
      ${peutCreerAgenda()?addBtn("addCours",isCoursEdit()?"Nouveau cours":"Nouvel événement"):""}</div>
    ${!ME?`<div class="banner info">${ico("user")}<div><a href="#compte">Connecte-toi</a> pour t’inscrire aux cours et recevoir un rappel.</div></div>`:""}
    ${mine.length&&!past?`<div class="banner good">${ico("bell")}<div>Tu es inscrit·e à ${mine.length} cours à venir. ${rappelOn()&&notifSupported()&&Notification.permission==="granted"?"Rappel "+DELAIS.find(d=>d[0]===rappelMin())[1]+".":`<a href="#compte">Activer les rappels</a>`}</div></div>`:""}
    ${list.length?[...groups].map(([k,l])=>{const d=parseDay(k+"-01");return`<h2 class="h">${MOIS[d.getMonth()]} ${d.getFullYear()}</h2><div class="list">${l.map(coursCard).join("")}</div>`}).join("")
      :`<p class="muted">${past?"Aucun cours passé.":"Aucun cours annoncé pour le moment."}</p>`}`;
},bind(m){
  $$("[data-cours]",m).forEach(b=>b.onclick=()=>coursSheet(get("cours",b.dataset.cours)));
  const a=$("#addCours",m);if(a)a.onclick=()=>editCours({type:isCoursEdit()?"cours":"evenement",niveau:"Tous",lieu:"Terrain d’Ecublens"});
}};
function editCours(o){
  const fields=COURS_FIELDS();
  // Comité sans droit sur les cours : seulement les événements (pas le type « Cours »).
  if(!isCoursEdit())fields[0]={...fields[0],o:fields[0].o.filter(([k])=>k!=="cours")};if(!o.id)fields.push({k:"repeat",l:"Répéter chaque semaine (nombre de semaines en plus)",t:"number",min:0,d:0,h:"Par exemple 10 pour créer ce cours chaque semaine pendant 10 semaines de plus."});
  editSheet(o.id?((o.type||"cours")==="cours"?"Modifier le cours":"Modifier l’événement"):isCoursEdit()?"Nouveau cours":"Nouvel événement",fields,o,{wide:true,
    save:async v=>{
      const n=Math.min(52,Number(v.repeat)||0);delete v.repeat;
      const by=o.uid||ME.uid; // auteur du cours (un·e membre ne modifie que les siens)
      await put("cours",{...o,...v,uid:by});
      if(o.id)await prevenirInscrits(o,{...o,...v});
      for(let i=1;i<=n;i++){const d=parseDay(v.date);d.setDate(d.getDate()+7*i);await put("cours",{...v,uid:by,date:isoDay(d)})}
      toast(n?`${n+1} cours créés`:"Cours enregistré");
    },
    remove:o.id&&(async()=>{await prevenirInscrits(o,null);for(const i of inscritsDe(o.id))await del("inscriptions",i.id);await del("cours",o.id)})});
}
// Prévient chaque personne inscrite quand un rendez-vous de l'agenda change (date, heure, lieu, moniteur, annulation) ou est supprimé.
async function prevenirInscrits(avant,apres){
  const qui=[...new Set(inscritsDe(avant.id).map(i=>i.uid))].filter(u=>u&&u!==ME.uid);if(!qui.length)return;
  const quand=c=>`${fmtDayY(c.date)} à ${c.debut||""}${c.fin?"–"+c.fin:""}`,mon=id=>(get("moniteurs",id)||{}).nom||"—";
  const nom=avant.titre||"Rendez-vous";let titre,texte;
  if(!apres){titre=`Supprimé : ${nom}`;texte=`Le rendez-vous du ${quand(avant)} a été retiré de l’agenda.`}
  else if(apres.annule&&!avant.annule){titre=`Annulé : ${nom}`;texte=`Le rendez-vous du ${quand(avant)} est annulé.`}
  else{
    const ch=[];
    if(apres.annule===false&&avant.annule)ch.push("il n’est plus annulé");
    if(apres.date!==avant.date||apres.debut!==avant.debut||(apres.fin||"")!==(avant.fin||""))ch.push(`nouvelle date : ${quand(apres)} (au lieu du ${quand(avant)})`);
    if((apres.lieu||"")!==(avant.lieu||""))ch.push(`nouveau lieu : ${apres.lieu||"à préciser"}`);
    if((apres.moniteur||"")!==(avant.moniteur||""))ch.push(`donné par : ${mon(apres.moniteur)}`);
    if((apres.titre||"")!==(avant.titre||""))ch.push(`nouveau titre : ${apres.titre}`);
    if(!ch.length)return; // description, places… : pas de quoi déranger tout le monde
    titre=`Modifié : ${apres.titre||nom}`;texte=ch.join(" · ").replace(/^./,c=>c.toUpperCase())+".";
  }
  for(const u of qui)await notifier(u,titre,texte,"#agenda");
  toast(qui.length+" personne"+(qui.length>1?"s":"")+" inscrite"+(qui.length>1?"s":"")+" prévenue"+(qui.length>1?"s":""));
}
function coursSheet(c){
  if(!c)return;
  const m=c.moniteur&&get("moniteurs",c.moniteur);const ins=inscritsDe(c.id);const on=estInscrit(c.id);
  const full=c.places&&ins.length>=c.places&&!on;const passed=endOf(c)<new Date();
  let action="";
  if(!passed&&!c.annule){
    if(!ME)action=`<a class="btn primary" href="#compte">Se connecter pour s’inscrire</a>`;
    else if(!isMember())action=`<p class="small muted">Ton compte doit être validé par le comité avant de pouvoir t’inscrire.</p>`;
    else if(on)action=`<button class="btn" id="unreg">${ico("x")} Me désinscrire</button>`;
    else if(full)action=`<p class="small"><b>Complet.</b></p>`;
    else action=`<button class="btn primary" id="reg">${ico("check")} M’inscrire</button>`;
  }
  const s=sheet(c.titre,`
    ${c.annule?`<div class="banner bad">${ico("x")}<div>Ce cours est annulé.</div></div>`:""}
    <p><b>${esc(fmtDay(c.date))}</b>${c.debut?` · ${esc(c.debut)}${c.fin?"–"+esc(c.fin):""}`:""}<br>${esc(c.lieu||CLUB.adresse)}</p>
    ${c.niveau?`<p><span class="badge">${esc(c.niveau)}</span></p>`:""}
    ${c.description?`<p>${rich(c.description)}</p>`:""}
    ${m?`<a class="card row person sm" href="#moniteurs/${esc(m.id)}">${avatar(m.nom,m.photo)}<span class="grow"><b>${esc(m.nom)}</b><br><span class="small">${esc(m.titre||"Moniteur·rice")}</span></span>›</a>`:""}
    <div class="row wrap">${action}${!passed&&!c.annule?`<button class="btn" id="ics">${ico("cal")} Ajouter à mon agenda</button>`:""}${canEditCours(c)?`<button class="btn ghost" id="editC">${ico("edit")} Modifier</button>`:""}</div>
    ${isMember()?`<h3>Inscrit·es (${ins.length}${c.places?"/"+c.places:""})</h3>${ins.length?`<div class="chips">${ins.map(i=>`<span class="chip">${esc(i.pseudo)}${i.chien?" · 🐾 "+esc(i.chien):""}${canEditCours(c)&&i.uid!==ME.uid?` <button class="x" data-unins="${esc(i.id)}" aria-label="Retirer">×</button>`:""}</span>`).join("")}</div>`:`<p class="muted small">Personne pour l’instant.</p>`}`:""}`);
  const b=(id,f)=>{const e=$("#"+id,s);if(e)e.onclick=f};
  b("reg",async()=>{if(await sInscrire(c)){toast("Inscription enregistrée 🐾");coursSheet(get("cours",c.id));if(rappelOn()&&notifSupported()&&Notification.permission==="default")offerNotif()}});
  b("unreg",async()=>{await seDesinscrire(c);toast("Désinscription enregistrée");coursSheet(get("cours",c.id))});
  b("ics",()=>downloadIcs(c));
  b("editC",()=>editCours(c));
  $$("[data-unins]",s).forEach(x=>x.onclick=async()=>{await del("inscriptions",x.dataset.unins);coursSheet(get("cours",c.id))});
}
function offerNotif(){
  const s=sheet("Recevoir un rappel ?",`<p>L’app peut te prévenir ${esc(DELAIS.find(d=>d[0]===rappelMin())[1])} chaque cours où tu es inscrit·e.</p>
    <p class="small muted">Pour un rappel sûr même quand l’app est fermée, utilise aussi « Ajouter à mon agenda ».</p>
    <div class="row end"><button class="btn" data-close>Plus tard</button><button class="btn primary" id="okN">${ico("bell")} Activer</button></div>`);
  $("#okN",s).onclick=async()=>{closeSheet();await askNotif();render()};
}

/* ---------- Moniteurs ---------- */
const MON_FIELDS=[{k:"nom",l:"Prénom et nom",req:true},{k:"titre",l:"Titre",ph:"Monitrice, moniteur FAC…"},{k:"photo",l:"Photo",t:"photo"},
  {k:"bio",l:"Présentation",t:"textarea",rows:4},{k:"specialites",l:"Spécialités",ph:"Chiots, éducation, FAC, agility…"},
  {k:"brevets",l:"Formations et brevets",t:"textarea",rows:2},{k:"chiens",l:"Ses chiens",ph:"Nala, boxer bringée de 5 ans"},
  {k:"depuis",l:"Moniteur·rice au club depuis",ph:"2015"},{k:"tel",l:"Téléphone",t:"tel",half:true},{k:"email",l:"E-mail",t:"email",half:true},{k:"ordre",l:"Ordre d’affichage",t:"number"}];
VIEWS.moniteurs={t:"Moniteurs",r(){
  if(ARG&&get("moniteurs",ARG))return monFiche(get("moniteurs",ARG));
  return`<p class="lead">Les monitrices et moniteurs du club adaptent leurs techniques aux besoins de chaque chien et de chaque propriétaire.</p>
    ${canWrite("moniteurs")?`<div class="row end">${addBtn("addMon")}</div>`:""}
    <div class="people">${all("moniteurs").sort(byOrder).map(m=>`<a class="card person" href="#moniteurs/${esc(m.id)}">${avatar(m.nom,m.photo,"lg")}<span class="grow"><b>${esc(m.nom)}</b><span class="role">${esc(m.titre||"Moniteur·rice")}</span><span class="small">${esc(m.specialites||"")}</span></span>›</a>`).join("")}</div>
    <div class="card soft"><h3>Monitorat</h3><p>Questions sur les cours : ${mailLink("monitorat@boxerclubvaud.ch")}</p><div class="row wrap"><a class="btn sm" target="_blank" rel="noopener" href="${CLUB.fac}">${ico("ext")} Règlement FAC (PDF)</a><a class="btn sm" target="_blank" rel="noopener" href="${CLUB.facVideos}">${ico("ext")} Vidéos des exercices FAC</a></div></div>`;
},bind(m){
  const ed=o=>editSheet(o.id?"Modifier la fiche":"Nouveau moniteur",MON_FIELDS,o,{wide:true,save:v=>put("moniteurs",{...o,...v}),remove:o.id&&(()=>{del("moniteurs",o.id);location.hash="#moniteurs"})});
  const a=$("#addMon",m);if(a)a.onclick=()=>ed({});
  const e=$("#editMon",m);if(e)e.onclick=()=>ed(get("moniteurs",ARG));
  $$("[data-cours]",m).forEach(b=>b.onclick=()=>coursSheet(get("cours",b.dataset.cours)));
}};
function monFiche(m){
  const next=upcoming().filter(c=>c.moniteur===m.id).slice(0,5);
  const row=(l,v)=>v?`<div class="kv"><span>${l}</span><div>${rich(v)}</div></div>`:"";
  return`<a class="back" href="#moniteurs">← Tous les moniteurs</a>
    <div class="card profile">${avatar(m.nom,m.photo,"xl")}<div class="grow"><h2>${esc(m.nom)}</h2><span class="role">${esc(m.titre||"Moniteur·rice")}</span>
      <div class="row wrap">${m.tel?`<a class="btn sm" href="tel:${esc(m.tel.replace(/[^\d+]/g,""))}">${ico("phone")} Appeler</a>`:""}${m.email?`<a class="btn sm" href="mailto:${esc(m.email)}">${ico("mail")} Écrire</a>`:""}${canWrite("moniteurs")?`<button class="btn sm ghost" id="editMon">${ico("edit")} Modifier</button>`:""}</div></div></div>
    ${m.bio?`<p>${rich(m.bio)}</p>`:""}
    <div class="card">${row("Spécialités",m.specialites)}${row("Formations",m.brevets)}${row("Ses chiens",m.chiens)}${row("Au club depuis",m.depuis)}</div>
    <h2 class="h">Ses prochains cours</h2>${next.length?`<div class="list">${next.map(coursCard).join("")}</div>`:`<p class="muted">Aucun cours annoncé.</p>`}`;
}
