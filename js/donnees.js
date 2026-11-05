"use strict";
/* ---------- Rôles ----------
   Les mêmes droits sont vérifiés par la base dans firestore.rules : garder les deux fichiers d'accord. */
const ROLES={
  admin:{l:"Administrateur·rice",d:"Accès complet, y compris tous les rôles."},
  president:{l:"Président·e",d:"Accès complet : cours et agenda, adhérents, cotisations, comptabilité, cabane. Peut nommer le/la caissier·ère."},
  caissier:{l:"Caissier·ère",d:"Comptabilité, notes de frais, cotisations et adhérents. Ne modifie pas les cours ni l’agenda."},
  resp_elevage:{l:"Responsable élevage",d:"Comité : cours et agenda, élevages et portées, cabane. Ne modifie pas la comptabilité ni les adhérents."},
  resp_cabane:{l:"Responsable de la cabane",d:"Comité : gestion de la cabane, cours et agenda. Ne modifie pas la comptabilité ni les adhérents."},
  resp_membres:{l:"Responsable membres",d:"Comité : adhérents, comptes et cotisations. Ne modifie pas la comptabilité, les cours ni l’agenda."},
  comite:{l:"Membre du comité",d:"Comité : voit la comptabilité et la cabane, gère les adhérents. Ne modifie pas la comptabilité, les cours ni l’agenda."},
  educ:{l:"Responsable éducation",d:"Comité : crée, modifie et annule les cours, gère les moniteurs et répond aux questions du wiki."},
  moniteur:{l:"Moniteur·rice",d:"Gère l’agenda des cours, les fiches moniteurs et le wiki."},
  eleveur:{l:"Éleveur·euse",d:"Publie et met à jour ses annonces de portées."},
  adherent:{l:"Adhérent·e",d:"Inscriptions aux cours, tchat et groupes, messages privés, liste des adhérents."},
  membre:{l:"Membre (ancien rôle)",d:"Ancien rôle : mêmes droits qu’un·e adhérent·e.",old:true},
  attente:{l:"En attente",d:"Compte créé, en attente de validation par le comité."},
};
const MEMBERS=Object.keys(ROLES).filter(r=>r!=="attente");
// Le comité : voit la comptabilité, la cabane, les contacts et les cotisations des adhérents.
const COMITE=["admin","president","caissier","resp_elevage","resp_cabane","resp_membres","comite","educ"];
const COURS_EDIT=["admin","president","resp_elevage","resp_cabane","educ","moniteur"]; // cours, agenda, moniteurs
const ADH_EDIT=["admin","president","caissier","resp_membres","comite"];              // comptes et rôles des adhérents
const COTIS_EDIT=["admin","president","caissier","resp_membres"];                    // coche des cotisations
const COMPTA_EDIT=["admin","president","caissier"];                                  // comptabilité, factures, notes payées
// Rôles donnés seulement par l'admin ou le/la président·e (admin : seulement par l'admin).
const SENSITIVE=["admin","president","caissier"];
/* Collections : pub = visibles par tout le monde (vitrine), sinon réservées aux membres validés (ou au comité). */
const COLS={
  cours:{pub:true,write:COURS_EDIT},
  moniteurs:{pub:true,write:COURS_EDIT},
  wiki:{pub:true,write:[...COMITE,"moniteur"]},
  comite:{pub:true,write:COMITE},
  urgences:{pub:true,write:COMITE},
  elevages:{pub:true,write:[...COMITE,"eleveur"],own:true},
  portees:{pub:true,write:[...COMITE,"eleveur"],own:true},
  inscriptions:{},
  messages:{},      // tchat général
  groupes:{write:COMITE},gmsgs:{}, // groupes de discussion (messages dans groupes/{id}/msgs)
  convs:{},dmsgs:{},// messages privés (convs/{a_b}/msgs)
  notifs:{},
  users:{},
  prives:{},        // e-mail et téléphone : la personne et le comité seulement
  cotisations:{},   // un document par compte : {paye:{"2026":true},date:{"2026":"2026-03-01"}}
  compta:{write:COMPTA_EDIT},ecritures:{write:COMPTA_EDIT},factures:{write:COMPTA_EDIT},notes:{write:COMITE},
  cabane:{write:COMITE},
  fichiers:{},      // factures et tickets scannés
};

