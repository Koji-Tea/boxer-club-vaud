"use strict";
/* Espace membres : tchat, compte (connexion, inscription, fiche chien, rappels) et réglages du comité. */

/* ---------- Tchat ---------- */
VIEWS.tchat={t:"Tchat des membres",r(){
  const lock=membersOnly("Le tchat");if(lock)return lock;
  return`<div class="chat"><div id="chatList" class="chat-list" aria-live="polite"></div>
    <form id="chatForm" class="chat-form"><textarea id="chatIn" rows="1" maxlength="2000" placeholder="Écris un message…" aria-label="Message"></textarea><button class="btn primary" aria-label="Envoyer">${ico("send")}</button></form>
    <p class="small muted center">Visible uniquement par les membres et adhérent·es validé·es. Restons bienveillants 🐾</p></div>`;
},bind(m){
  if(!isMember())return;
  const f=$("#chatForm",m),inp=$("#chatIn",m);
  inp.value=ls("bcv-chat-draft")||"";
  const grow=()=>{inp.style.height="auto";inp.style.height=Math.min(140,inp.scrollHeight)+"px"};
  inp.oninput=()=>{ls("bcv-chat-draft",inp.value);grow()};
  inp.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&matchMedia("(pointer:fine)").matches){e.preventDefault();f.requestSubmit()}};
  f.onsubmit=e=>{e.preventDefault();const t=inp.value.trim();if(!t)return;sendMessage(t);inp.value="";ls("bcv-chat-draft",null);grow();inp.focus()};
  this.fill(m,true);
},update(m){
  if(!!$("#chatList",m)!==isMember()){$(".view",m).innerHTML=this.r();this.bind(m);return}
  if(isMember())this.fill(m,false);
},fill(m,first){
  const box=$("#chatList",m);const atBottom=first||box.scrollHeight-box.scrollTop-box.clientHeight<80;
  const list=all("messages").sort((a,b)=>String(a.at).localeCompare(b.at));let prevDay="";
  box.innerHTML=list.length?list.map(x=>{
    const d=isoDay(new Date(x.at));const sep=d!==prevDay?`<div class="day">${esc(fmtDay(d))}</div>`:"";prevDay=d;
    const mine=x.uid===ME.uid;const u=get("users",x.uid);
    return`${sep}<div class="msg ${mine?"me":""}">${mine?"":avatar(x.pseudo,u&&u.photo,"sm")}<div class="bub">${mine?"":`<b>${esc(x.pseudo)}</b>`}<p>${rich(x.texte)}</p><small>${esc(fmtAgo(x.at))}${mine||isBoard()?` · <button class="lnk" data-delmsg="${esc(x.id)}">supprimer</button>`:""}</small></div></div>`;
  }).join(""):`<p class="muted center">Aucun message pour l’instant. Lance la discussion !</p>`;
  $$("[data-delmsg]",box).forEach(b=>b.onclick=async()=>{if(await confirmBox("Supprimer ce message ?"))del("messages",b.dataset.delmsg)});
  if(atBottom)box.scrollTop=box.scrollHeight;
}};

/* ---------- Compte ---------- */
const DOG_FIELDS=[{k:"nom",l:"Nom du chien",req:true,half:true},{k:"sexe",l:"Sexe",t:"select",o:[["M","Mâle"],["F","Femelle"]],half:true},
  {k:"naissance",l:"Date de naissance",t:"date",half:true,h:"L’âge se calcule tout seul."},{k:"race",l:"Race",half:true,d:"Boxer"},
  {k:"photo",l:"Photo",t:"photo"},{k:"remarque",l:"Commentaire",t:"textarea",rows:2,ph:"Castré, stérilisée, allergies, caractère…"}];
