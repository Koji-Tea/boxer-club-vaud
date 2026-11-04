"use strict";
/* ---------- Rôles ----------
   Les mêmes droits sont vérifiés par la base dans firestore.rules : garder les deux fichiers d'accord. */
const ROLES={
  admin:{l:"Administrateur·rice",d:"Tout, y compris la validation des comptes et les rôles."},
  comite:{l:"Comité",d:"Gère le contenu du club, les comptes et les rôles (sauf administrateur)."},
  moniteur:{l:"Moniteur·rice",d:"Gère l’agenda des cours, les fiches moniteurs et le wiki."},
  eleveur:{l:"Éleveur·euse",d:"Membre qui publie et met à jour ses annonces de portées."},
  membre:{l:"Membre",d:"Membre du club : ajoute des cours à l’agenda (et modifie les siens), tchat, liste des adhérents."},
  adherent:{l:"Adhérent·e",d:"Participe aux cours : inscriptions, tchat, liste des adhérents."},
  attente:{l:"En attente",d:"Compte créé, en attente de validation par le comité."},
};
const MEMBERS=["admin","comite","moniteur","eleveur","membre","adherent"];
const STAFF=["admin","comite","moniteur"];
const BOARD=["admin","comite"];
const BREEDERS=["admin","comite","eleveur"];
/* Collections : pub = visibles par tout le monde (vitrine), sinon réservées aux membres validés. */
const COLS={
  cours:{pub:true,write:[...STAFF,"membre"]},
  moniteurs:{pub:true,write:STAFF},
  wiki:{pub:true,write:STAFF},
  comite:{pub:true,write:BOARD},
  urgences:{pub:true,write:BOARD},
  elevages:{pub:true,write:BREEDERS,own:true},
  portees:{pub:true,write:BREEDERS,own:true},
  inscriptions:{},
  messages:{},
  users:{},
};

let ME=null; // null = visiteur non connecté
const isMember=()=>!!ME&&MEMBERS.includes(ME.role);
const isStaff=()=>!!ME&&STAFF.includes(ME.role);
const isBoard=()=>!!ME&&BOARD.includes(ME.role);
const isAdmin=()=>!!ME&&ME.role==="admin";
const canWrite=c=>!!ME&&(COLS[c].write||[]).includes(ME.role);
// Une annonce de portée : le comité modifie tout, un·e éleveur·euse seulement les siennes.
// Cours : les moniteurs et le comité modifient tout, un·e membre seulement les cours qu’il ou elle a ajoutés.
const canEditCours=o=>isStaff()||(!!ME&&ME.role==="membre"&&!!o&&o.uid===ME.uid);
const canEditDoc=(c,o)=>canWrite(c)&&(!COLS[c].own||isBoard()||(o&&o.uid===ME.uid));

