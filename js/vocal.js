"use strict";
/* ---------- Messages vocaux (comme WhatsApp) ----------
   Dans le tchat, les groupes et les messages privés : maintenir le micro pour enregistrer, relâcher pour envoyer,
   glisser vers la gauche pour annuler. Un appui court « verrouille » l'enregistrement (boutons Supprimer / Envoyer).
   Le forfait gratuit de Firebase n'a pas de Storage : le son est rangé dans Firestore, à côté des messages,
   en morceaux de 900 Ko au plus (documents …/audios/{idDuMessage}_{n}). Il n'est téléchargé qu'à la première écoute.
   Formats : iPhone (Safari) enregistre en AAC (audio/mp4), lisible partout. Chrome récent aussi ; sinon Opus (webm/ogg). */
const VOCAL_MAX=180;       // durée maximale d'un message vocal, en secondes
const VOCAL_PART=900000;   // taille d'un morceau (un document Firestore fait 1 Mo au plus)
const VOCAL_OK=!!(window.MediaRecorder&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
let ENREG=false;           // enregistrement en cours : l'écran du tchat ne se redessine pas
function vocalMime(){
  const l=["audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/aac","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"];
  return l.find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch(e){return false}})||"";
}
const fmtDur=s=>{s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
// Texte court d'un message (aperçus, notifications) : « 🎤 Message vocal (0:12) » pour un vocal.
const apercuMsg=x=>x&&x.audio?"🎤 Message vocal ("+fmtDur(x.audio.dur)+")":String((x&&x.texte)||"");
const audBase=x=>(x.c?`convs/${x.c}/`:x.g?`groupes/${x.g}/`:"")+"audios/"+x.id+"_";

/* ---------- Envoi : les morceaux du son d'abord, le message ensuite ---------- */
const AUD_URL=new Map(); // id du message -> adresse locale du son (déjà téléchargé ou enregistré ici)
async function prepVocal(o,v){
  o.texte="";o.audio={dur:Math.round(Math.min(v.dur,VOCAL_MAX)*10)/10,n:Math.max(1,Math.ceil(v.blob.size/VOCAL_PART)),mime:v.mime||v.blob.type||"audio/mp4",size:v.blob.size};
  AUD_URL.set(o.id,URL.createObjectURL(v.blob));
}
async function upVocal(o,v){
  if(MODE!=="cloud")return;
  const bytes=new Uint8Array(await v.blob.arrayBuffer()),B=firebase.firestore.Blob,base=audBase(o),n=o.audio.n;
  await Promise.all(Array.from({length:n},(_,i)=>DB.doc(base+i).set({uid:ME.uid,i,n,data:B.fromUint8Array(bytes.subarray(i*VOCAL_PART,(i+1)*VOCAL_PART))})));
}
function delVocal(x){
  if(!x||!x.audio||MODE!=="cloud")return;
  for(let i=0;i<(x.audio.n||1);i++)DB.doc(audBase(x)+i).delete().catch(e=>console.warn("vocal",e.code));
}
async function chargerVocal(x){
  if(AUD_URL.has(x.id))return AUD_URL.get(x.id);
  if(MODE!=="cloud")throw new Error("absent");
  const docs=await Promise.all(Array.from({length:x.audio.n||1},(_,i)=>DB.doc(audBase(x)+i).get()));
  const parts=docs.map(d=>{if(!d.exists)throw new Error("absent");return d.data().data.toUint8Array()});
  const url=URL.createObjectURL(new Blob(parts,{type:String(x.audio.mime||"audio/mp4").split(";")[0]}));
  AUD_URL.set(x.id,url);return url;
}

/* ---------- Lecture dans le fil ---------- */
let AUD=null,AUD_X=null,AUD_WAIT=null;
// Un petit son muet : sur iPhone, lancer la lecture pendant le toucher « débloque » le lecteur pour la suite.
let SILENCE=null;
function silence(){
  if(SILENCE)return SILENCE;
  const n=800,b=new ArrayBuffer(44+n),v=new DataView(b),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,"RIFF");v.setUint32(4,36+n,true);w(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,"data");v.setUint32(40,n,true);
  for(let i=0;i<n;i++)v.setUint8(44+i,128);
  return SILENCE=URL.createObjectURL(new Blob([b],{type:"audio/wav"}));
}
function lecteur(){
  if(AUD)return AUD;
  AUD=new Audio();AUD.preload="auto";
  ["timeupdate","play","pause","playing","waiting"].forEach(ev=>AUD.addEventListener(ev,majVocal));
  AUD.addEventListener("ended",()=>{if(AUD.src===silence())return;AUD_X=null;majVocal()});
  AUD.addEventListener("error",()=>{if(!AUD_X||AUD.src===silence())return;AUD_X=null;majVocal();toast("Ce message vocal ne peut pas être lu sur cet appareil.","bad")});
  return AUD;
}
// Vitesse de lecture (comme WhatsApp) : 1×, 1,5×, 2×. Retenue sur cet appareil pour tous les messages vocaux.
const VITESSES=[1,1.5,2];
let VITESSE=(()=>{const v=parseFloat(ls("bcv-vocal-vitesse"));return VITESSES.includes(v)?v:1})();
const fmtVit=v=>String(v).replace(".",",")+"×";
function appliquerVitesse(){if(!AUD)return;AUD.defaultPlaybackRate=VITESSE;AUD.playbackRate=VITESSE;if("preservesPitch" in AUD)AUD.preservesPitch=true}
function changerVitesse(){
  VITESSE=VITESSES[(VITESSES.indexOf(VITESSE)+1)%VITESSES.length];ls("bcv-vocal-vitesse",String(VITESSE));
  appliquerVitesse();$$(".vspeed").forEach(b=>{b.textContent=fmtVit(VITESSE);b.setAttribute("aria-label","Vitesse de lecture : "+fmtVit(VITESSE))});
}
const durDe=x=>(x&&x.audio&&x.audio.dur)||0;
function vocalHTML(x){
  const d=durDe(x);
  return`<div class="vocal" data-aud="${esc(x.id)}"><button type="button" class="vplay" data-play="${esc(x.id)}" aria-label="Écouter le message vocal">${ico("play","p")}${ico("pause","s")}</button>
    <button type="button" class="vbar" data-seek="${esc(x.id)}" aria-label="Position de lecture"><i></i></button><span class="vdur">${fmtDur(d)}</span>
    <button type="button" class="vspeed" data-speed aria-label="Vitesse de lecture : ${fmtVit(VITESSE)}" title="Vitesse de lecture">${fmtVit(VITESSE)}</button></div>`;
}
// Met à jour le bouton, la barre de progression et le temps des messages vocaux affichés.
const DURS=new Map();
function majVocal(){
  $$(".vocal").forEach(el=>{
    const id=el.dataset.aud,cur=!!AUD_X&&AUD_X.id===id,reel=cur&&AUD.src!==silence(),t=reel?AUD.currentTime:0,d=cur?durDe(AUD_X):DURS.get(id)||0;
    el.classList.toggle("on",cur&&(AUD_WAIT===id||!AUD.paused));el.classList.toggle("wait",cur&&AUD_WAIT===id);
    $("i",el).style.width=(reel&&d?Math.min(100,t/d*100):0)+"%";
    $(".vdur",el).textContent=fmtDur(reel&&t>0?t:d);
  });
}
async function jouerVocal(x,ratio){
  const a=lecteur();
  if(AUD_X&&AUD_X.id===x.id&&AUD.src!==silence()&&ratio==null){if(a.paused)a.play().catch(()=>{});else a.pause();return}
  AUD_X=x;AUD_WAIT=x.id;majVocal();
  // Toujours pendant le toucher : débloque la lecture sur iPhone, même si le son doit encore être téléchargé.
  if(!AUD_URL.has(x.id)){a.src=silence();a.play().catch(()=>{})}
  let url;try{url=await chargerVocal(x)}catch(e){if(AUD_X===x){AUD_X=null;AUD_WAIT=null;majVocal()}toast(MODE==="cloud"?"Message vocal introuvable (supprimé ou pas encore envoyé).":"En mode essai, un message vocal ne reste que jusqu’au rechargement de la page.","bad");return}
  if(AUD_X!==x)return;
  if(a.src!==url){a.src=url;a.load()}
  appliquerVitesse();
  const go=()=>{if(ratio!=null&&durDe(x))try{a.currentTime=ratio*durDe(x)}catch(e){}};
  if(a.readyState>=1)go();else a.addEventListener("loadedmetadata",go,{once:true});
  try{await a.play()}catch(e){if(AUD_X===x){toast("Touche encore ▶ pour écouter.");a.pause()}}
  AUD_WAIT=null;majVocal();
}
// À appeler après avoir redessiné un fil : branche les lecteurs et remet l'état de la lecture en cours.
function bindVocaux(box,byId){
  $$("[data-aud]",box).forEach(el=>{const x=byId(el.dataset.aud);if(x)DURS.set(x.id,durDe(x))});
  $$("[data-play]",box).forEach(b=>b.onclick=e=>{e.stopPropagation();const x=byId(b.dataset.play);if(x)jouerVocal(x)});
  $$("[data-speed]",box).forEach(b=>b.onclick=e=>{e.stopPropagation();changerVitesse()});
  $$("[data-seek]",box).forEach(b=>b.onclick=e=>{e.stopPropagation();const x=byId(b.dataset.seek);if(!x)return;
    const r=b.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));jouerVocal(x,ratio)});
  majVocal();
}

