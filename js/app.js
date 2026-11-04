"use strict";
/* Navigation : barre latérale sur ordinateur, barre d'onglets + menu « Plus » sur téléphone.
   Chaque écran est déclaré dans VIEWS (fichiers js/vues/*.js) : {t:titre, i:icône, r(main):affichage}. */
const NAV=[
  ["accueil","Accueil","home"],["agenda","Agenda des cours","cal"],["moniteurs","Moniteurs","coach"],["chiots","Chiots & portées","paw"],
  ["wiki","Wiki du boxer","book"],["club","Comité & adhérents","club"],["acces","Plan d’accès","map"],["tchat","Tchat des membres","chat"],
  ["urgences","Contacts d’urgence","sos"],["soutenir","Soutenir le club","heart"],
];
const TABS=["accueil","agenda","tchat","urgences"];
let ROUTE="accueil",ARG="";
function route(){
  const h=decodeURIComponent(location.hash.slice(1)||"accueil");const[r,...a]=h.split("/");
  ROUTE=VIEWS[r]?r:"accueil";ARG=a.join("/");closeSheet();render();window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);

function navHTML(){
  const me=ME?`<a class="nav-me" href="#compte">${avatar(ME.pseudo||"?",ME.photo,"sm")}<span><b>${esc(ME.pseudo||"Mon compte")}</b><small>${esc(ROLES[ME.role]?ROLES[ME.role].l:"")}</small></span></a>`
    :`<a class="btn primary block" href="#compte">${ico("user")} Se connecter / s’inscrire</a>`;
  return`<a class="nav-logo" href="#accueil" aria-label="Accueil"><img class="logo-img" alt="Boxer Club Vaud" src="img/logo-noir.png"></a>
    ${NAV.map(([k,l,i])=>`<a href="#${k}" class="${ROUTE===k?"on":""}">${ico(i)}<span>${l}</span>${k==="tchat"&&!isMember()?ico("shield","lock"):""}</a>`).join("")}
    ${isBoard()?`<a href="#reglages" class="${ROUTE==="reglages"?"on":""}">${ico("shield")}<span>Réglages${pendingCount()?` <em class="pill">${pendingCount()}</em>`:""}</span></a>`:""}
    <div class="nav-foot">${me}${installBtn()}${MODE==="local"?`<p class="small muted">Mode essai : les données restent dans ce navigateur.</p>`:""}</div>`;
}
const pendingCount=()=>isBoard()?all("users").filter(u=>u.role==="attente").length:0;
function tabsHTML(){
  return TABS.map(k=>{const[,l,i]=NAV.find(n=>n[0]===k);return`<a href="#${k}" class="${ROUTE===k?"on":""}">${ico(i)}<span>${l.split(" ")[0]}</span></a>`}).join("")
    +`<button id="moreBtn" class="${TABS.includes(ROUTE)?"":"on"}">${ico("more")}<span>Plus</span></button>`;
}
function openMore(){
  const items=NAV.filter(n=>!TABS.includes(n[0]));
  if(isBoard())items.push(["reglages","Réglages","shield"]);
  items.push(["compte",ME?"Mon compte":"Se connecter","user"]);
  const s=sheet("Menu",`<div class="menu-grid">${items.map(([k,l,i])=>`<a href="#${k}" class="tile">${ico(i)}<span>${l}</span></a>`).join("")}</div>${installBtn()}`);
  bindInstall(s);
}

/* ---------- Installation sur l'écran d'accueil ---------- */
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;render()});
const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
const installBtn=()=>standalone()?"":installEvt||isIOS()?`<button class="btn block" data-install>${ico("plus")} Installer l’app</button>`:"";
function bindInstall(root){
  $$("[data-install]",root).forEach(b=>b.onclick=async()=>{
    if(installEvt){installEvt.prompt();await installEvt.userChoice;installEvt=null;render()}
    else sheet("Installer sur iPhone",`<ol class="steps"><li>Dans Safari, touche le bouton <b>Partager</b> (carré avec une flèche).</li><li>Choisis <b>Sur l’écran d’accueil</b>.</li><li>Touche <b>Ajouter</b> : l’app Boxer Club apparaît avec tes autres apps.</li></ol>`);
  });
}

/* ---------- Affichage ---------- */
function render(){
  if(MODE==="loading")return;
  const v=VIEWS[ROUTE];
  document.title=(ROUTE==="accueil"?"":v.t+" – ")+"Boxer Club Vaud";
  $("#side").innerHTML=navHTML();$("#tabbar").innerHTML=tabsHTML();
  $("#ttl").textContent=ROUTE==="accueil"?"":v.t;
  $("#topMe").innerHTML=ME?avatar(ME.pseudo||"?",ME.photo,"sm"):ico("user");
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
// Bloc affiché aux visiteurs sur les pages réservées aux membres.
function membersOnly(what){
  if(isMember())return"";
  if(!ME)return`<div class="card lock">${ico("shield")}<h3>Réservé aux membres</h3><p>${esc(what)} est réservé aux membres et adhérent·es du club.</p><a class="btn primary" href="#compte">Se connecter ou créer un compte</a></div>`;
  return`<div class="card lock">${ico("clock")}<h3>Compte en attente</h3><p>Merci pour ton inscription, <b>${esc(ME.pseudo)}</b> ! Le comité doit encore valider ton compte. Tu auras ensuite accès à ${esc(what.toLowerCase())}.</p></div>`;
}


/* ---------- Démarrage ---------- */
if("serviceWorker" in navigator&&location.protocol==="https:"&&window.top===window)navigator.serviceWorker.register("sw.js").catch(()=>{});
initStore().then(()=>{route();setTimeout(checkRappels,1500)});