VIEWS.compte={t:"Mon compte",r(){
  if(!ME)return authHTML();
  if(ME._noProfile)return`<div class="card narrow"><h2>Terminer l’inscription</h2><p>Ton compte <b>${esc(ME.email)}</b> existe, mais il lui manque un pseudo.</p>${regFields(false)}</div>`;
  const mine=upcoming().filter(c=>estInscrit(c.id));
  const perm=notifSupported()?Notification.permission:"unsupported";
  return`<div class="card profile">${avatar(ME.pseudo,ME.photo,"xl")}<div class="grow"><h2>${esc(ME.pseudo)}</h2><span class="badge r-${esc(ME.role)}">${esc(ROLES[ME.role].l)}</span>
      ${ME.prenom?`<p class="small">${esc(ME.prenom)}</p>`:""}<div class="row wrap"><button class="btn sm" id="editMe">${ico("edit")} Modifier mon profil</button><button class="btn sm ghost" id="out">${ico("out")} Se déconnecter</button></div></div></div>
    ${ME.role==="attente"?`<div class="banner info">${ico("clock")}<div>Ton compte attend la validation du comité. Tu pourras ensuite t’inscrire aux cours et utiliser le tchat.</div></div>`:""}
    <div class="row between"><h2 class="h">Mes chiens</h2><button class="btn sm" id="addDog">${ico("plus")} Ajouter un chien</button></div>
    ${(ME.chiens||[]).length?`<div class="dogs edit">${ME.chiens.map((c,i)=>`<button class="card dog" data-dog="${i}">${avatar(c.nom,c.photo,"lg")}<div class="grow"><b>${esc(c.nom)}</b>
      <div class="small">${[SEXES[c.sexe],c.race,c.naissance?ageFrom(c.naissance):""].filter(Boolean).map(esc).join(" · ")}</div>${c.remarque?`<p class="small">${esc(c.remarque)}</p>`:""}</div>${ico("edit")}</button>`).join("")}</div>`
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
  b("editMe",()=>editSheet("Mon profil",[{k:"pseudo",l:"Pseudo",req:true},{k:"prenom",l:"Prénom (visible par les membres)"},{k:"photo",l:"Ma photo",t:"photo"}],{...ME,nom:ME.pseudo},{save:v=>updateProfile(v)}));
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
    ${full?`<div class="f"><label for="rMail">E-mail</label><input id="rMail" type="email" required autocomplete="email"><small>Jamais affiché ; sert à retrouver ton mot de passe.</small></div>
    <div class="f"><label for="rPass">Mot de passe</label><input id="rPass" type="password" required minlength="6" autocomplete="new-password"></div>`:""}
    <div class="f"><label for="rPrenom">Prénom (facultatif)</label><input id="rPrenom" autocomplete="given-name"></div>
    <fieldset class="dogset"><legend>🐾 Ton chien (facultatif)</legend>
      <div class="f half"><label for="dNom">Nom</label><input id="dNom"></div>
      <div class="f half"><label for="dSexe">Sexe</label><select id="dSexe"><option value="M">Mâle</option><option value="F">Femelle</option></select></div>
      <div class="f half"><label for="dNaiss">Date de naissance</label><input id="dNaiss" type="date"></div>
      <div class="f half"><label for="dRace">Race</label><input id="dRace" value="Boxer"></div>
      <div class="f"><label>Photo</label><div class="photo-in"><span class="av lg" id="dPrev">🐾</span><label class="btn sm">Choisir une photo<input type="file" accept="image/*" hidden id="dPhoto"></label></div></div>
      <div class="f"><label for="dRem">Commentaire</label><textarea id="dRem" rows="2" placeholder="Castré, stérilisée, caractère…"></textarea></div>
      <small>Tu pourras ajouter d’autres chiens ensuite dans ton profil.</small></fieldset>
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
    const chiens=v("dNom")?[{nom:v("dNom"),sexe:v("dSexe"),naissance:v("dNaiss"),race:v("dRace"),remarque:v("dRem"),photo}]:[];
    try{
      if(ME&&ME._noProfile){if(!PSEUDO_RE.test(v("rPseudo")))throw new Error("Pseudo invalide : 3 à 20 caractères.");if(await DB.doc("pseudos/"+pseudoKey(v("rPseudo"))).get().then(s=>s.exists))throw new Error("Ce pseudo est déjà pris.");await finishProfile(AUTH.currentUser,{pseudo:v("rPseudo"),prenom:v("rPrenom"),chiens})}
      else await register({pseudo:v("rPseudo"),email:v("rMail"),pass:$("#rPass",m).value,prenom:v("rPrenom"),chiens});
      toast(ME.role==="admin"&&MODE==="cloud"?"Bienvenue ! Premier compte : tu es administrateur·rice.":"Compte créé 🐾");location.hash="#compte";
    }catch(x){err.textContent=x.message;err.hidden=false}finally{btn.disabled=false}};
}

/* ---------- Réglages (comité) ---------- */
VIEWS.reglages={t:"Réglages",r(){
  if(!isBoard())return`<p class="muted">Réservé au comité.</p>`;
  const users=all("users").sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const wait=users.filter(u=>u.role==="attente");
  const roleOpts=u=>Object.keys(ROLES).filter(r=>!SENSITIVE.includes(r)||isAdmin()||u.role===r).map(r=>`<option value="${r}"${u.role===r?" selected":""}>${ROLES[r].l}</option>`).join("");
  const empty=["comite","moniteurs","urgences","elevages","wiki"].filter(c=>!S[c].size);
  return`<h2 class="h">Comptes à valider${wait.length?` <em class="pill">${wait.length}</em>`:""}</h2>
    ${wait.length?`<div class="list">${wait.map(u=>`<div class="card row wrap">${avatar(u.pseudo,u.photo)}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?" · "+esc(u.prenom):""}<br><span class="small">${u.chien?"🐾 "+esc(u.chien)+" · ":""}inscrit·e ${esc(fmtAgo(u.at||u.createdAt||new Date().toISOString()))}</span></span>
      <button class="btn sm primary" data-ok="${esc(u.id)}" data-r="adherent">Adhérent·e</button><button class="btn sm primary" data-ok="${esc(u.id)}" data-r="membre">Membre</button><button class="btn sm ghost" data-see="${esc(u.id)}">Fiche</button><button class="btn sm danger ghost" data-no="${esc(u.id)}">Refuser</button></div>`).join("")}</div>`:`<p class="muted">Aucun compte en attente.</p>`}
    <h2 class="h">Tous les comptes (${users.length})</h2>
    <div class="list">${users.filter(u=>u.role!=="attente").map(u=>`<div class="card row wrap">${avatar(u.pseudo,u.photo,"sm")}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?" · "+esc(u.prenom):""}</span>
      ${u.id===ME.uid&&!isAdmin()?`<span class="badge">${esc(ROLES[u.role].l)}</span>`:`<select data-role-of="${esc(u.id)}" aria-label="Rôle de ${esc(u.pseudo)}"${SENSITIVE.includes(u.role)&&!isAdmin()?" disabled":""}>${roleOpts(u)}</select>`}
      ${u.id!==ME.uid&&(isAdmin()||!SENSITIVE.includes(u.role))?`<button class="iconbtn" data-no="${esc(u.id)}" aria-label="Retirer">${ico("trash")}</button>`:""}</div>`).join("")}</div>
    <details class="card"><summary>Ce que permet chaque rôle</summary>${Object.entries(ROLES).map(([k,r])=>`<p class="small"><b>${r.l}</b> : ${r.d}</p>`).join("")}</details>
    <h2 class="h">Textes de l’app</h2>
    <form id="cfgForm" class="form card">
      <div class="f"><label for="cAnn">Annonce en haut de l’accueil (vide = aucune)</label><textarea id="cAnn" rows="2" placeholder="Ex. : pas de cours samedi 12, fête de la cabane !">${esc(CFG.annonce)}</textarea></div>
      <div class="f"><label for="cAcc">Présentation du club</label><textarea id="cAcc" rows="4">${esc(CFG.accueil)}</textarea></div>
      <div class="f"><label for="cPv">Première visite</label><textarea id="cPv" rows="2">${esc(CFG.premiereVisite)}</textarea></div>
      <div class="f"><label for="cTel">Numéro du bouton « Contacter le club »</label><input id="cTel" type="tel" value="${esc(CFG.telClub||"")}"></div>
      <div class="f"><label for="cAx">Plan d’accès : bon à savoir</label><textarea id="cAx" rows="3">${esc(CFG.acces)}</textarea></div>
      <div class="f"><label for="cDet">Boxer en détresse</label><textarea id="cDet" rows="4">${esc(CFG.detresse)}</textarea></div>
      <div class="row end full"><button class="btn primary">Enregistrer les textes</button></div></form>
    ${MODE==="cloud"&&empty.length?`<div class="card soft"><h3>Contenu de départ</h3><p class="small">Copier le contenu repris de boxerclubvaud.ch (comité, moniteurs, contacts d’urgence, élevages, wiki) dans les rubriques encore vides : ${empty.join(", ")}.</p><button class="btn primary" id="seed">Importer le contenu de départ</button></div>`:""}
    <p class="small muted">Retirer un compte efface sa fiche et libère son pseudo. Pour bloquer aussi sa connexion : Console Firebase › Authentication › désactiver l’utilisateur.</p>`;
},bind(m){
  $$("[data-ok]",m).forEach(b=>b.onclick=()=>{setRole(b.dataset.ok,b.dataset.r);toast("Compte validé")});
  $$("[data-see]",m).forEach(b=>b.onclick=()=>userSheet(get("users",b.dataset.see)));
  $$("[data-no]",m).forEach(b=>b.onclick=async()=>{const u=get("users",b.dataset.no);if(await confirmBox(`Retirer le compte de ${u.pseudo} ?`,"Retirer"))removeUser(u)});
  $$("[data-role-of]",m).forEach(s=>s.onchange=()=>{setRole(s.dataset.roleOf,s.value);toast("Rôle modifié")});
  $("#cfgForm",m).onsubmit=e=>{e.preventDefault();putCfg({annonce:$("#cAnn",m).value.trim(),accueil:$("#cAcc",m).value.trim(),premiereVisite:$("#cPv",m).value.trim(),telClub:$("#cTel",m).value.trim(),acces:$("#cAx",m).value.trim(),detresse:$("#cDet",m).value.trim()});toast("Textes enregistrés")};
  const s=$("#seed",m);if(s)s.onclick=async()=>{s.disabled=true;await importSeed();toast("Contenu importé")};
}};
