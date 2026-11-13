"use strict";
/* Espace membres : tchat, compte (connexion, inscription, fiche chien, rappels) et réglages du comité. */

/* ---------- Fil de discussion (tchat général, groupes, messages privés) ---------- */
function bindChatForm(m,formId,inId,draftKey,send){
  const f=$("#"+formId,m),inp=$("#"+inId,m);
  inp.value=ls(draftKey)||"";
  const grow=()=>{inp.style.height="auto";inp.style.height=Math.min(140,inp.scrollHeight)+"px"};
  inp.oninput=()=>{ls(draftKey,inp.value);grow()};
  inp.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&matchMedia("(pointer:fine)").matches){e.preventDefault();f.requestSubmit()}};
  f.onsubmit=e=>{e.preventDefault();const t=inp.value.trim();if(!t)return;send(t);inp.value="";ls(draftKey,null);grow();inp.focus()};
}
function fillChat(box,list,first,nameOf,canDel,onDel,empty){
  if(!box)return;
  const atBottom=first||box.scrollHeight-box.scrollTop-box.clientHeight<80;let prevDay="";
  box.innerHTML=list.length?list.map(x=>{
    const d=isoDay(new Date(x.at));const sep=d!==prevDay?`<div class="day">${esc(fmtDay(d))}</div>`:"";prevDay=d;
    const mine=x.uid===ME.uid,u=get("users",x.uid)||(mine?ME:null),nom=x.pseudo||(u&&u.pseudo)||nameOf(x),pre=u&&u.prenom;
    // Pseudo et prénom de la personne qui écrit, sur chaque message (y compris les siens).
    return`${sep}<div class="msg ${mine?"me":""}">${mine?"":avatar(nom,u&&u.photo,"sm")}<div class="bub"><b>${esc(nom)}${pre?` <span class="pre">· ${esc(pre)}</span>`:""}</b><p>${rich(x.texte)}</p><small>${esc(fmtAgo(x.at))}${canDel(x)?` · <button class="lnk" data-delmsg="${esc(x.id)}">supprimer</button>`:""}</small></div></div>`;
  }).join(""):`<p class="muted center">${esc(empty)}</p>`;
  $$("[data-delmsg]",box).forEach(b=>b.onclick=async()=>{if(await confirmBox("Supprimer ce message ?"))onDel(list.find(x=>x.id===b.dataset.delmsg))});
  if(atBottom)box.scrollTop=box.scrollHeight;
}