/* ---------- Club : infos de base (modifiables par le comité dans Réglages) ---------- */
const CLUB={
  nom:"Boxer Club Vaud",adresse:"Chemin de Fossaux, 1024 Ecublens (VD)",lat:46.52994,lon:6.54857,
  site:"https://boxerclubvaud.ch/",facebook:"https://fr-fr.facebook.com/people/Boxer-Club-Vaud/100007298597893",
  maps:"https://www.google.com/maps/place/Boxer+Club+Vaud/@46.5297442,6.5456997,17z/data=!3m1!4b1!4m5!3m4!1s0x478c312372f110bd:0xfda12347fd11970!8m2!3d46.5297442!4d6.5478884",
  dossier:"https://boxerclubvaud.ch/_wys-doc/0-dossier-compile-mars-2025.pdf",
  statutsBCV:"https://boxerclubvaud.ch/_wys-doc/statuts-bcv.pdf",statutsBCS:"https://boxerclubvaud.ch/_wys-doc/bcs-statut-2016-f.pdf",
  fac:"https://boxerclubvaud.ch/_wys-doc/formation-alternative-de-chiens.pdf",facVideos:"https://www.youtube.com/channel/UCmSi0uqQ3SfsTO3Os6xISyg",
  prix:"https://boxerclubvaud.ch/_wys-doc/vente-de-ve-tement-boxer-club-vaud-docx.pdf",catalogue:"https://viewer.joomag.com/clique-2025-swiss-fr/0676085001736773341?short&",
  commande:"https://docs.google.com/spreadsheets/d/1btk3U22VuLwEvJT56jnCPmFBNacCsoRFBdRD2fUh-NY/edit?gid=0#gid=0",
  twintImg:"https://boxerclubvaud.ch/_images/twint-boxer-club-avec-logo.png",
  galeries:"https://boxerclubvaud.ch/galeries/",bcs:"https://boxerhunde.ch/fr/",
};
let CFG={
  annonce:"",
  accueil:"Le Boxer Club Vaud est l’un des treize groupes locaux du Boxer Club Suisse. Fondé en 1961 à Lausanne, il réunit propriétaires, éleveurs et passionnés autour de l’éducation du chien, dans le jeu et la bonne humeur. Toutes les races sont les bienvenues !",
  acces:"Le terrain et la cabane sont en lisière de forêt, près de la Venoge, dans une zone naturelle : merci de tenir les chiens en laisse en arrivant et de ramasser leurs crottes. Les cours ont lieu par tout temps.",
  premiereVisite:"Pour une première visite, prenez contact avec la présidente, Delia, au 079 725 65 63.",
  detresse:"Boxer en détresse est une section du Boxer Club Suisse qui aide les boxers à trouver un nouveau foyer, sans passer par un refuge. Responsable romande : Suzanne Rochat, 076 481 89 25. Les frais d’adoption (500 CHF) et les dons financent la pension et les soins vétérinaires d’urgence. La section fonctionne sans subvention : chaque don compte.",
};

