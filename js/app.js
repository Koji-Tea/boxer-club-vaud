"use strict";
/* Navigation : barre latérale sur ordinateur, barre d'onglets + menu « Plus » sur téléphone.
   Chaque écran est déclaré dans VIEWS (fichiers js/vues/*.js) : {t:titre, i:icône, r(main):affichage}. */
// [route, libellé, icône, visible pour…] : la comptabilité, la cabane et les réglages ne s'affichent qu'au comité.
const NAV=[
  ["accueil","Accueil","home"],["agenda","Agenda des cours","cal"],["club","Comité & adhérents","club"],["tchat","Tchat des membres","chat"],["galerie","Galerie photo","camera"],
  ["moniteurs","Moniteurs","coach"],["chiots","Chiots & portées","paw"],["compta","Comptabilité","coins",()=>isComite()],["cabane","Gestion cabane","cabin",()=>isComite()],
  ["wiki","Wiki du boxer","book"],["urgences","Contacts d’urgence","sos"],["acces","Plan d’accès","map"],["soutenir","Soutenir le club","heart"],
  ["reglages","Réglages","shield",()=>isComite()],
];
const navItems=()=>NAV.filter(n=>!n[3]||n[3]());
const TABS=["accueil","agenda","club","tchat"];
const TAB_L={club:"Membres"}; // libellés courts de la barre du bas
// Pastille à côté d'une rubrique : comptes à valider, notes de frais à payer, échéances de la cabane.
function navPill(k){
  const n=k==="reglages"?pendingCount():k==="compta"&&isComptaEdit()?all("notes").filter(x=>!x.payee).length:k==="cabane"?cabaneAlertes().length:0;
  return n?` <em class="pill">${n}</em>`:"";
}
let ROUTE="accueil",ARG="";
function route(){
  const h=decodeURIComponent(location.hash.slice(1)||"accueil");const[r,...a]=h.split("/");
  ROUTE=VIEWS[r]?r:"accueil";ARG=a.join("/");
  // Accueil : adresse sans « #accueil », plus propre à partager.
  if(ROUTE==="accueil"&&!ARG&&location.hash)history.replaceState(null,"",location.pathname+location.search);
 closeSheet();render();window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);

function navHTML(){
  const me=ME?`<a class="nav-me" href="#compte">${avatar(ME.pseudo||"?",ME.photo,"sm")}<span><b>${esc(ME.pseudo||"Mon compte")}</b><small>${esc(ROLES[ME.role]?ROLES[ME.role].l:"")}</small></span></a>`
    :`<a class="btn primary block" href="#compte">${ico("user")} Se connecter / s’inscrire</a>`;
  return`<a class="nav-logo" href="#accueil" aria-label="Accueil"><img class="logo-img" alt="Boxer Club Vaud" src="img/logo-noir.png"></a>
    ${isMember()?`<a href="#boite" class="${ROUTE==="boite"?"on":""}">${ico("mail")}<span>Messages & notifications${dotNL(nbNonLus())}</span></a>`:""}
    ${navItems().map(([k,l,i])=>`<a href="#${k}" class="${ROUTE===k?"on":""}">${ico(i)}<span>${l}${k==="tchat"?dotNL(tchatNonLus()):navPill(k)}</span>${k==="tchat"&&!isMember()?ico("shield","lock"):""}</a>`).join("")}
    <div class="nav-foot">${me}${installBtn()}${MODE==="local"?`<p class="small muted">Mode essai : les données restent dans ce navigateur.</p>`:""}</div>`;
}
const pendingCount=()=>isAdhEdit()?all("users").filter(u=>u.role==="attente").length:0;
function tabsHTML(){
  return TABS.map(k=>{const[,l,i]=NAV.find(n=>n[0]===k);return`<a href="#${k}" class="${ROUTE===k?"on":""}"><span class="tab-ico">${ico(i)}${k==="tchat"&&tchatNonLus()?`<em class="nonlu dot-only"></em>`:""}</span><span>${TAB_L[k]||l.split(" ")[0]}</span></a>`}).join("")
    +`<button id="moreBtn" class="${TABS.includes(ROUTE)?"":"on"}">${ico("more")}<span>Plus</span></button>`;
}
function openMore(){
  const items=navItems().filter(n=>!TABS.includes(n[0]));
  items.push(["compte",ME?"Mon compte":"Se connecter","user"]);
  const s=sheet("Menu",`<div class="menu-grid">${items.map(([k,l,i])=>`<a href="#${k}" class="tile">${ico(i)}<span>${l}${navPill(k)}</span></a>`).join("")}</div>${installBtn()}`);
  bindInstall(s);
}