/* ---------- Tchat : fil général et groupes de discussion ---------- */
const byNom=(a,b)=>String(a.nom).localeCompare(b.nom);
const tchatForme=()=>{const g=ARG&&get("groupes",ARG);return[isMember(),ARG,isMember()&&all("groupes").filter(dansGroupe).map(x=>x.id===ARG?0:nonLusCanal(x.id)).join()+(ARG?nonLusCanal(""):0),!!g,g&&dansGroupe(g),all("groupes").filter(dansGroupe).map(x=>x.id+x.nom).join(),all("groupes").length].join("|")};
VIEWS.tchat={t:"Tchat des membres",r(){
  const lock=membersOnly("Le tchat");if(lock)return lock;
  const g=ARG&&get("groupes",ARG);
  const mine=all("groupes").filter(dansGroupe).sort(byNom),autres=all("groupes").filter(g=>!dansGroupe(g)&&!g.prive).length;
  const bar=`<div class="row between wrap chat-top"><div class="seg">${[["","Général",!g],...mine.map(x=>[x.id,x.nom,g&&g.id===x.id])].map(([id,l,on])=>`<a href="#tchat${id?"/"+esc(id):""}" class="${on?"on":""}">${esc(l)}${on?"":dotNL(nonLusCanal(id))}</a>`).join("")}</div>
    <button class="btn sm" id="grpBtn">${ico("group")} Groupes${autres?` <em class="pill">${autres}</em>`:""}</button></div>`;
  if(ARG&&!g)return bar+`<p class="muted">Ce groupe n’existe plus.</p>`;
  if(g&&!dansGroupe(g)&&g.prive)return bar+`<p class="muted">${ico("lock")} Ce groupe est privé : il faut y être invité·e par le comité.</p>`;
  if(g&&!dansGroupe(g))return bar+`<div class="card lock">${ico("group")}<h3>${esc(g.nom)}</h3>${g.desc?`<p>${rich(g.desc)}</p>`:""}<p class="small muted">${(g.membres||[]).length} membre(s)</p><button class="btn primary" id="joinG">Rejoindre le groupe</button></div>`;
  return bar+`${g?`<p class="small muted grp-desc">${g.desc?esc(g.desc)+" · ":""}${(g.membres||[]).length} membre(s) · <button class="lnk" id="grpInfo">voir le groupe</button></p>`:""}
    <div class="chat${g?" grp":""}"><div id="chatList" class="chat-list" aria-live="polite"></div>
    <form id="chatForm" class="chat-form"><textarea id="chatIn" rows="1" maxlength="2000" placeholder="Écris un message${g?" au groupe":""}…" aria-label="Message"></textarea><button class="btn primary" aria-label="Envoyer">${ico("send")}</button></form>
    <p class="small muted center">${g?"Visible uniquement par les membres du groupe.":"Visible uniquement par les membres et adhérent·es validé·es."} Restons bienveillants 🐾</p></div>`;
},bind(m){
  const v=$(".view",m);if(v)v.dataset.shape=tchatForme();
  if(!isMember())return;
  const g=ARG&&get("groupes",ARG);
  $("#grpBtn",m).onclick=groupesSheet;
  const j=$("#joinG",m);if(j)j.onclick=()=>rejoindreGroupe(g,true);
  const gi=$("#grpInfo",m);if(gi)gi.onclick=()=>groupeSheet(g);
  if(!$("#chatForm",m))return;
  if(g&&MODE==="cloud")watchGroupe(g.id);
  bindChatForm(m,"chatForm","chatIn","bcv-chat-draft"+(g?"-"+g.id:""),t=>g?sendGroupe(g.id,t):sendMessage(t));
  this.fill(m,true);
},update(m){
  const v=$(".view",m);
  if(!v||v.dataset.shape!==tchatForme()){v.innerHTML=this.r();this.bind(m);return}
  if(isMember())this.fill(m,false);
},fill(m,first){
  const g=ARG&&get("groupes",ARG);
  const list=(g?all("gmsgs").filter(x=>x.g===g.id):all("messages")).sort((a,b)=>String(a.at).localeCompare(b.at));
  // Fil affiché : ses messages sont lus.
  if(document.visibilityState==="visible")marquerVu(g?g.id:"general",list.length?list[list.length-1].at:"");
  fillChat($("#chatList",m),list,first,()=>"",x=>x.uid===ME.uid||isComite(),x=>g?delGroupeMsg(x):del("messages",x.id),g?"Aucun message dans ce groupe. Lance la discussion !":"Aucun message pour l’instant. Lance la discussion !");
}};
function groupesSheet(){
  const l=all("groupes").filter(g=>groupeVisible(g)||isAdmin()).sort((a,b)=>dansGroupe(b)-dansGroupe(a)||byNom(a,b));
  const s=sheet("Groupes de discussion",`<p class="small muted">Rejoins un groupe pour lire et écrire dans son fil, comme un groupe WhatsApp. Le comité crée les groupes. ${ico("lock")} Un groupe privé est caché : seules les personnes invitées le voient.</p>
    ${isComite()?`<div class="row end">${addBtn("newG","Nouveau groupe")}</div>`:""}
    ${l.length?`<div class="list">${l.map(g=>`<div class="card grp"><div class="grp-h">${ico(g.prive?"lock":"group")}<div class="grow"><b>${esc(g.nom)}</b>${g.prive?` <span class="badge">Privé</span>`:""}
        ${g.desc?`<p class="small">${esc(g.desc)}</p>`:""}<span class="small muted">${(g.membres||[]).length} membre(s)${g.prive&&!dansGroupe(g)?" · tu n’es pas dans ce groupe":""}</span></div></div>
      <div class="grp-a">${dansGroupe(g)?`<a class="btn sm primary" href="#tchat/${esc(g.id)}">Ouvrir</a><button class="btn sm" data-quit="${esc(g.id)}">Quitter</button>`:g.prive?"":`<button class="btn sm primary" data-join="${esc(g.id)}">Rejoindre</button>`}
      ${gereGroupe(g)?editBtn("data-edg",g.id):""}</div></div>`).join("")}</div>`:`<p class="muted">Aucun groupe pour l’instant.</p>`}`);
  const b=$("#newG",s);if(b)b.onclick=()=>editGroupe({prive:false});
  $$("[data-join]",s).forEach(x=>x.onclick=async()=>{const g=get("groupes",x.dataset.join);await rejoindreGroupe(g,true);closeSheet();location.hash="#tchat/"+g.id;toast("Bienvenue dans « "+g.nom+" »")});
  $$("[data-quit]",s).forEach(x=>x.onclick=async()=>{const g=get("groupes",x.dataset.quit);await rejoindreGroupe(g,false);if(ARG===g.id)location.hash="#tchat";groupesSheet()});
  $$("[data-edg]",s).forEach(x=>x.onclick=()=>editGroupe(get("groupes",x.dataset.edg)));
}
function groupeSheet(g){
  const mem=(g.membres||[]).map(id=>get("users",id)).filter(Boolean).sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const s=sheet(g.nom,`${g.prive?`<p class="small muted">${ico("lock")} Groupe privé : caché pour les personnes qui n’y sont pas invitées.</p>`:""}${g.desc?`<p>${rich(g.desc)}</p>`:""}<h3>Membres (${mem.length})</h3><div class="chips">${mem.map(u=>`<span class="chip">${avatar(u.pseudo,u.photo,"xs")} ${esc(u.pseudo)}</span>`).join("")}</div>
    <div class="row wrap end">${gereGroupe(g)?`<button class="btn ghost" id="edG">${ico("edit")} Modifier</button><button class="btn" id="invG">${ico("group")} Membres</button>`:""}<button class="btn" id="quitG">Quitter le groupe</button></div>`);
  $("#quitG",s).onclick=async()=>{closeSheet();await rejoindreGroupe(g,false);location.hash="#tchat"};
  const e=$("#edG",s);if(e)e.onclick=()=>editGroupe(g);
  const i=$("#invG",s);if(i)i.onclick=()=>membresGroupe(g);
}
// Choisir les membres d'un groupe (invitations) : cases à cocher, avec un raccourci « tout le comité ».
function membresGroupe(g){
  const us=all("users").filter(u=>MEMBERS.includes(u.role)).sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const cur=new Set(g.membres||[]);
  const s=sheet("Membres de « "+g.nom+" »",`<p class="small muted">${g.prive?"Coche les personnes invitées : elles seules verront ce groupe. ":""}Les personnes ajoutées reçoivent une notification.</p>
    <div class="row wrap"><button type="button" class="btn sm" id="mgCom">${ico("shield")} Tout le comité</button><button type="button" class="btn sm ghost" id="mgNone">Personne</button></div>
    <div class="list mg">${us.map(u=>`<label class="chk mg-u"><input type="checkbox" value="${esc(u.id)}"${cur.has(u.id)?" checked":""}${u.id===ME.uid?" disabled":""}> ${avatar(u.pseudo,u.photo,"xs")} <span class="grow">${esc(u.pseudo)}${u.prenom?` <span class="muted">${esc(u.prenom)}</span>`:""}</span> <span class="small muted">${esc((ROLES[u.role]||{}).l||"")}</span></label>`).join("")}</div>
    <div class="row end"><button class="btn primary" id="mgOk">Enregistrer</button></div>`,{wide:true});
  const boxes=$$(".mg input",s);
  $("#mgCom",s).onclick=()=>boxes.forEach(b=>{if(COMITE.includes((get("users",b.value)||{}).role))b.checked=true});
  $("#mgNone",s).onclick=()=>boxes.forEach(b=>{if(!b.disabled)b.checked=false});
  $("#mgOk",s).onclick=async()=>{const m=boxes.filter(b=>b.checked||b.disabled&&cur.has(b.value)).map(b=>b.value);
    if(g.prive&&!m.includes(ME.uid)&&!isAdmin())m.push(ME.uid);
    try{await setMembresGroupe(g,m);closeSheet();toast("Membres du groupe enregistrés")}catch(e){toast(e.message||"Enregistrement impossible","bad")}};
}
function editGroupe(o){
  editSheet(o.id?"Modifier le groupe":"Nouveau groupe",[{k:"nom",l:"Nom du groupe",req:true,ph:"Balades du dimanche, Concours FAC…"},{k:"desc",l:"Description",t:"textarea",rows:2},
    {k:"prive",l:"Groupe privé : caché, seulement sur invitation",t:"check"}],o,{
    save:async v=>{const membres=[...new Set([...(o.membres||[]),...(v.prive&&!o.id||!o.membres?[ME.uid]:[])])];
      const n=await put("groupes",{...o,...v,prive:!!v.prive,membres,uid:o.uid||ME.uid});
      if(v.prive&&!o.prive)setTimeout(()=>{membresGroupe(get("groupes",n.id)||n);toast("Groupe privé : choisis les personnes invitées")},80);
      else if(!o.id)setTimeout(()=>location.hash="#tchat/"+n.id,50)},
    remove:o.id&&(async()=>{closeSheet();await del("groupes",o.id);location.hash="#tchat"})});
}