/* ---------- Données de départ (reprises de boxerclubvaud.ch) ---------- */
const SEED={
  comite:[
    {nom:"Delia",role:"Présidente",email:"president@boxerclubvaud.ch",tel:"079 725 65 63"},
    {nom:"Natascha",role:"Vice-présidente",email:"vice-president@boxerclubvaud.ch"},
    {nom:"Martina",role:"Secrétaire",email:"secretaire@boxerclubvaud.ch"},
    {nom:"Mandy",role:"Trésorière",email:"tresorier@boxerclubvaud.ch"},
    {nom:"Cécilia",role:"Représentante des membres au comité central",email:"rdm@boxerclubvaud.ch"},
    {nom:"Yan",role:"Président de cabane",email:"cabane@boxerclubvaud.ch"},
    {nom:"Walter",role:"Intendant de cabane",email:"cabane@boxerclubvaud.ch"},
    {nom:"Sylviane et Martina",role:"Monitorat",email:"monitorat@boxerclubvaud.ch"},
  ],
  moniteurs:[
    {nom:"Sylviane",titre:"Monitrice",email:"monitorat@boxerclubvaud.ch",bio:"Fiche à compléter : parcours, chiens, brevets et cours donnés.",specialites:"Éducation"},
    {nom:"Martina",titre:"Monitrice",email:"monitorat@boxerclubvaud.ch",bio:"Fiche à compléter : parcours, chiens, brevets et cours donnés.",specialites:"Éducation"},
  ],
  urgences:[
    {nom:"Urgences sanitaires (ambulance)",tel:"144",cat:"Personnes"},
    {nom:"Police",tel:"117",cat:"Personnes"},
    {nom:"Pompiers",tel:"118",cat:"Personnes"},
    {nom:"Numéro d’urgence européen",tel:"112",cat:"Personnes"},
    {nom:"Tox Info Suisse (intoxications, aussi pour les animaux)",tel:"145",cat:"Chiens",desc:"Chocolat, raisins, xylitol, mort-aux-rats, plantes : appeler tout de suite, puis le vétérinaire."},
    {nom:"Vétérinaire de garde",tel:"",cat:"Chiens",desc:"À compléter par le comité : clinique ou service de garde vétérinaire le plus proche d’Ecublens."},
    {nom:"Delia, présidente du club",tel:"079 725 65 63",cat:"Club"},
    {nom:"Boxer en détresse – Suzanne Rochat",tel:"076 481 89 25",cat:"Club",desc:"Responsable romande, pour un boxer qui doit trouver un nouveau foyer."},
  ],
  elevages:[
    {nom:"Combattants de la Guérite",eleveur:"Frédérique Christen",adresse:"Chalet « La Guérite », 1882 Les Posses-sur-Bex",tel:"078 606 12 56",tel2:"024 498 12 56",email:"frederique@chienboxer.ch",site:"http://www.chienboxer.ch"},
    {nom:"La Pierre du Teide",eleveur:"Sylviane Oberli",adresse:"Impasse des Pâturoirs, 1554 Sédeilles",tel:"079 661 32 82",tel2:"026 668 23 40",email:"sylviane.oberli@bluewin.ch",site:"http://www.boxerduteide.ch"},
  ],
  wiki:[
    {cat:"Le club",q:"Faut-il avoir un boxer pour suivre les cours ?",r:"Non. Le club est un club de race, mais toutes les races sont acceptées aux cours d’éducation."},
    {cat:"Le club",q:"Comment venir à un premier cours ?",r:"Prenez contact avec la présidente, Delia, au 079 725 65 63. Le dossier d’inscription au club se trouve dans la page Soutenir."},
    {cat:"Le club",q:"Que faut-il apporter au cours ?",r:"Une laisse et un collier ou un harnais, des friandises que votre chien aime, de l’eau, des sacs à crottes et une tenue adaptée à la météo : les cours ont lieu par tout temps."},
    {cat:"Le boxer",q:"Le boxer est-il un bon chien de famille ?",r:"Oui. Derrière son allure dissuasive, le boxer est doux, affectueux, joueur et très attaché à sa famille, enfants compris. Il est aussi sensible et obstiné : une éducation précoce et cohérente est indispensable."},
    {cat:"Le boxer",q:"Combien d’exercice lui faut-il ?",r:"Beaucoup : comptez 1 à 2 heures de promenade par jour, plus du jeu et des exercices d’éducation. Un boxer qui s’ennuie devient vite turbulent."},
    {cat:"Le boxer",q:"Quelle taille et quel poids ?",r:"Selon le standard, le mâle mesure 57 à 63 cm au garrot et dépasse 30 kg ; la femelle mesure 53 à 59 cm pour environ 25 kg."},
    {cat:"Le boxer",q:"Quelles couleurs de robe existe-t-il ?",r:"Fauve (du fauve clair au cerf foncé) ou bringé, avec ou sans marques blanches, et un masque noir."},
    {cat:"Le boxer",q:"Quelle est son espérance de vie ?",r:"En moyenne 10 à 12 ans. Une bonne alimentation, un poids de forme et un suivi vétérinaire régulier y contribuent."},
    {cat:"Le boxer",q:"À quel âge commencer l’éducation ?",r:"Dès l’arrivée du chiot à la maison. La socialisation (personnes, chiens, bruits, lieux) est essentielle avant 4 mois. Le boxer est obstiné : faites-vous accompagner par des moniteurs qualifiés."},
    {cat:"Santé",q:"Le boxer supporte-t-il la chaleur ?",r:"Mal. Son museau court le rend sensible à la chaleur. Par temps chaud : promenades tôt le matin ou le soir, de l’eau toujours disponible, de l’ombre, et jamais de chien dans une voiture au soleil, même quelques minutes."},
    {cat:"Santé",q:"Quels sont les signes d’un coup de chaleur ?",r:"Halètement très fort, langue et gencives très rouges ou violacées, bave épaisse, faiblesse, vomissements. Mettez le chien à l’ombre, mouillez-le avec de l’eau fraîche (pas glacée) et appelez le vétérinaire tout de suite."},
    {cat:"Santé",q:"Qu’est-ce que la torsion d’estomac ?",r:"Une urgence vitale fréquente chez les grands chiens à poitrine profonde. Signes : ventre qui gonfle, tentatives de vomir sans résultat, agitation, salivation. Partez immédiatement chez le vétérinaire. Prévention : deux repas par jour plutôt qu’un, et pas d’effort intense juste avant ou après le repas."},
    {cat:"Santé",q:"Quelles maladies surveiller chez le boxer ?",r:"Surtout le cœur (cardiomyopathie, sténose aortique), la dysplasie de la hanche, certaines tumeurs de la peau et la torsion d’estomac. Demandez à l’éleveur les tests de santé des parents et faites contrôler votre chien régulièrement."},
    {cat:"Santé",q:"Mon chien a mangé du chocolat ou du raisin, que faire ?",r:"Appelez immédiatement Tox Info Suisse au 145 (ils conseillent aussi pour les animaux) et votre vétérinaire. Le chocolat, les raisins (frais ou secs), le xylitol (chewing-gums), l’oignon et l’ail sont toxiques pour le chien."},
    {cat:"Au quotidien",q:"Combien de repas par jour ?",r:"Trois à quatre repas pour un chiot, puis deux repas par jour pour l’adulte. Adaptez la quantité à son activité et surveillez sa silhouette : on doit sentir les côtes sans les voir."},
    {cat:"Au quotidien",q:"Le boxer perd-il ses poils ?",r:"Un peu. Son poil court demande peu d’entretien : un brossage par semaine avec un gant suffit."},
    {cat:"Au quotidien",q:"Quelles démarches pour un chien en Suisse ?",r:"Le chien doit être identifié par une puce électronique et enregistré dans la banque de données AMICUS, puis déclaré à la commune (impôt sur les chiens). Une assurance responsabilité civile est vivement conseillée. Vérifiez auprès de votre commune les règles du canton de Vaud."},
    {cat:"Au quotidien",q:"Je dois me séparer de mon boxer, que faire ?",r:"Contactez Boxer en détresse (Suzanne Rochat, 076 481 89 25). Le chien reste souvent chez vous jusqu’à ce qu’une nouvelle famille soit trouvée."},
  ],
};
// Exemples affichés seulement en mode essai (sans base de données), pour voir l'app remplie.
function demoData(){
  const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return isoDay(x)};
  const nextDow=(dow,w=0)=>{const x=new Date();x.setDate(x.getDate()+((dow-x.getDay()+7)%7||7)+7*w);return isoDay(x)};
  const M=[...S.moniteurs.values()];
  const cours=[];
  for(let w=0;w<4;w++){
    cours.push({type:"cours",titre:"Éducation – débutants",date:nextDow(6,w),debut:"09:30",fin:"10:30",lieu:"Terrain d’Ecublens",niveau:"Débutants",moniteur:M[0]&&M[0].id,places:8,description:"Bases de l’éducation : marche en laisse, rappel, assis, couché, attente."});
    cours.push({type:"cours",titre:"Éducation – avancés",date:nextDow(6,w),debut:"10:45",fin:"11:45",lieu:"Terrain d’Ecublens",niveau:"Avancés",moniteur:M[1]&&M[1].id,places:8,description:"Exercices du règlement FAC du Boxer Club Suisse."});
  }
  cours.push({type:"evenement",titre:"Balade en forêt et pique-nique",date:nextDow(0,2),debut:"10:00",fin:"15:00",lieu:"Départ de la cabane",niveau:"Tous",places:30,description:"Balade le long de la Venoge, puis pique-nique canadien à la cabane."});
  const e=[...S.elevages.values()][1];
  return{cours,
    portees:e?[{elevage:e.id,mere:"Cassiopée du Teide",pere:"Orion vom Haus",naissance:d(-35),dispoDes:d(35),description:"Chiots élevés en famille, vermifugés, vaccinés et pucés. Parents testés cœur.",chiots:[
      {nom:"Collier rouge",sexe:"M",robe:"Fauve",dispo:false},{nom:"Collier bleu",sexe:"M",robe:"Bringé",dispo:true},{nom:"Collier vert",sexe:"M",robe:"Fauve",dispo:true},
      {nom:"Collier rose",sexe:"F",robe:"Bringée",dispo:false},{nom:"Collier jaune",sexe:"F",robe:"Fauve",dispo:true}]}]:[],
    messages:[
      {uid:"demo1",pseudo:"Rocky_et_moi",texte:"Salut tout le monde ! Quelqu’un a un bon plan pour un harnais anti-traction ?",at:new Date(Date.now()-5400e3).toISOString()},
      {uid:"demo2",pseudo:"Nala",texte:"On utilise un harnais en Y depuis 6 mois, je l’apporte samedi pour te montrer 🙂",at:new Date(Date.now()-3000e3).toISOString()},
    ],
    users:[
      {id:"demo1",pseudo:"Rocky_et_moi",prenom:"Julien",chien:"Rocky",chiens:[{nom:"Rocky",sexe:"M",naissance:"2023-04-12",race:"Boxer",remarque:"Castré. Un peu timide avec les grands chiens."}],role:"adherent"},
      {id:"demo2",pseudo:"Nala",prenom:"Sophie",chien:"Nala",chiens:[{nom:"Nala",sexe:"F",naissance:"2021-09-02",race:"Boxer bringée",remarque:"Stérilisée."}],role:"membre"},
      {id:"demo3",pseudo:"Bella22",prenom:"Marc",chien:"Bella",chiens:[{nom:"Bella",sexe:"F",naissance:"2025-06-20",race:"Labrador",remarque:"Chiot, pas encore stérilisée."}],role:"attente"},
    ]};
}