/* ---------- Installation sur l'écran d'accueil ---------- */
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;render()});
const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=()=>/android/i.test(navigator.userAgent);
// Le bouton est toujours proposé hors de l'app installée : s'il n'y a pas d'installation directe, il explique comment faire.
const installBtn=()=>standalone()?"":`<button class="btn block" data-install>${ico("plus")} Installer l’app</button>`;
// Bandeau sur l'accueil du téléphone (masquable) : sur mobile, le menu latéral et son bouton sont cachés.
const installBanner=()=>standalone()||ls("bcv-install-ok")||!matchMedia("(max-width:899px)").matches?"":
  `<div class="banner info install">${ico("plus")}<div class="grow"><b>Installe l’app sur ton téléphone</b><br><span class="small">Elle s’ouvre ensuite comme une vraie app, depuis l’écran d’accueil.</span><div class="row wrap"><button class="btn sm primary" data-install>Installer</button><button class="btn sm ghost" id="installNo">Plus tard</button></div></div></div>`;
function installHelp(){
  const ios=`<h3>iPhone / iPad</h3><ol class="steps"><li>Ouvre l’app dans <b>Safari</b> (pas dans Chrome ni dans une autre app).</li><li>Touche le bouton <b>Partager</b> (carré avec une flèche vers le haut), en bas ou en haut de l’écran.</li><li>Fais défiler et choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</li></ol>`;
  const and=`<h3>Android</h3><ol class="steps"><li>Ouvre l’app dans <b>Chrome</b>.</li><li>Touche le menu <b>⋮</b> en haut à droite.</li><li>Choisis <b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>), puis confirme.</li></ol>`;
  const pc=`<h3>Ordinateur</h3><p>Dans Chrome ou Edge, clique sur l’icône d’installation à droite de la barre d’adresse.</p>`;
  sheet("Installer l’app",isIOS()?ios:isAndroid()?and:ios+and+pc);
}
function bindInstall(root){
  $$("[data-install]",root).forEach(b=>b.onclick=async()=>{
    if(installEvt){installEvt.prompt();const r=await installEvt.userChoice;installEvt=null;if(r&&r.outcome==="accepted")ls("bcv-install-ok","1");render()}
    else installHelp();
  });
  const no=$("#installNo",root);if(no)no.onclick=()=>{ls("bcv-install-ok","1");render()};
}
window.addEventListener("appinstalled",()=>{ls("bcv-install-ok","1");render()});

/* ---------- Affichage ---------- */
function render(){
  if(MODE==="loading")return;
  const v=VIEWS[ROUTE];
  document.title=(ROUTE==="accueil"?"":v.t+" – ")+"Boxer Club Vaud";
  $("#side").innerHTML=navHTML();$("#tabbar").innerHTML=tabsHTML();
  $("#ttl").textContent=ROUTE==="accueil"?"":v.t;
  $("#topMe").innerHTML=ME?avatar(ME.pseudo||"?",ME.photo,"sm"):ico("user");
  const env=$("#topEnv"),nl=nbNonLus();env.hidden=!isMember();env.innerHTML=ico("mail")+(nl?`<em class="nonlu">${nl>99?"99+":nl}</em>`:"");env.classList.toggle("on",ROUTE==="boite");
  $("#moreBtn").onclick=openMore;bindInstall($("#side"));
  // On ne redessine pas un formulaire en cours de saisie (le tchat garde aussi son brouillon).
  const main=$("#main");const a=document.activeElement;const same=main.dataset.v===ROUTE+ARG;
  // Écran qui sait se mettre à jour lui-même (tchat) : on garde le brouillon et la position.
  if(same&&v.update&&$(".view",main)){v.update(main);return}
  if(same&&a&&main.contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;
  main.dataset.v=ROUTE+ARG;
  main.innerHTML=`<div class="view v-${ROUTE}">${v.r(main)||""}</div>`;
  if(v.bind)v.bind(main);
  bindInstall(main);
}
// Redessine l'écran même si un champ a le focus (changement d'année, de filtre…).
function rerender(){$("#main").dataset.v="";render()}
const comiteOnly=()=>`<div class="card lock">${ico("shield")}<h3>Réservé au comité</h3><p>Cette rubrique n’est visible que par les membres du comité.</p></div>`;
// Bloc affiché aux visiteurs sur les pages réservées aux membres.
function membersOnly(what){
  if(isMember())return"";
  if(!ME)return`<div class="card lock">${ico("shield")}<h3>Réservé aux membres</h3><p>${esc(what)} est réservé aux membres et adhérent·es du club.</p><a class="btn primary" href="#compte">Se connecter ou créer un compte</a></div>`;
  return`<div class="card lock">${ico("clock")}<h3>Compte en attente</h3><p>Merci pour ton inscription, <b>${esc(ME.pseudo)}</b> ! Le comité doit encore valider ton compte. Tu auras ensuite accès à ${esc(what.toLowerCase())}.</p></div>`;
}


/* ---------- Démarrage ---------- */
if("serviceWorker" in navigator&&location.protocol==="https:"&&window.top===window)navigator.serviceWorker.register("sw.js").catch(()=>{});
function effacerNotifsSysteme(){
  try{navigator.clearAppBadge&&navigator.clearAppBadge().catch(()=>{})}catch(e){}
  if(navigator.serviceWorker)navigator.serviceWorker.getRegistration().then(r=>r&&r.getNotifications().then(l=>l.forEach(n=>n.close()))).catch(()=>{});
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)effacerNotifsSysteme()});
effacerNotifsSysteme();
initStore().then(()=>{route();setTimeout(checkRappels,1500)});