/* ---------- Compte ---------- */
const DOG_FIELDS=[{k:"nom",l:"Nom du chien",req:true,half:true},{k:"sexe",l:"Sexe",t:"select",o:[["M","Mâle"],["F","Femelle"]],half:true},
  {k:"naissance",l:"Date de naissance",t:"date",half:true,h:"L’âge se calcule tout seul."},{k:"race",l:"Race",half:true,d:"Boxer"},
  {k:"photo",l:"Photo",t:"photo"},{k:"remarque",l:"Commentaire",t:"textarea",rows:2,ph:"Castré, stérilisée, allergies, caractère…"},
  {k:"vaccin",l:"Vacciné·e (vaccins à jour) — visible seulement par toi et le comité",t:"check"},{k:"vaccinDate",l:"Date du dernier rappel de vaccin",t:"date",half:true},
  {k:"carnet",l:"Carnet de vaccination (photo ou PDF)",t:"files",h:"Visible seulement par toi et le comité."}];
VIEWS.compte={t:"Mon compte",r(){
  if(!ME)return authHTML();
  if(ME._noProfile)return`<div class="card narrow"><h2>Terminer l’inscription</h2><p>Ton compte <b>${esc(ME.email)}</b> existe, mais il lui manque un pseudo.</p>${regFields(false)}</div>`;
  const mine=upcoming().filter(c=>estInscrit(c.id));
  const perm=notifSupported()?Notification.permission:"unsupported";
  return`<div class="card profile">${avatar(ME.pseudo,ME.photo,"xl")}<div class="grow"><h2>${esc(ME.pseudo)}</h2><span class="badge r-${esc(ME.role)}">${esc(ROLES[ME.role].l)}</span>
      ${ME.prenom?`<p class="small">${esc(ME.prenom)}</p>`:""}<div class="row wrap"><button class="btn sm" id="editMe">${ico("edit")} Modifier mon profil</button><button class="btn sm ghost" id="out">${ico("out")} Se déconnecter</button></div></div></div>
    ${ME.role==="attente"?`<div class="banner info">${ico("clock")}<div>Ton compte attend la validation du comité. Tu pourras ensuite t’inscrire aux cours et utiliser le tchat.</div></div>`:""}
    <h2 class="h">Mon adhésion</h2>
    <div class="card"><p>${[ME.bcv?"Adhérent·e Boxer Club Vaud":"",ME.bcs?"Adhérent·e Boxer Club Suisse":""].filter(Boolean).join(" · ")||`<span class="muted">Adhésion pas encore indiquée (Modifier mon profil).</span>`}</p>
      ${S.cotisations.has(ME.uid)||isComite()?`<p class="small">Cotisation ${anneeCotis()} : ${cotisPayee(ME.uid)?`<b>payée</b>${cotisDate(ME.uid)?" le "+esc(fmtDayY(cotisDate(ME.uid))):""} ✔`:"pas encore enregistrée par le comité."}</p>`:""}
      ${qrSrc()?`<button class="btn sm" data-qr>${ico("qr")} QR code pour payer mon adhésion</button>`:""}</div>
    <div class="row between"><h2 class="h">Mes chiens</h2><button class="btn sm" id="addDog">${ico("plus")} Ajouter un chien</button></div>
    ${(ME.chiens||[]).length?`<div class="dogs edit">${ME.chiens.map((c,i)=>`<button class="card dog" data-dog="${i}">${avatar(c.nom,c.photo,"lg")}<div class="grow"><b>${esc(c.nom)}</b>
      <div class="small">${[SEXES[c.sexe],c.race,c.naissance?ageFrom(c.naissance):""].filter(Boolean).map(esc).join(" · ")}</div>${c.remarque?`<p class="small">${esc(c.remarque)}</p>`:""}${vaccinHTML(c,ME.uid)}</div>${ico("edit")}</button>`).join("")}</div>`
      :`<p class="muted">Présente ton compagnon : nom, sexe, âge, photo…</p>`}
    <h2 class="h">Rappels avant les cours</h2>
    <div class="card">
      ${perm==="unsupported"?`<p class="small">Ce navigateur ne gère pas les notifications.${isIOS()?" Sur iPhone, installe d’abord l’app sur l’écran d’accueil (bouton Partager › Sur l’écran d’accueil).":""}</p>`
        :perm==="granted"?`<label class="chk"><input type="checkbox" id="rOn"${rappelOn()?" checked":""}> Me notifier avant mes cours</label>`
        :`<p class="small">Autorise les notifications pour être prévenu·e avant tes cours.</p><button class="btn primary sm" id="askN">${ico("bell")} Activer les notifications</button>`}
      <div class="f"><label for="rDel">Quand ?</label><select id="rDel">${DELAIS.map(([v,l])=>`<option value="${v}"${v===rappelMin()?" selected":""}>${l}</option>`).join("")}</select></div>
      <p class="small muted">La notification arrive quand l’app est ouverte ou en arrière-plan. Pour un rappel garanti même app fermée, utilise « Ajouter à mon agenda » sur chaque cours : ton téléphone sonnera au bon moment.</p>
    </div>
    <h2 class="h">Mes prochains cours</h2>
    ${mine.length?`<div class="list">${mine.map(coursCard).join("")}</div>`:`<p class="muted">Aucune inscription. <a href="#agenda">Voir l’agenda</a></p>`}
    ${MODE==="local"?`<h2 class="h">Mode essai</h2><div class="card soft"><p class="small">L’app n’est pas encore reliée à sa base de données : tout reste dans ce navigateur. Choisis un rôle pour voir l’app comme…</p>
      <div class="seg wrap">${["visiteur",...Object.keys(ROLES)].map(r=>`<button data-role="${r}" class="${(ME?ME.role:"visiteur")===r?"on":""}">${r==="visiteur"?"Visiteur":ROLES[r].l}</button>`).join("")}</div>
      <button class="btn sm ghost" id="resetDemo">Remettre les exemples à zéro</button></div>`:""}
    ${installBtn()}`;
},bind(m){
  if(!ME||ME._noProfile){bindAuth(m);return}
  const b=(id,f)=>{const e=$("#"+id,m);if(e)e.onclick=f};
  b("out",()=>logout().then(()=>{location.hash="#accueil";toast("À bientôt !")}));
  b("editMe",()=>editSheet("Mon profil",[{k:"pseudo",l:"Pseudo",req:true},{k:"prenom",l:"Prénom (visible par les membres)"},
    {k:"tel",l:"Téléphone",t:"tel",h:"Visible seulement par le comité, comme ton e-mail."},{k:"photo",l:"Ma photo",t:"photo"},
    {k:"bcv",l:"Adhérent·e Boxer Club Vaud",t:"check"},{k:"bcs",l:"Adhérent·e Boxer Club Suisse",t:"check"}],{...ME,tel:priveDe(ME.uid).tel||"",nom:ME.pseudo},{save:v=>updateProfile(v)}));
  bindQR(m);
  const saveDogs=l=>updateProfile({pseudo:ME.pseudo,prenom:ME.prenom,photo:ME.photo,chiens:l});
  b("addDog",()=>editSheet("Nouveau chien",DOG_FIELDS,{sexe:"M"},{save:v=>saveDogs([...(ME.chiens||[]),v])}));
  $$("[data-dog]",m).forEach(x=>x.onclick=()=>{const i=+x.dataset.dog;const d=ME.chiens[i];
    editSheet("Modifier "+d.nom,DOG_FIELDS,{...d,id:"x"},{save:v=>{const l=[...ME.chiens];l[i]=v;return saveDogs(l)},remove:()=>saveDogs(ME.chiens.filter((_,j)=>j!==i))})});
  b("askN",async()=>{await askNotif();render()});
  const on=$("#rOn",m);if(on)on.onchange=()=>ls(RAPPEL_KEY+"-on",on.checked?"1":"0");
  $("#rDel",m).onchange=e=>{ls(RAPPEL_KEY,e.target.value);toast("Rappel enregistré")};
  $$("[data-role]",m).forEach(x=>x.onclick=()=>demoRole(x.dataset.role));
  b("resetDemo",async()=>{if(await confirmBox("Effacer les données d’essai et remettre les exemples ?","Remettre à zéro")){ls(LSKEY,null);location.reload()}});
}};
function regFields(full=true){
  return`<form id="regForm" class="form">
    <div class="f"><label for="rPseudo">Pseudo de connexion</label><input id="rPseudo" required minlength="3" maxlength="20" autocomplete="username" placeholder="ex. Rocky_et_moi"><small>Visible par les membres. Lettres, chiffres, point, tiret ou souligné.</small></div>
    ${full?`<div class="f"><label for="rMail">E-mail</label><input id="rMail" type="email" required autocomplete="email"><small>Visible seulement par le comité ; sert aussi à retrouver ton mot de passe.</small></div>
    <div class="f"><label for="rPass">Mot de passe</label><input id="rPass" type="password" required minlength="6" autocomplete="new-password"></div>`:""}
    <div class="f"><label for="rPrenom">Prénom (facultatif)</label><input id="rPrenom" autocomplete="given-name"></div>
    <div class="f"><label for="rTel">Téléphone (facultatif)</label><input id="rTel" type="tel" autocomplete="tel"><small>Visible seulement par le comité.</small></div>
    <fieldset class="dogset adh-set"><legend>Adhésion</legend>
      <label class="chk"><input type="checkbox" id="rBcv"> Adhérent·e Boxer Club Vaud</label>
      <label class="chk"><input type="checkbox" id="rBcs"> Adhérent·e Boxer Club Suisse</label></fieldset>
    <fieldset class="dogset"><legend>🐾 Ton chien (facultatif)</legend>
      <div class="f half"><label for="dNom">Nom</label><input id="dNom"></div>
      <div class="f half"><label for="dSexe">Sexe</label><select id="dSexe"><option value="M">Mâle</option><option value="F">Femelle</option></select></div>
      <div class="f half"><label for="dNaiss">Date de naissance</label><input id="dNaiss" type="date"></div>
      <div class="f half"><label for="dRace">Race</label><input id="dRace" value="Boxer"></div>
      <div class="f"><label>Photo</label><div class="photo-in"><span class="av lg" id="dPrev">🐾</span><label class="btn sm">Choisir une photo<input type="file" accept="image/*" hidden id="dPhoto"></label></div></div>
      <div class="f"><label for="dRem">Commentaire</label><textarea id="dRem" rows="2" placeholder="Castré, stérilisée, caractère…"></textarea></div>
      <label class="chk"><input type="checkbox" id="dVacc"> Vacciné·e (vaccins à jour)</label>
      <small>Tu pourras ajouter d’autres chiens et joindre le carnet de vaccination ensuite dans ton profil.</small></fieldset>
    <p id="rErr" class="err" hidden></p>
    <button class="btn primary block">Créer mon compte</button>
    <p class="small muted">Le comité valide ensuite ton compte pour ouvrir le tchat et les inscriptions aux cours.</p></form>`;
}
function authHTML(){
  const reg=ARG==="inscription";
  return`<div class="card narrow">
    <picture><source srcset="img/logo-blanc.png" media="(prefers-color-scheme: dark)"><img class="auth-logo" alt="Boxer Club Vaud" src="img/logo-noir.png"></picture>
    <div class="seg"><a href="#compte" class="${reg?"":"on"}">Se connecter</a><a href="#compte/inscription" class="${reg?"on":""}">Créer un compte</a></div>
    ${reg?regFields():`<form id="logForm" class="form">
      <div class="f"><label for="lId">Pseudo ou e-mail</label><input id="lId" required autocomplete="username"></div>
      <div class="f"><label for="lPass">Mot de passe</label><input id="lPass" type="password" required autocomplete="current-password"></div>
      <p id="lErr" class="err" hidden></p>
      <button class="btn primary block">Se connecter</button>
      <button type="button" class="btn ghost sm" id="forgot">Mot de passe oublié</button>
      <p class="small center">Pas encore de compte ? <a href="#compte/inscription">Créer un compte</a></p></form>`}
    ${MODE==="local"?`<p class="small muted">Mode essai : aucun mot de passe n’est vérifié.</p>`:""}</div>`;
}
function bindAuth(m){
  const lf=$("#logForm",m);
  if(lf){
    lf.onsubmit=async e=>{e.preventDefault();const err=$("#lErr",m);err.hidden=true;
      if(MODE==="local"){demoRole("membre");return}
      try{await login($("#lId",m).value,$("#lPass",m).value);location.hash="#accueil"}catch(x){err.textContent=x.message;err.hidden=false}};
    $("#forgot",m).onclick=async()=>{const id=$("#lId",m).value.trim(),err=$("#lErr",m);
      if(!id){err.textContent="Écris d’abord ton pseudo ou ton e-mail.";err.hidden=false;return}
      if(MODE==="cloud")await resetPassword(id);
      err.textContent="Si ce compte existe, un e-mail pour choisir un nouveau mot de passe vient d’être envoyé.";err.className="ok";err.hidden=false};
  }
  const rf=$("#regForm",m);if(!rf)return;
  let photo="";
  $("#dPhoto",m).onchange=async e=>{const f=e.target.files[0];if(!f)return;photo=await shrinkImage(f);$("#dPrev",m).outerHTML=`<img class="av lg" id="dPrev" alt="" src="${photo}">`};
  rf.onsubmit=async e=>{e.preventDefault();const err=$("#rErr",m);err.hidden=true;const btn=$("button.primary",rf);btn.disabled=true;
    const v=id=>{const x=$("#"+id,m);return x?x.value.trim():""};
    const ck=id=>{const x=$("#"+id,m);return!!(x&&x.checked)};const extra={tel:v("rTel"),bcv:ck("rBcv"),bcs:ck("rBcs")};
    const chiens=v("dNom")?[{nom:v("dNom"),sexe:v("dSexe"),naissance:v("dNaiss"),race:v("dRace"),remarque:v("dRem"),vaccin:ck("dVacc"),photo}]:[];
    try{
      if(ME&&ME._noProfile){if(!PSEUDO_RE.test(v("rPseudo")))throw new Error("Pseudo invalide : 3 à 20 caractères.");if(await DB.doc("pseudos/"+pseudoKey(v("rPseudo"))).get().then(s=>s.exists))throw new Error("Ce pseudo est déjà pris.");await finishProfile(AUTH.currentUser,{pseudo:v("rPseudo"),prenom:v("rPrenom"),chiens,...extra})}
      else await register({pseudo:v("rPseudo"),email:v("rMail"),pass:$("#rPass",m).value,prenom:v("rPrenom"),chiens,...extra});
      toast(ME.role==="admin"&&MODE==="cloud"?"Bienvenue ! Premier compte : tu es administrateur·rice.":"Compte créé 🐾");location.hash="#compte";
    }catch(x){err.textContent=x.message;err.hidden=false}finally{btn.disabled=false}};
}