/* ---------- Stockage ----------
   Mode « cloud » : Firebase (données partagées). Mode « essai » : sans configuration, tout reste dans ce navigateur. */
let S=Object.fromEntries(Object.keys(COLS).map(c=>[c,new Map()]));
let MODE="loading",DB=null,AUTH=null;
const LSKEY="bcv-data-v1";
const all=c=>[...S[c].values()];
const get=(c,id)=>S[c].get(id);
let renderT;
function changed(){clearTimeout(renderT);renderT=setTimeout(()=>window.render&&render(),16)}
const clean=o=>JSON.parse(JSON.stringify(o,(k,v)=>k==="id"||k.startsWith("_")?undefined:v));
function dbErr(e){
  console.error(e);
  if(e&&e.code==="permission-denied")toast("Ton rôle ne permet pas cette modification.","bad");
  else toast("Enregistrement impossible pour l’instant. Vérifie la connexion puis réessaie.","bad");
}
async function put(col,o){
  o={...o};if(!o.id)o.id=uid();const now=new Date().toISOString();if(!o.createdAt)o.createdAt=now;o.updatedAt=now;
  if(COLS[col].own&&!o.uid&&ME)o.uid=ME.uid;
  S[col].set(o.id,o);changed();
  if(MODE==="cloud"){try{await DB.collection(col).doc(o.id).set(clean(o))}catch(e){dbErr(e);throw e}}else saveLocal();
  return o;
}
async function del(col,id){
  const old=S[col].get(id);S[col].delete(id);changed();
  if(MODE==="cloud"){try{await DB.collection(col).doc(id).delete()}catch(e){if(old)S[col].set(id,old);changed();dbErr(e)}}else saveLocal();
}
async function putCfg(p){
  CFG={...CFG,...p};changed();
  if(MODE==="cloud"){try{await DB.doc("config/main").set(clean(CFG))}catch(e){dbErr(e)}}else saveLocal();
}
let saveT;
function saveLocal(){clearTimeout(saveT);saveT=setTimeout(()=>{ls(LSKEY,JSON.stringify({cfg:CFG,me:ME,data:Object.fromEntries(Object.keys(COLS).map(c=>[c,all(c)]))}))},120)}
function seedInto(target,list,withOrder=true){return list.map((o,i)=>({...o,id:uid()+i,...(withOrder?{ordre:i}:{}),createdAt:new Date().toISOString()}))}
function loadLocal(){
  let j=null;try{j=JSON.parse(ls(LSKEY)||"null")}catch(e){}
  if(j){CFG={...CFG,...j.cfg};ME=j.me===undefined?ME:j.me;Object.keys(COLS).forEach(c=>{S[c]=new Map((j.data[c]||[]).map(o=>[o.id,o]))});return}
  ["comite","moniteurs","urgences","elevages","wiki"].forEach(c=>{S[c]=new Map(seedInto(c,SEED[c]).map(o=>[o.id,o]))});
  const demo=demoData();
  Object.entries(demo).forEach(([c,list])=>list.forEach((o,i)=>{const id=o.id||uid()+i;S[c].set(id,{...o,id,createdAt:new Date().toISOString()})}));
  ME={uid:"local",pseudo:"Essai",prenom:"",chien:"",chiens:[],role:"admin"};
  S.users.set("local",{id:"local",...ME});
  saveLocal();
}
// Mode essai : on peut changer de rôle pour voir l'app comme un visiteur, un·e adhérent·e, le comité…
function demoRole(r){
  if(r==="visiteur")ME=null;else{ME={uid:"local",pseudo:"Essai",role:r,...(ME||{}),role:r};S.users.set("local",{id:"local",...ME})}
  saveLocal();changed();
}

