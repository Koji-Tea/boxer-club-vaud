"use strict";
/* Messagerie (enveloppe en haut de l'app) : messages privés entre membres et notifications de l'app. */
VIEWS.boite={t:"Messages",r(){
  const lock=membersOnly("La messagerie");if(lock)return lock;
  const[tab,id]=ARG.split("/");
  if(tab==="m"&&id)return convHTML(id);
  const nN=mesNotifs().filter(n=>!n.lu).length,nM=all("convs").filter(convNonLue).length;
  const seg=`<div class="seg"><a href="#boite" class="${tab!=="notifs"?"on":""}">${ico("mail")} Messages${nM?` <em class="pill">${nM}</em>`:""}</a><a href="#boite/notifs" class="${tab==="notifs"?"on":""}">${ico("bell")} Notifications${nN?` <em class="pill">${nN}</em>`:""}</a></div>`;
  if(tab==="notifs"){
    const l=mesNotifs();
    return`${seg}<div class="row end wrap">${nN?`<button class="btn sm" id="allRead">${ico("check")} Tout marquer comme lu</button>`:""}${l.some(n=>n.lu)?`<button class="btn sm ghost" id="clearRead">Effacer les notifications lues</button>`:""}</div>
      ${l.length?`<div class="list">${l.map(n=>`<button class="card row notif ${n.lu?"":"unread"}" data-notif="${esc(n.id)}">${ico("bell")}<span class="grow"><b>${esc(n.titre)}</b><br><span class="small">${esc(n.texte)}</span></span><span class="small muted">${esc(fmtAgo(n.at))}</span></button>`).join("")}</div>`
        :`<p class="muted">Aucune notification. Tu seras prévenu·e ici, par exemple quand une note de frais est payée.</p>`}`;
  }
  const cv=all("convs").sort((a,b)=>String(b.lastAt).localeCompare(a.lastAt));
  return`${seg}<div class="row end">${addBtn("newDm","Nouveau message")}</div>
    ${cv.length?`<div class="list">${cv.map(c=>{const o=autreDe(c),u=get("users",o),nom=(u&&u.pseudo)||(c.noms||{})[o]||"Membre",nl=convNonLue(c);
      return`<a class="card row conv ${nl?"unread":""}" href="#boite/m/${esc(o)}">${avatar(nom,u&&u.photo)}<span class="grow"><b>${esc(nom)}</b><br><span class="small muted">${c.lastBy===ME.uid?"Toi : ":""}${esc(c.last||"")}</span></span><span class="small muted">${esc(fmtAgo(c.lastAt))}</span>${nl?`<span class="dot" aria-label="Non lu"></span>`:""}</a>`}).join("")}</div>`
      :`<p class="muted">Aucun message. Écris à un·e membre avec « Nouveau message », ou depuis sa fiche dans la liste des adhérents.</p>`}`;
},bind(m){
  if(!isMember())return;
  const[tab,id]=ARG.split("/");
  if(tab==="m"&&id){bindConv(m,id);return}
  const b=(i,f)=>{const e=$("#"+i,m);if(e)e.onclick=f};
  b("newDm",choisirDestinataire);
  b("allRead",()=>mesNotifs().forEach(lireNotif));
  b("clearRead",async()=>{for(const n of mesNotifs().filter(n=>n.lu))await delNotif(n)});
  $$("[data-notif]",m).forEach(x=>x.onclick=()=>{const n=get("notifs",x.dataset.notif);lireNotif(n);if(n.lien)location.hash=n.lien});
},update(m){
  const[tab,id]=ARG.split("/");
  if(tab==="m"&&id&&$("#dmList",m)&&isMember()){fillConv(m,id);return}
  $(".view",m).innerHTML=this.r();this.bind(m);
}};
function choisirDestinataire(){
  const l=all("users").filter(u=>MEMBERS.includes(u.role)&&u.id!==ME.uid).sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const s=sheet("Écrire à…",`<div class="search">${ico("search")}<input id="dQ" type="search" placeholder="Chercher un pseudo, un prénom…"></div>
    <div class="list">${l.map(u=>`<a class="card row dest" href="#boite/m/${esc(u.id)}" data-s="${esc([u.pseudo,u.prenom,u.chien].join(" "))}">${avatar(u.pseudo,u.photo,"sm")}<span class="grow"><b>${esc(u.pseudo)}</b>${u.prenom?` · ${esc(u.prenom)}`:""}</span></a>`).join("")}</div>`);
  const q=$("#dQ",s);q.oninput=()=>{const t=norm(q.value);$$(".dest",s).forEach(x=>x.hidden=t&&!norm(x.dataset.s).includes(t))};
}
function convHTML(other){
  const u=get("users",other),cv=get("convs",convId(ME.uid,other)),nom=(u&&u.pseudo)||(cv&&(cv.noms||{})[other])||"Membre";
  return`<div class="chat dm"><div class="row conv-h"><a class="iconbtn" href="#boite" aria-label="Retour aux messages">${ico("back")}</a>${avatar(nom,u&&u.photo,"sm")}<b class="grow">${esc(nom)}</b>${u?`<button class="btn sm ghost" id="seeU">Sa fiche</button>`:""}</div>
    <div id="dmList" class="chat-list" aria-live="polite"></div>
    <form id="dmForm" class="chat-form"><textarea id="dmIn" rows="1" maxlength="2000" placeholder="Écris à ${esc(nom)}…" aria-label="Message"></textarea><button class="btn primary" aria-label="Envoyer">${ico("send")}</button></form>
    <p class="small muted center">Message privé : seul·e ${esc(nom)} et toi le voyez.</p></div>`;
}
function bindConv(m,other){
  const cid=convId(ME.uid,other);
  if(MODE==="cloud")watchConv(cid);
  const s=$("#seeU",m);if(s)s.onclick=()=>userSheet(get("users",other));
  bindChatForm(m,"dmForm","dmIn","bcv-dm-draft-"+other,t=>sendDM(other,t));
  fillConv(m,other,true);
}
function fillConv(m,other,first){
  const cid=convId(ME.uid,other);
  const list=all("dmsgs").filter(x=>x.c===cid).sort((a,b)=>String(a.at).localeCompare(b.at));
  fillChat($("#dmList",m),list,first,x=>x.uid===ME.uid?ME.pseudo:((get("users",x.uid)||{}).pseudo||""),x=>x.uid===ME.uid,x=>delDM(x),"Aucun message pour l’instant. Dis bonjour 👋");
  if(document.visibilityState==="visible")lireConv(cid);
}
