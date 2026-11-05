"use strict";
/* Rappels avant les cours.
   1) « Ajouter à mon agenda » : un fichier .ics avec une alarme. Le téléphone prévient à l'heure dite, même app fermée.
   2) Notification de l'app : quand l'app est ouverte (ou rouverte), elle prévient des cours qui approchent.
   Pour des notifications envoyées app fermée, il faudrait Firebase Cloud Messaging + une fonction serveur (voir README). */
const RAPPEL_KEY="bcv-rappel",SENT_KEY="bcv-rappels-envoyes";
const DELAIS=[[30,"30 minutes avant"],[60,"1 heure avant"],[120,"2 heures avant"],[180,"3 heures avant"],[1440,"la veille (24 h avant)"]];
const rappelMin=()=>{const v=ls(RAPPEL_KEY);return v===null?120:Number(v)};
const rappelOn=()=>ls(RAPPEL_KEY+"-on")!=="0";
const notifSupported=()=>"Notification" in window;

function icsFor(c,min=rappelMin()){
  const z=d=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const t=s=>String(s||"").replace(/[\\,;]/g,m=>"\\"+m).replace(/\n/g,"\\n");
  const m=c.moniteur&&get("moniteurs",c.moniteur);
  const desc=[c.description,m?"Moniteur·rice : "+m.nom:"",c.niveau?"Niveau : "+c.niveau:""].filter(Boolean).join("\n");
  return["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Boxer Club Vaud//App//FR","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
    "UID:"+c.id+"@boxerclubvaud","DTSTAMP:"+z(new Date()),"DTSTART:"+z(startOf(c)),"DTEND:"+z(endOf(c)),
    "SUMMARY:"+t(c.titre+" – Boxer Club Vaud"),"LOCATION:"+t(c.lieu&&c.lieu!=="Terrain d’Ecublens"?c.lieu:CLUB.adresse),"DESCRIPTION:"+t(desc),
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+t(c.titre),"TRIGGER:-PT"+min+"M","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
}
function downloadIcs(c){
  const blob=new Blob([icsFor(c)],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(c.titre||"cours").replace(/[^\w-]+/g,"-")+".ics";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  toast("Ouvre le fichier pour l’ajouter à ton agenda, avec un rappel.");
}
async function askNotif(){
  if(!notifSupported()){toast("Ce navigateur ne gère pas les notifications. Sur iPhone, installe d’abord l’app sur l’écran d’accueil.","bad");return false}
  const p=await Notification.requestPermission();
  if(p!=="granted"){toast("Notifications refusées. Tu peux les réactiver dans les réglages du navigateur.","bad");return false}
  ls(RAPPEL_KEY+"-on","1");toast("Rappels activés 🐾 Tu seras prévenu·e avant tes cours.");return true;
}
async function showNotif(title,body){
  try{const r=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
    if(r){await r.showNotification(title,{body,icon:"icon-192.png",badge:"img/favicon.png",tag:title});return}
    new Notification(title,{body,icon:"icon-192.png"});
  }catch(e){toast(title+" – "+body)}
}
function checkRappels(){
  if(!isMember()||!rappelOn())return;
  let sent;try{sent=JSON.parse(ls(SENT_KEY)||"{}")}catch(e){sent={}}
  const now=Date.now(),lead=rappelMin()*60e3;let dirty=false;
  all("inscriptions").filter(i=>i.uid===ME.uid).forEach(i=>{
    const c=get("cours",i.cours);if(!c||c.annule)return;
    const t=startOf(c).getTime();if(t<now||t-now>lead||sent[c.id])return;
    sent[c.id]=now;dirty=true;
    const h=c.debut||"";const msg=`${fmtDay(c.date)}${h?" à "+h:""}${c.lieu?" · "+c.lieu:""}`;
    if(notifSupported()&&Notification.permission==="granted")showNotif("Bientôt : "+c.titre,msg);else toast("Rappel : "+c.titre+" – "+msg);
  });
  // On oublie les rappels de plus d'un mois.
  Object.keys(sent).forEach(k=>{if(now-sent[k]>30*864e5){delete sent[k];dirty=true}});
  if(dirty)ls(SENT_KEY,JSON.stringify(sent));
}
setInterval(checkRappels,60e3);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkRappels()});