/* ---------- Firebase ---------- */
let unsubs=[],REGISTERING=false;
function listenPublic(){
  Object.keys(COLS).filter(c=>COLS[c].pub).forEach(c=>{
    DB.collection(c).onSnapshot(s=>{S[c]=new Map(s.docs.map(d=>[d.id,{...d.data(),id:d.id}]));changed()},e=>console.warn(c,e.code));
  });
  DB.doc("config/main").onSnapshot(s=>{if(s.exists)CFG={...CFG,...s.data()};changed()},()=>{});
}
function listenMembers(){
  unsubs.forEach(u=>u());unsubs=[];
  ["inscriptions","messages","users"].forEach(c=>S[c]=new Map());
  if(!ME)return;
  const sub=(c,q)=>unsubs.push(q.onSnapshot(s=>{S[c]=new Map(s.docs.map(d=>[d.id,{...d.data(),id:d.id}]));changed()},e=>console.warn(c,e.code)));
  // Son propre profil : un changement de rôle par le comité s'applique tout de suite.
  unsubs.push(DB.doc("users/"+ME.uid).onSnapshot(s=>{if(!s.exists)return;const p=s.data();const was=isMember();ME={...ME,...p};if(isMember()!==was)listenMembers();changed()},()=>{}));
  if(!isMember())return;
  sub("users",DB.collection("users"));
  sub("inscriptions",DB.collection("inscriptions"));
  sub("messages",DB.collection("messages").orderBy("at","desc").limit(200));
}
async function connect(){
  const conf=window.BCV_FIREBASE_CONFIG;
  if(!conf||!window.firebase)return false;
  firebase.initializeApp(conf);
  DB=firebase.firestore();AUTH=firebase.auth();
  if(window.BCV_EMULATEUR){AUTH.useEmulator("http://localhost:9099");DB.useEmulator("localhost",8080)}
  DB.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  MODE="cloud";listenPublic();
  AUTH.onAuthStateChanged(async u=>{
    if(REGISTERING)return; // register() s'occupe du profil
    if(!u){ME=null;listenMembers();changed();return}
    let p=null;try{const s=await DB.doc("users/"+u.uid).get();p=s.exists?s.data():null}catch(e){}
    if(!p){// Compte sans profil (inscription interrompue) : on propose de terminer l'inscription.
      ME={uid:u.uid,email:u.email,role:"attente",pseudo:"",_noProfile:true};
    }else ME={uid:u.uid,email:u.email,...p};
    listenMembers();changed();
  });
  return true;
}
async function initStore(){
  let ok=false;try{ok=await connect()}catch(e){console.error(e);ok=false}
  if(!ok){MODE="local";loadLocal()}
  changed();
}