/* ---------- Enregistrement : bouton micro à côté du champ de saisie ---------- */
function bindVocal(f,inp,send){
  if(!VOCAL_OK||!f||$(".mic",f))return;
  const mic=document.createElement("button");mic.type="button";mic.className="btn primary mic";
  mic.setAttribute("aria-label","Message vocal : maintenir pour enregistrer");mic.title="Maintenir pour enregistrer, relâcher pour envoyer";mic.innerHTML=ico("mic");
  const bar=document.createElement("div");bar.className="rec-bar";bar.hidden=true;
  f.prepend(bar);f.append(mic);
  const vide=()=>f.classList.toggle("vide",!inp.value.trim());
  inp.addEventListener("input",vide);f.addEventListener("submit",()=>setTimeout(vide,0));vide();
  let R=null;
  const tps=()=>R&&R.t1?(Date.now()-R.t1)/1000:0;
  const dessine=()=>{
    if(!R)return;const s=tps(),fin=VOCAL_MAX-s<=20;
    const t=`<span class="rec-dot" aria-hidden="true"></span><span class="rec-t">${R.t1?fmtDur(s)+(fin?" / "+fmtDur(VOCAL_MAX):""):"Micro…"}</span>`;
    if(R.locked&&!$(".rec-ok",bar))bar.innerHTML=`<button type="button" class="iconbtn rec-x" aria-label="Supprimer l’enregistrement">${ico("trash")}</button>${t}<span class="grow small muted">Enregistrement…</span><button type="button" class="btn primary rec-ok" aria-label="Envoyer le message vocal">${ico("send")}</button>`;
    else if(!R.locked&&!$(".rec-hint",bar))bar.innerHTML=`${t}<span class="grow rec-hint">‹ Glisser pour annuler</span>`;
    else $(".rec-t",bar).textContent=R.t1?fmtDur(s)+(fin?" / "+fmtDur(VOCAL_MAX):""):"Micro…";
    const x=$(".rec-x",bar),ok=$(".rec-ok",bar);if(x)x.onclick=()=>stop(false);if(ok)ok.onclick=()=>stop(true);
  };
  const fin=r=>{if(R!==r)return;R=null;ENREG=false;clearInterval(r.tick);f.classList.remove("rec","locked");bar.hidden=true;bar.innerHTML="";bar.style.removeProperty("--dx");vide()};
  const lock=()=>{if(!R)return;R.locked=true;f.classList.add("locked");bar.innerHTML="";dessine()};
  async function start(x){
    if(AUD&&!AUD.paused)AUD.pause();
    const r=R={t0:Date.now(),x0:x,holding:true,locked:false,chunks:[]};ENREG=true;
    f.classList.add("rec");bar.hidden=false;bar.innerHTML="";dessine();
    try{r.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
    catch(e){fin(r);toast(e&&e.name==="NotAllowedError"?"Micro refusé : autorise le micro pour cette app (sur iPhone : Réglages › Safari › Micro).":"Micro indisponible sur cet appareil.","bad");return}
    if(R!==r||r.annule){r.stream.getTracks().forEach(t=>t.stop());return}
    const mime=vocalMime();
    try{r.rec=new MediaRecorder(r.stream,mime?{mimeType:mime,audioBitsPerSecond:48000}:{audioBitsPerSecond:48000})}catch(e){r.rec=new MediaRecorder(r.stream)}
    r.rec.ondataavailable=e=>{if(e.data&&e.data.size)r.chunks.push(e.data)};
    r.rec.onstop=()=>fini(r);
    r.rec.start();r.t1=Date.now();
    if(!r.holding)lock();
    if(navigator.vibrate)try{navigator.vibrate(30)}catch(e){}
    r.tick=setInterval(()=>{if(!f.isConnected){stop(false);return}dessine();if(tps()>=VOCAL_MAX){toast("Durée maximale atteinte (3 min) : message envoyé.");stop(true)}},250);
    dessine();
  }
  function stop(envoyer){
    const r=R;if(!r||r.stopping)return;r.stopping=true;r.send=envoyer;r.annule=!envoyer;clearInterval(r.tick);
    r.dur=r.t1?(Date.now()-r.t1)/1000:0;
    if(r.rec&&r.rec.state!=="inactive")r.rec.stop();else fini(r);
  }
  function fini(r){
    if(r.stream)r.stream.getTracks().forEach(t=>t.stop());fin(r);
    if(!r.send)return;
    if(r.dur<1){toast("Message trop court : garde le doigt sur le micro pendant que tu parles.");return}
    const mime=(r.rec&&r.rec.mimeType)||vocalMime()||(r.chunks[0]&&r.chunks[0].type)||"audio/mp4";
    const blob=new Blob(r.chunks,{type:mime.split(";")[0]});
    if(!blob.size){toast("Aucun son enregistré. Réessaie.","bad");return}
    if(blob.size>VOCAL_PART*5){toast("Message vocal trop lourd. Fais-en un plus court.","bad");return}
    send({blob,dur:r.dur,mime});
  }
  mic.addEventListener("contextmenu",e=>e.preventDefault());
  mic.onpointerdown=e=>{if(e.button>0||R)return;e.preventDefault();try{mic.setPointerCapture(e.pointerId)}catch(_){}start(e.clientX)};
  mic.onpointermove=e=>{if(!R||R.locked||!R.holding)return;const dx=Math.max(0,R.x0-e.clientX);bar.style.setProperty("--dx",Math.min(dx,120)+"px");if(dx>100)stop(false)};
  mic.onpointerup=()=>{if(!R||R.locked)return;R.holding=false;if(!R.rec||Date.now()-R.t0<450)lock();else stop(true)};
  // Sur iPhone, la demande d'accès au micro interrompt le toucher : on passe en mode verrouillé.
  mic.onpointercancel=()=>{if(!R||R.locked)return;R.holding=false;if(R.rec)lock()};
  mic.onkeydown=e=>{if((e.key===" "||e.key==="Enter")&&!R){e.preventDefault();start(0).then(()=>{if(R)R.holding=false;lock()})}};
}