let ME=null; // null = visiteur non connecté
const hasRole=l=>!!ME&&l.includes(ME.role);
const isMember=()=>hasRole(MEMBERS);
const isComite=()=>hasRole(COMITE);
const isCoursEdit=()=>hasRole(COURS_EDIT);
const isAdhEdit=()=>hasRole(ADH_EDIT);
const isCotisEdit=()=>hasRole(COTIS_EDIT);
const isComptaEdit=()=>hasRole(COMPTA_EDIT);
const isAdmin=()=>!!ME&&ME.role==="admin";
const isChef=()=>hasRole(["admin","president"]);
const canWrite=c=>hasRole(COLS[c].write||[]);
const canEditCours=o=>isCoursEdit();
// Une annonce de portée : le comité modifie tout, un·e éleveur·euse seulement les siennes.
const canEditDoc=(c,o)=>canWrite(c)&&(!COLS[c].own||isComite()||(o&&o.uid===ME.uid));
// Qui peut donner un rôle : admin seulement par l'admin ; président·e et caissier·ère par l'admin ou le/la président·e.
const canGiveRole=(from,to)=>isAdmin()||(isChef()&&from!=="admin"&&to!=="admin")||(!SENSITIVE.includes(from)&&!SENSITIVE.includes(to));

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
  instagram:"https://www.instagram.com/boxer_club_vaud?utm_source=ig_web_button_share_sheet&obrf=ZDNlZDc0MzIxNw==",
};
let CFG={
  annonce:"",
  accueil:"Le Boxer Club Vaud est l’un des treize groupes locaux du Boxer Club Suisse. Fondé en 1961 à Lausanne, il réunit propriétaires, éleveurs et passionnés autour de l’éducation du chien, dans le jeu et la bonne humeur. Toutes les races sont les bienvenues !",
  acces:"Le terrain et la cabane sont en lisière de forêt, près de la Venoge, dans une zone naturelle : merci de tenir les chiens en laisse en arrivant et de ramasser leurs crottes. Les cours ont lieu par tout temps.",
  premiereVisite:"Pour une première visite, prenez contact avec le président, Vincent, au 079 252 77 49.",
  telClub:"079 252 77 49", // numéro du bouton « Contacter le club » de l’accueil
  cotisation:70,          // cotisation annuelle Boxer Club Vaud, en CHF
  qrAdhesion:"",          // QR code de paiement de l’adhésion remplacé dans Réglages ; sinon img/qr-adhesion.png
};
const qrSrc=()=>CFG.qrAdhesion||"img/qr-adhesion.png";
const _cfgEnd={
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
  const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return isoDay(x)};const an=String(new Date().getFullYear());
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
      {id:"demo2",pseudo:"Nala",prenom:"Sophie",chien:"Nala",bcv:true,bcs:true,chiens:[{nom:"Nala",sexe:"F",naissance:"2021-09-02",race:"Boxer bringée",remarque:"Stérilisée."}],role:"adherent"},
      {id:"demo4",pseudo:"Mandy",prenom:"Mandy",chien:"",chiens:[],role:"caissier"},
      {id:"demo3",pseudo:"Bella22",prenom:"Marc",chien:"Bella",chiens:[{nom:"Bella",sexe:"F",naissance:"2025-06-20",race:"Labrador",remarque:"Chiot, pas encore stérilisée."}],role:"attente"},
    ],
    cotisations:[{id:"demo2",paye:{[an]:true},date:{[an]:d(-40)}}],
    prives:[{id:"demo1",email:"julien@exemple.ch",tel:"079 000 00 01"},{id:"demo2",email:"sophie@exemple.ch",tel:"079 000 00 02"},{id:"demo4",email:"tresorier@boxerclubvaud.ch"}],
    groupes:[{nom:"Balades du dimanche",desc:"Pour organiser les balades entre membres.",membres:["demo1","demo2"],uid:"local"}],
    compta:[{id:an,club:8420.5,cabane:2310,majLe:d(-3)}],
    ecritures:[{annee:an,date:d(-60),libelle:"Vente de vêtements",cat:"Vente vêtements",compte:"club",sens:"recette",montant:340},
      {annee:an,date:d(-20),libelle:"Assurance RC du club",cat:"Assurances",compte:"club",sens:"depense",montant:480}],
    factures:[{annee:an,date:d(-10),fournisseur:"Gaz Romand SA",objet:"Bouteille de gaz 10,5 kg",montant:62.4,echeance:d(20),compte:"cabane",payee:false}],
    notes:[{annee:an,uid:"demo4",pseudo:"Mandy",motif:"Friandises pour les cours",date:d(-5),montant:38.9,payee:false,at:new Date().toISOString()}],
    cabane:[
      {kind:"echeance",nom:"Bouteille de gaz",derniere:d(-300),frequence:12,prochaine:d(65),remarque:"Fournisseur : Gaz Romand"},
      {kind:"echeance",nom:"Extincteur (contrôle)",derniere:d(-700),frequence:24,prochaine:d(-5)},
      {kind:"echeance",nom:"Trousse de secours",derniere:d(-200),frequence:12,prochaine:d(165)},
      {kind:"inventaire",nom:"Tables pliantes",quantite:6,lieu:"Réduit",etat:"Bon"},
      {kind:"inventaire",nom:"Haies d’agility",quantite:8,lieu:"Container",etat:"2 à réparer"},
      {kind:"travaux",nom:"Repeindre la terrasse",montant:450,priorite:"Moyenne",statut:"A faire"},
      {kind:"fournisseur",nom:"Gaz Romand SA",categorie:"Gaz",tel:"021 000 00 00"},
      {kind:"cle",nom:"Yan",nombre:2,remarque:"Clé cabane + cadenas container"}]};
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
// Copie propre pour la base : sans l’identifiant du document ni les champs temporaires (_…). Les id des pièces jointes restent.
const clean=o=>{const c=JSON.parse(JSON.stringify(o,(k,v)=>k.startsWith("_")?undefined:v));delete c.id;return c};
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
// Abonnements qui s'ouvrent à la demande : messages d'un groupe ou d'une conversation privée.
let DYN={};
function dynSub(key,col,q){
  if(DYN[key]||MODE!=="cloud")return;
  DYN[key]=q.onSnapshot(s=>{s.docChanges().forEach(ch=>{const d={...ch.doc.data(),id:ch.doc.id};if(ch.type==="removed")S[col].delete(d.id);else S[col].set(d.id,d)});changed()},
    e=>{console.warn(key,e.code);delete DYN[key]});
}
function dynOff(key){if(key){if(DYN[key])DYN[key]();delete DYN[key];return}Object.values(DYN).forEach(u=>u());DYN={}}
const PRIVATE_COLS=Object.keys(COLS).filter(c=>!COLS[c].pub);
function listenMembers(){
  unsubs.forEach(u=>u());unsubs=[];dynOff();
  PRIVATE_COLS.forEach(c=>S[c]=new Map());
  if(!ME)return;
  const sub=(c,q)=>unsubs.push(q.onSnapshot(s=>{S[c]=new Map(s.docs.map(d=>[d.id,{...d.data(),id:d.id}]));changed()},e=>console.warn(c,e.code)));
  const subDoc=(c,ref)=>unsubs.push(ref.onSnapshot(s=>{S[c]=new Map(s.exists?[[s.id,{...s.data(),id:s.id}]]:[]);changed()},e=>console.warn(c,e.code)));
  // Son propre profil : un changement de rôle par le comité s'applique tout de suite.
  unsubs.push(DB.doc("users/"+ME.uid).onSnapshot(s=>{if(!s.exists)return;const was=ME.role;ME={...ME,...s.data()};if(ME.role!==was)listenMembers();changed()},()=>{}));
  if(!isMember())return;
  sub("users",DB.collection("users"));
  sub("inscriptions",DB.collection("inscriptions"));
  sub("messages",DB.collection("messages").orderBy("at","desc").limit(200));
  sub("groupes",DB.collection("groupes"));
  sub("notifs",DB.collection("notifs").where("to","==",ME.uid));
  sub("convs",DB.collection("convs").where("p","array-contains",ME.uid));
  if(isComite()){
    ["prives","cotisations","compta","ecritures","factures","notes","cabane"].forEach(c=>sub(c,DB.collection(c)));
  }else{
    subDoc("prives",DB.doc("prives/"+ME.uid));subDoc("cotisations",DB.doc("cotisations/"+ME.uid));
  }
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
    }else{
      ME={uid:u.uid,email:u.email,...p};
      // Anciens comptes : l'e-mail n'était pas encore dans les contacts privés.
      DB.doc("prives/"+u.uid).get().then(s=>{if(!s.exists)return DB.doc("prives/"+u.uid).set({email:u.email})}).catch(()=>{});
    }
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
async function register({pseudo,email,pass,prenom,chiens,tel,bcv,bcs}){
  if(!PSEUDO_RE.test(pseudo))throw new Error("Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, point, tiret ou souligné.");
  if(MODE!=="cloud"){ME={uid:"local",pseudo,prenom,bcv:!!bcv,bcs:!!bcs,chiens:chiens||[],chien:nomsChiens(chiens),role:"admin"};S.users.set("local",{id:"local",...ME});S.prives.set("local",{id:"local",email,tel:tel||""});saveLocal();changed();return}
  const key=pseudoKey(pseudo);
  const taken=await DB.doc("pseudos/"+key).get().then(s=>s.exists).catch(()=>false);
  if(taken)throw new Error("Ce pseudo est déjà pris. Choisis-en un autre.");
  let cred;REGISTERING=true;
  try{cred=await AUTH.createUserWithEmailAndPassword(email,pass)}
  catch(e){REGISTERING=false;throw new Error({"auth/email-already-in-use":"Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.","auth/weak-password":"Mot de passe trop court : 6 caractères au minimum.","auth/invalid-email":"Adresse e-mail invalide."}[e.code]||"Inscription impossible : "+(e.message||e.code))}
  try{await finishProfile(cred.user,{pseudo,prenom,chiens,tel,bcv,bcs})}
  catch(e){await cred.user.delete().catch(()=>{});ME=null;throw e}
  finally{REGISTERING=false}
}
// Crée la fiche et réserve le pseudo. Le tout premier compte devient administrateur.
async function finishProfile(user,{pseudo,prenom,chiens,tel,bcv,bcs}){
  const key=pseudoKey(pseudo);
  const first=!(await DB.doc("config/setup").get().then(s=>s.exists).catch(()=>true));
  const prof={pseudo,pk:key,prenom:prenom||"",bcv:!!bcv,bcs:!!bcs,chiens:chiens||[],chien:nomsChiens(chiens),role:first?"admin":"attente",at:new Date().toISOString()};
  const b=DB.batch();
  b.set(DB.doc("pseudos/"+key),{uid:user.uid,email:user.email});
  b.set(DB.doc("users/"+user.uid),prof);
  b.set(DB.doc("prives/"+user.uid),{email:user.email,tel:tel||""});
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
  const rest={prenom:p.prenom||"",photo:p.photo||"",chiens:p.chiens||ME.chiens||[],bcv:p.bcv??!!ME.bcv,bcs:p.bcs??!!ME.bcs};rest.chien=nomsChiens(rest.chiens);
  if(p.tel!==undefined)await savePrive({tel:p.tel});
  ME={...ME,...rest,pseudo:p.pseudo||old};
  if(MODE==="cloud")await DB.doc("users/"+ME.uid).update(rest);else{S.users.set("local",{id:"local",...ME});saveLocal()}
  changed();
}
async function setRole(id,role){
  const u=get("users",id);if(u&&!canGiveRole(u.role,role)){toast("Seul·e l’admin ou le/la président·e peut donner ou retirer ce rôle.","bad");return}
  if(MODE==="cloud"){try{await DB.doc("users/"+id).update({role})}catch(e){dbErr(e)}}
  else{const u=get("users",id);if(u){S.users.set(id,{...u,role});if(id==="local")ME={...ME,role};saveLocal();changed()}}
}
/* ---------- Contacts privés ---------- */
const priveDe=uid=>get("prives",uid)||{};
async function savePrive(p){
  const o={...(get("prives",ME.uid)||{}),...p,id:ME.uid};if(!o.email&&ME.email)o.email=ME.email;
  S.prives.set(ME.uid,o);changed();
  if(MODE==="cloud"){try{await DB.doc("prives/"+ME.uid).set(clean(o),{merge:true})}catch(e){dbErr(e)}}else saveLocal();
}
/* ---------- Cotisations ---------- */
const anneeCotis=()=>String(new Date().getFullYear());
const cotisPayee=(uid,an=anneeCotis())=>!!((get("cotisations",uid)||{}).paye||{})[an];
const cotisDate=(uid,an=anneeCotis())=>((get("cotisations",uid)||{}).date||{})[an]||"";
const montantCotis=()=>Number(CFG.cotisation)||70;
async function setCotis(uid,val,date,an=anneeCotis()){
  const o=get("cotisations",uid)||{id:uid,paye:{},date:{}};
  const dt=val?(date||cotisDate(uid,an)||today()):"";
  const n={...o,id:uid,paye:{...(o.paye||{}),[an]:!!val},date:{...(o.date||{}),[an]:dt},by:ME.pseudo||"",at:new Date().toISOString()};
  S.cotisations.set(uid,n);changed();
  if(MODE==="cloud"){try{await DB.doc("cotisations/"+uid).set(clean(n))}catch(e){S.cotisations.set(uid,o);changed();dbErr(e)}}else saveLocal();
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


/* ---------- Écriture dans une sous-collection (groupes, conversations) ---------- */
async function addAt(col,path,o){
  S[col].set(o.id,o);changed();
  if(MODE==="cloud"){try{await DB.doc(path).set(clean(o))}catch(e){S[col].delete(o.id);changed();dbErr(e);return false}}else saveLocal();
  return true;
}
async function delAt(col,path,id){
  const old=S[col].get(id);S[col].delete(id);changed();
  if(MODE==="cloud"){try{await DB.doc(path).delete()}catch(e){if(old)S[col].set(id,old);changed();dbErr(e)}}else saveLocal();
}

/* ---------- Groupes de discussion ----------
   Le comité crée les groupes ; chacun·e les rejoint ou les quitte. Seuls les membres d'un groupe en lisent le fil. */
const dansGroupe=g=>!!ME&&!!g&&(g.membres||[]).includes(ME.uid);
function watchGroupe(gid){const g=get("groupes",gid);if(dansGroupe(g))dynSub("g:"+gid,"gmsgs",DB.collection("groupes").doc(gid).collection("msgs").orderBy("at","desc").limit(200))}
async function rejoindreGroupe(g,on){
  const m=new Set(g.membres||[]);on?m.add(ME.uid):m.delete(ME.uid);
  S.groupes.set(g.id,{...g,membres:[...m]});changed();
  if(MODE==="cloud"){
    if(!on)dynOff("g:"+g.id);
    try{const F=firebase.firestore.FieldValue;await DB.doc("groupes/"+g.id).update({membres:on?F.arrayUnion(ME.uid):F.arrayRemove(ME.uid)})}catch(e){S.groupes.set(g.id,g);changed();dbErr(e)}
  }else saveLocal();
}
const sendGroupe=(gid,texte)=>{const o={id:uid(),g:gid,uid:ME.uid,pseudo:ME.pseudo||"",texte:texte.slice(0,2000),at:new Date().toISOString()};return addAt("gmsgs",`groupes/${gid}/msgs/${o.id}`,o)};
const delGroupeMsg=m=>delAt("gmsgs",`groupes/${m.g}/msgs/${m.id}`,m.id);

/* ---------- Messages privés ---------- */
const convId=(a,b)=>[a,b].sort().join("_");
const autreDe=cv=>(cv.p||[]).find(x=>x!==ME.uid)||ME.uid;
const convNonLue=cv=>!!cv.lastBy&&cv.lastBy!==ME.uid&&String((cv.lu||{})[ME.uid]||"")<String(cv.lastAt||"");
function watchConv(cid){dynSub("c:"+cid,"dmsgs",DB.collection("convs").doc(cid).collection("msgs").orderBy("at","desc").limit(200))}
async function sendDM(to,texte){
  const cid=convId(ME.uid,to),at=new Date().toISOString(),old=get("convs",cid)||{};
  const msg={id:uid(),c:cid,uid:ME.uid,texte:texte.slice(0,2000),at};
  const cv={p:[ME.uid,to].sort(),noms:{...(old.noms||{}),[ME.uid]:ME.pseudo||"",[to]:(get("users",to)||{}).pseudo||(old.noms||{})[to]||""},
    last:texte.slice(0,140),lastAt:at,lastBy:ME.uid,lu:{...(old.lu||{}),[ME.uid]:at}};
  S.dmsgs.set(msg.id,msg);S.convs.set(cid,{...cv,id:cid});changed();
  if(MODE==="cloud"){
    try{const b=DB.batch();b.set(DB.doc("convs/"+cid),cv);b.set(DB.doc(`convs/${cid}/msgs/${msg.id}`),clean(msg));await b.commit()}
    catch(e){S.dmsgs.delete(msg.id);if(old.p)S.convs.set(cid,old);else S.convs.delete(cid);changed();dbErr(e);return false}
  }else saveLocal();
  return true;
}
async function lireConv(cid){
  const cv=get("convs",cid);if(!cv||!convNonLue(cv))return;
  const at=new Date().toISOString();S.convs.set(cid,{...cv,lu:{...(cv.lu||{}),[ME.uid]:at}});changed();
  if(MODE==="cloud")DB.doc("convs/"+cid).update({["lu."+ME.uid]:at}).catch(e=>console.warn(e));else saveLocal();
}
const delDM=m=>delAt("dmsgs",`convs/${m.c}/msgs/${m.id}`,m.id);

/* ---------- Notifications dans l'app (enveloppe en haut) ---------- */
const mesNotifs=()=>ME?all("notifs").filter(n=>n.to===ME.uid).sort((a,b)=>String(b.at).localeCompare(a.at)):[];
const nbNonLus=()=>!isMember()?0:mesNotifs().filter(n=>!n.lu).length+all("convs").filter(convNonLue).length;
async function notifier(to,titre,texte,lien){
  if(!to||!ME)return;
  const o={id:uid(),to,from:ME.uid,titre:String(titre).slice(0,150),texte:String(texte||"").slice(0,300),lien:lien||"",at:new Date().toISOString(),lu:false};
  if(MODE==="cloud"){try{await DB.doc("notifs/"+o.id).set(o)}catch(e){console.warn("notif",e.code)}}
  else{S.notifs.set(o.id,o);saveLocal();changed()}
}
async function lireNotif(n){
  if(n.lu)return;S.notifs.set(n.id,{...n,lu:true});changed();
  if(MODE==="cloud")DB.doc("notifs/"+n.id).update({lu:true}).catch(e=>console.warn(e));else saveLocal();
}
const delNotif=n=>delAt("notifs","notifs/"+n.id,n.id);
// Comptes qui ont un rôle donné (pour prévenir le/la caissier·ère, par exemple).
const comptesRole=(...roles)=>{for(const r of roles){const l=all("users").filter(u=>u.role===r);if(l.length)return l}return[]};

/* ---------- Fichiers (factures, tickets) ----------
   Sans service de stockage : chaque fichier est un document de la base (moins de 1 Mo). Les photos sont réduites. */
const PDF_MAX=700*1024;
async function lireFichier(file){
  if(/^image\//.test(file.type)){const data=await shrinkImage(file,1600,.72);return{nom:file.name.replace(/\.\w+$/,"")+".jpg",type:"image/jpeg",data}}
  if(file.type==="application/pdf"){
    if(file.size>PDF_MAX)throw new Error("Ce PDF est trop lourd ("+Math.round(file.size/1024)+" Ko, maximum 700 Ko). Prends plutôt une photo du document.");
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    return{nom:file.name,type:file.type,data};
  }
  throw new Error("Format non pris en charge : photo ou PDF seulement.");
}
// Fichiers en attente dans un formulaire : envoyés à l'enregistrement.
const PENDING={};
async function envoyerFichiers(list){
  const out=[];
  for(const f of list||[]){
    if(!f.tmp){out.push(f);continue}
    const p=PENDING[f.tmp];if(!p)continue;
    const o={id:uid(),nom:p.nom,type:p.type,data:p.data,uid:ME.uid,at:new Date().toISOString()};
    if(MODE==="cloud"){try{await DB.doc("fichiers/"+o.id).set(o)}catch(e){dbErr(e);throw e}}else{S.fichiers.set(o.id,o);saveLocal()}
    delete PENDING[f.tmp];out.push({id:o.id,nom:o.nom,type:o.type});
  }
  return out;
}
async function getFichier(id){
  if(S.fichiers.has(id))return S.fichiers.get(id);
  if(MODE!=="cloud")return null;
  const s=await DB.doc("fichiers/"+id).get();if(!s.exists)return null;
  const o={...s.data(),id};S.fichiers.set(id,o);return o;
}
async function supprimerFichiers(list){for(const f of list||[])if(f.id){S.fichiers.delete(f.id);if(MODE==="cloud")await DB.doc("fichiers/"+f.id).delete().catch(()=>{})}if(MODE!=="cloud")saveLocal()}