/* ---------- Comptes ----------
   Chaque compte peut décrire ses chiens : {nom, sexe (M/F), naissance, race, photo, remarque (castré, stérilisée…)}. */
const nomsChiens=l=>(l||[]).map(c=>c.nom).filter(Boolean).join(", ");
const SEXES={M:"Mâle",F:"Femelle"};
const PSEUDO_RE=/^[A-Za-z0-9À-ÿ._-]{3,20}$/;
const pseudoKey=p=>norm(p).replace(/[^a-z0-9._-]/g,"");
async function register({pseudo,email,pass,prenom,chiens}){
  if(!PSEUDO_RE.test(pseudo))throw new Error("Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, point, tiret ou souligné.");
  if(MODE!=="cloud"){ME={uid:"local",pseudo,prenom,chiens:chiens||[],chien:nomsChiens(chiens),role:"admin"};S.users.set("local",{id:"local",...ME});saveLocal();changed();return}
  const key=pseudoKey(pseudo);
  const taken=await DB.doc("pseudos/"+key).get().then(s=>s.exists).catch(()=>false);
  if(taken)throw new Error("Ce pseudo est déjà pris. Choisis-en un autre.");
  let cred;REGISTERING=true;
  try{cred=await AUTH.createUserWithEmailAndPassword(email,pass)}
  catch(e){REGISTERING=false;throw new Error({"auth/email-already-in-use":"Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.","auth/weak-password":"Mot de passe trop court : 6 caractères au minimum.","auth/invalid-email":"Adresse e-mail invalide."}[e.code]||"Inscription impossible : "+(e.message||e.code))}
  try{await finishProfile(cred.user,{pseudo,prenom,chiens})}
  catch(e){await cred.user.delete().catch(()=>{});ME=null;throw e}
  finally{REGISTERING=false}
}
// Crée la fiche et réserve le pseudo. Le tout premier compte devient administrateur.
async function finishProfile(user,{pseudo,prenom,chiens}){
  const key=pseudoKey(pseudo);
  const first=!(await DB.doc("config/setup").get().then(s=>s.exists).catch(()=>true));
  const prof={pseudo,pk:key,prenom:prenom||"",chiens:chiens||[],chien:nomsChiens(chiens),role:first?"admin":"attente",at:new Date().toISOString()};
  const b=DB.batch();
  b.set(DB.doc("pseudos/"+key),{uid:user.uid,email:user.email});
  b.set(DB.doc("users/"+user.uid),prof);
  if(first)b.set(DB.doc("config/setup"),{admin:user.uid,at:prof.at});
  try{await b.commit()}catch(e){throw new Error(e.code==="permission-denied"?"Ce pseudo est déjà pris. Choisis-en un autre.":"Inscription impossible pour l’instant, réessaie.")}
  ME={uid:user.uid,email:user.email,...prof};listenMembers();changed();
}
// Connexion avec le pseudo ou l'e-mail.
async function login(id,pass){
  id=id.trim();let email=id;
  if(!id.includes("@")){
    const s=await DB.doc("pseudos/"+pseudoKey(id)).get().catch(()=>null);
    if(!s||!s.exists)throw new Error("Pseudo ou mot de passe incorrect.");
    email=s.data().email;
  }
  try{await AUTH.signInWithEmailAndPassword(email,pass)}catch(e){throw new Error(e.code==="auth/too-many-requests"?"Trop d’essais. Patiente quelques minutes.":"Pseudo ou mot de passe incorrect.")}
}
async function logout(){if(MODE==="cloud")await AUTH.signOut();else demoRole("visiteur")}
async function resetPassword(id){
  let email=id.trim();
  if(!email.includes("@")){const s=await DB.doc("pseudos/"+pseudoKey(email)).get().catch(()=>null);email=s&&s.exists?s.data().email:""}
  if(email)await AUTH.sendPasswordResetEmail(email).catch(()=>{});
}
async function updateProfile(p){
  const old=ME.pseudo;
  if(p.pseudo&&p.pseudo!==old){
    if(!PSEUDO_RE.test(p.pseudo))throw new Error("Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, point, tiret ou souligné.");
    if(MODE==="cloud"){
      const k=pseudoKey(p.pseudo),ko=pseudoKey(old);
      if(k!==ko){
        const s=await DB.doc("pseudos/"+k).get();if(s.exists)throw new Error("Ce pseudo est déjà pris.");
        const b=DB.batch();b.set(DB.doc("pseudos/"+k),{uid:ME.uid,email:ME.email});if(old)b.delete(DB.doc("pseudos/"+ko));
        b.update(DB.doc("users/"+ME.uid),{pseudo:p.pseudo,pk:k});await b.commit();
      }else await DB.doc("users/"+ME.uid).update({pseudo:p.pseudo});
    }
  }
  const rest={prenom:p.prenom||"",photo:p.photo||"",chiens:p.chiens||ME.chiens||[]};rest.chien=nomsChiens(rest.chiens);
  ME={...ME,...rest,pseudo:p.pseudo||old};
  if(MODE==="cloud")await DB.doc("users/"+ME.uid).update(rest);else{S.users.set("local",{id:"local",...ME});saveLocal()}
  changed();
}
async function setRole(id,role){
  if(MODE==="cloud"){try{await DB.doc("users/"+id).update({role})}catch(e){dbErr(e)}}
  else{const u=get("users",id);if(u){S.users.set(id,{...u,role});if(id==="local")ME={...ME,role};saveLocal();changed()}}
}
async function removeUser(u){
  if(MODE==="cloud"){
    try{const b=DB.batch();b.delete(DB.doc("users/"+u.id));if(u.pseudo)b.delete(DB.doc("pseudos/"+pseudoKey(u.pseudo)));await b.commit()}catch(e){dbErr(e)}
  }else{S.users.delete(u.id);saveLocal();changed()}
}
// Premier administrateur en ligne : copie le contenu de départ (comité, wiki, urgences…) si la base est vide.
async function importSeed(){
  for(const c of ["comite","moniteurs","urgences","elevages","wiki"]){
    if(S[c].size)continue;
    for(const o of seedInto(c,SEED[c]))await put(c,o);
  }
  await putCfg({});
}