/* ---------- Réglages (comité) ---------- */
VIEWS.reglages={t:"Réglages",r(){
  if(!isComite())return comiteOnly();
  const users=all("users").sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const wait=users.filter(u=>u.role==="attente");
  const empty=["comite","moniteurs","urgences","elevages","wiki"].filter(c=>!S[c].size);
  return`${isAdhEdit()?`<h2 class="h">Comptes à valider${wait.length?` <em class="pill">${wait.length}</em>`:""}</h2>
    ${wait.length?`<div class="list">${wait.map(u=>`<div class="card row wrap">${avatar(u.pseudo,u.photo)}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?" · "+esc(u.prenom):""}<br><span class="small">${u.chien?"🐾 "+esc(u.chien)+" · ":""}inscrit·e ${esc(fmtAgo(u.at||u.createdAt||new Date().toISOString()))}</span></span>
      <button class="btn sm primary" data-ok="${esc(u.id)}" data-r="adherent">Valider (adhérent·e)</button><button class="btn sm ghost" data-see="${esc(u.id)}">Fiche</button><button class="btn sm danger ghost" data-no="${esc(u.id)}">Refuser</button></div>`).join("")}</div>`:`<p class="muted">Aucun compte en attente.</p>`}
    <h2 class="h">Tous les comptes (${users.length})</h2>
    <div class="list">${users.filter(u=>u.role!=="attente").map(u=>`<div class="card row wrap">${avatar(u.pseudo,u.photo,"sm")}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?" · "+esc(u.prenom):""}</span>
      ${roleSelect(u)}
      ${u.id!==ME.uid&&canGiveRole(u.role,"attente")?`<button class="iconbtn" data-no="${esc(u.id)}" aria-label="Retirer">${ico("trash")}</button>`:""}</div>`).join("")}</div>`:""}
    <details class="card"><summary>Ce que permet chaque rôle</summary>${Object.entries(ROLES).filter(([k,r])=>!r.old).map(([k,r])=>`<p class="small"><b>${r.l}</b> : ${r.d}</p>`).join("")}</details>
    <h2 class="h">QR code de paiement de l’adhésion</h2>
    <div class="card row wrap qr-set">${qrSrc()?`<img class="qr-prev" alt="QR code de paiement" src="${qrSrc()}">`:`<span class="small muted grow">Pas encore de QR code. Ajoute l’image du QR code de paiement : un bouton « Payer mon adhésion » apparaît alors en haut de la liste des adhérents, dans Mon compte et dans Soutenir.</span>`}
      <label class="btn sm">${ico("qr")} ${CFG.qrAdhesion?"Remplacer":"Ajouter"} l’image<input type="file" accept="image/*" hidden id="qrIn"></label>${CFG.qrAdhesion?`<button class="btn sm ghost" id="qrDel">Retirer</button>`:""}</div>
    <h2 class="h">Textes de l’app</h2>
    <form id="cfgForm" class="form card">
      <div class="f"><label for="cAnn">Annonce en haut de l’accueil (vide = aucune)</label><textarea id="cAnn" rows="2" placeholder="Ex. : pas de cours samedi 12, fête de la cabane !">${esc(CFG.annonce)}</textarea></div>
      <div class="f"><label for="cAcc">Présentation du club</label><textarea id="cAcc" rows="4">${esc(CFG.accueil)}</textarea></div>
      <div class="f"><label for="cPv">Première visite</label><textarea id="cPv" rows="2">${esc(CFG.premiereVisite)}</textarea></div>
      <div class="f"><label for="cTel">Numéro du bouton « Contacter le club »</label><input id="cTel" type="tel" value="${esc(CFG.telClub||"")}"></div>
      <div class="f"><label for="cCot">Cotisation annuelle Boxer Club Vaud (CHF)</label><input id="cCot" type="number" min="0" value="${esc(montantCotis())}"><small>Sert au calcul des cotisations dans la comptabilité.</small></div>
      <div class="f"><label for="cAx">Plan d’accès : bon à savoir</label><textarea id="cAx" rows="3">${esc(CFG.acces)}</textarea></div>
      <div class="f"><label for="cDet">Boxer en détresse</label><textarea id="cDet" rows="4">${esc(CFG.detresse)}</textarea></div>
      <div class="row end full"><button class="btn primary">Enregistrer les textes</button></div></form>
    ${MODE==="cloud"&&empty.length?`<div class="card soft"><h3>Contenu de départ</h3><p class="small">Copier le contenu repris de boxerclubvaud.ch (comité, moniteurs, contacts d’urgence, élevages, wiki) dans les rubriques encore vides : ${empty.join(", ")}.</p><button class="btn primary" id="seed">Importer le contenu de départ</button></div>`:""}
    <p class="small muted">Retirer un compte efface sa fiche et libère son pseudo. Pour bloquer aussi sa connexion : Console Firebase › Authentication › désactiver l’utilisateur.</p>`;
},bind(m){
  $$("[data-ok]",m).forEach(b=>b.onclick=()=>{setRole(b.dataset.ok,b.dataset.r);toast("Compte validé")});
  $$("[data-see]",m).forEach(b=>b.onclick=()=>userSheet(get("users",b.dataset.see)));
  $$("[data-no]",m).forEach(b=>b.onclick=async()=>{const u=get("users",b.dataset.no);if(await confirmBox(`Retirer le compte de ${u.pseudo} ?`,"Retirer"))removeUser(u)});
  bindRoleSelects(m);
  $("#cfgForm",m).onsubmit=e=>{e.preventDefault();putCfg({annonce:$("#cAnn",m).value.trim(),accueil:$("#cAcc",m).value.trim(),premiereVisite:$("#cPv",m).value.trim(),telClub:$("#cTel",m).value.trim(),cotisation:Number($("#cCot",m).value)||montantCotis(),acces:$("#cAx",m).value.trim(),detresse:$("#cDet",m).value.trim()});toast("Textes enregistrés")};
  const s=$("#seed",m);if(s)s.onclick=async()=>{s.disabled=true;await importSeed();toast("Contenu importé")};
  // QR code : image gardée nette (1000 px), enregistrée avec les réglages du club.
  $("#qrIn",m).onchange=async e=>{const f=e.target.files[0];if(!f)return;try{await putCfg({qrAdhesion:await shrinkImage(f,1000,.92)});toast("QR code enregistré");rerender()}catch(x){toast("Image illisible","bad")}};
  const qd=$("#qrDel",m);if(qd)qd.onclick=async()=>{if(await confirmBox("Retirer le QR code de paiement ?","Retirer")){await putCfg({qrAdhesion:""});rerender()}};
}};