/* ---------- Inscriptions aux cours ---------- */
const insId=(c,u)=>c+"_"+u;
const inscritsDe=cid=>all("inscriptions").filter(i=>i.cours===cid);
const estInscrit=cid=>!!ME&&S.inscriptions.has(insId(cid,ME.uid));
async function sInscrire(c){
  const o={id:insId(c.id,ME.uid),cours:c.id,uid:ME.uid,pseudo:ME.pseudo||"",chien:ME.chien||"",at:new Date().toISOString()};
  S.inscriptions.set(o.id,o);changed();
  if(MODE==="cloud"){try{await DB.doc("inscriptions/"+o.id).set(clean(o))}catch(e){S.inscriptions.delete(o.id);changed();dbErr(e);return false}}else saveLocal();
  return true;
}
const seDesinscrire=c=>del("inscriptions",insId(c.id,ME.uid));

/* ---------- Tchat ---------- */
async function sendMessage(texte){
  const o={id:uid(),uid:ME.uid,pseudo:ME.pseudo||"",texte:texte.slice(0,2000),at:new Date().toISOString()};
  S.messages.set(o.id,o);changed();
  if(MODE==="cloud"){try{await DB.doc("messages/"+o.id).set(clean(o))}catch(e){S.messages.delete(o.id);changed();dbErr(e)}}else saveLocal();
}
