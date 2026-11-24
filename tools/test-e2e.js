// Test de bout en bout contre les émulateurs Firebase (auth + firestore avec firestore.rules).
// Usage (voir README) : python3 -m http.server 8765 dans le dossier de l'app, puis
//   npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-e2e.js"
const {chromium}=require('playwright');
const U='http://localhost:8765/';
const CONF='window.BCV_FIREBASE_CONFIG={apiKey:"demo-key",authDomain:"demo-bcv.firebaseapp.com",projectId:"demo-bcv"};window.BCV_EMULATEUR=true;';
let fails=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);if(!c)fails++};
(async()=>{
  const b=await chromium.launch();
  const mk=async()=>{const ctx=await b.newContext({viewport:{width:1200,height:850}});
    await ctx.route('**/firebase-config.js',r=>r.fulfill({body:CONF,contentType:'application/javascript'}));
    const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGEERROR',e.message));return p};
  const go=async(p,h)=>{await p.evaluate(h=>location.hash=h,h);await p.waitForTimeout(700)};
  const reg=async(p,pseudo,mail)=>{await p.goto(U+'#compte/inscription');await p.waitForTimeout(1200);
    await p.fill('#rPseudo',pseudo);await p.fill('#rMail',mail);await p.fill('#rPass','secret123');await p.fill('#dNom','Chien de '+pseudo);
    await p.click('#regForm button.primary');await p.waitForTimeout(2500)};
  const tryWrite=(p,fn)=>p.evaluate(`(async()=>{try{await (${fn.toString()})();return 'ok'}catch(e){return 'ERR '+(e.code||'')+' '+e.message}})()`).then(r=>{if(!r.includes('permission'))console.log('   ->',r);return r});

  const A=await mk();await reg(A,'Lolo','lolo@test.ch');
  ok((await A.textContent('.profile')).includes('Administrateur'),'premier compte = administrateur');
  await go(A,'#reglages');await A.click('#seed');await A.waitForTimeout(3000);
  await go(A,'#club');ok((await A.$$('.person')).length>=8,'contenu de départ importé (comité)');
  await go(A,'#agenda');await A.click('#addCours');await A.fill('#f_titre','Cours test');
  const d=new Date(Date.now()+864e5*3);const ds=d.toISOString().slice(0,10);
  await A.fill('#f_date',ds);await A.fill('#f_debut','10:00');await A.fill('#f_fin','11:00');await A.fill('#f_repeat','1');
  await A.click('.sheet button.primary');await A.waitForTimeout(1500);
  ok((await A.$$('[data-cours]')).length===2,'cours + répétition créés');

  const B=await mk();await reg(B,'Bob','bob@test.ch');
  ok((await B.textContent('.profile')).includes('En attente'),'deuxième compte en attente');
  await go(B,'#tchat');ok(!!(await B.$('.lock')),'tchat fermé au compte en attente');
  let r=await tryWrite(B,()=>firebase.firestore().collection('messages').add({uid:firebase.auth().currentUser.uid,pseudo:'Bob',texte:'x',at:'1'}));
  ok(r.includes('permission'),'message refusé au compte en attente');
  r=await tryWrite(B,()=>firebase.firestore().doc('users/'+firebase.auth().currentUser.uid).update({role:'admin'}));
  ok(r.includes('permission'),'impossible de se donner un rôle');
  r=await tryWrite(B,()=>firebase.firestore().doc('pseudos/lolo').set({uid:firebase.auth().currentUser.uid,email:'bob@test.ch'}));
  ok(r.includes('permission'),'impossible de voler un pseudo');

  await go(A,'#reglages');await A.waitForTimeout(800);await A.click('[data-ok][data-r=adherent]');await A.waitForTimeout(1500);
  await B.waitForTimeout(1500);await go(B,'#tchat');
  ok(!!(await B.$('#chatIn')),'tchat ouvert après validation (sans recharger)');
  await B.fill('#chatIn','Salut le club !');await B.click('#chatForm button');await B.waitForTimeout(1500);
  await go(A,'#tchat');await A.waitForTimeout(800);ok((await A.textContent('#chatList')).includes('Salut le club'),'message reçu par l’admin');
  await go(B,'#agenda');await B.click('[data-cours]');await B.waitForTimeout(400);await B.click('#reg');await B.waitForTimeout(1500);
  ok((await B.textContent('.sheet')).includes('Bob'),'inscription au cours');
  await B.evaluate(()=>closeSheet());
  await A.evaluate(async()=>{const i=all('inscriptions')[0];const c=get('cours',i.cours);await prevenirInscrits(c,{...c,lieu:'Cabane du club'});await put('cours',{...c,lieu:'Cabane du club'})});
  await B.waitForTimeout(1800);
  ok(await B.evaluate(()=>mesNotifs().some(n=>n.titre.startsWith('Modifié')&&n.texte.includes('Cabane du club'))),'inscrit·e prévenu·e quand le cours change');
  r=await tryWrite(B,()=>firebase.firestore().collection('elevages').add({nom:'x',uid:firebase.auth().currentUser.uid}));
  ok(r.includes('permission'),'adhérent ne peut pas créer d’élevage');
  r=await tryWrite(B,()=>firebase.firestore().collection('cours').add({titre:'pirate'}));
  ok(r.includes('permission'),'adhérent ne peut pas créer de cours');
  await go(B,'#compte');await B.click('#addDog');await B.fill('#f_nom','Rex');await B.click('.sheet button.primary');await B.waitForTimeout(1200);
  ok((await B.textContent('.dogs')).includes('Rex'),'ajout d’un chien au profil');

  // Ancien rôle « membre » : mêmes droits qu'un·e adhérent·e (plus d'ajout de cours)
  await go(A,'#reglages');await A.waitForTimeout(500);
  const bUid=await B.evaluate(()=>firebase.auth().currentUser.uid);
  await A.evaluate(u=>firebase.firestore().doc('users/'+u).update({role:'membre'}),bUid);await A.waitForTimeout(1200);
  r=await tryWrite(B,()=>firebase.firestore().collection('cours').add({titre:'x',uid:firebase.auth().currentUser.uid}));
  ok(r.includes('permission'),'ancien rôle membre ne peut plus ajouter de cours');
  // Éleveur
  await go(A,'#reglages');await A.waitForTimeout(500);
  const bobUid=await B.evaluate(()=>firebase.auth().currentUser.uid);
  await A.selectOption(`[data-role-of="${bobUid}"]`,'eleveur');await A.waitForTimeout(1500);
  await go(B,'#chiots');await B.waitForTimeout(800);
  await B.click('#addElev');await B.fill('#f_nom','Élevage de Bob');await B.fill('#f_eleveur','Bob');await B.click('.sheet button.primary');await B.waitForTimeout(1200);
  await B.click('#addPortee');await B.waitForTimeout(300);
  await B.selectOption('.sheet select[name=elevage]',{label:'Élevage de Bob (Bob)'});
  await B.click('[data-add=M]');await B.click('[data-add=F]');await B.click('.sheet button.primary');await B.waitForTimeout(1500);
  ok((await B.textContent('.v-chiots')).includes('2 disponibles'),'éleveur publie une portée');
  r=await tryWrite(B,async()=>{const s=await firebase.firestore().collection('elevages').get();const o=s.docs.find(d=>d.data().nom!=='Élevage de Bob');return o.ref.update({nom:'pirate'})});
  ok(r.includes('permission'),'éleveur ne modifie pas l’élevage d’un autre');

  // Cotisations : seulement admin, président·e, caissier·ère
  const D=await mk();await reg(D,'Cleo','cleo@test.ch');
  const dUid=await D.evaluate(()=>firebase.auth().currentUser.uid);
  await go(A,'#reglages');await A.waitForTimeout(800);
  await A.click(`[data-ok="${dUid}"][data-r=adherent]`);await A.waitForTimeout(1200);await A.selectOption(`[data-role-of="${dUid}"]`,'comite');
  await A.waitForTimeout(1200);
  r=await tryWrite(D,()=>firebase.firestore().collection('cotisations').get());ok(r==='ok','comité voit les cotisations');
  r=await tryWrite(D,()=>firebase.firestore().collection('cours').add({titre:'x'}));ok(r.includes('permission'),'membre du comité ne crée pas de cours');
  r=await tryWrite(D,()=>firebase.firestore().collection('cours').add({titre:'Sortie',type:'evenement',date:'2020-01-01',debut:'10:00',uid:firebase.auth().currentUser.uid}));ok(r==='ok','membre du comité crée un événement');
  r=await tryWrite(D,()=>firebase.firestore().collection('cours').add({titre:'x',type:'cours',uid:firebase.auth().currentUser.uid}));ok(r.includes('permission'),'membre du comité ne crée pas de cours, même en le déclarant');
  r=await tryWrite(D,()=>firebase.firestore().collection('ecritures').add({libelle:'x',montant:1}));ok(r.includes('permission'),'membre du comité ne modifie pas la comptabilité');
  r=await tryWrite(D,()=>firebase.firestore().doc('cotisations/x').set({paye:{}}));ok(r.includes('permission'),'comité ne coche pas les cotisations');
  const bU=bUid;
  r=await D.evaluate(async u=>{try{await firebase.firestore().doc('users/'+u).update({role:'caissier'});return 'ok'}catch(e){return String(e.message).toLowerCase()}},bU);
  ok(r.includes('permission'),'comité ne peut pas nommer un·e caissier·ère');
  await go(D,'#club/adherents');await D.waitForTimeout(800);ok(!(await D.$('[data-cotis]')),'comité ne voit pas les cases cotisation');
  await go(A,'#reglages');await A.waitForTimeout(500);
  await A.selectOption(`[data-role-of="${bU}"]`,'caissier');await A.waitForTimeout(1800);
  await go(B,'#club/adherents');await B.waitForTimeout(1500);
  const box=await B.$(`[data-cotis="${dUid}"]`);ok(!!box,'caissier·ère voit les cases cotisation');
  if(box){await box.check();await B.waitForTimeout(1200)}
  await go(A,'#club/adherents');await A.waitForTimeout(1200);
  ok(await A.isChecked(`[data-cotis="${dUid}"]`).catch(()=>false),'admin voit la cotisation cochée par la caissière');
  r=await B.evaluate(async u=>{try{await firebase.firestore().doc('users/'+u).update({role:'president'});return 'ok'}catch(e){return String(e.message).toLowerCase()}},dUid);
  ok(r.includes('permission'),'caissier·ère ne nomme pas de président·e');
  // Rôle donné depuis la liste des adhérents ; Responsable éducation
  await go(A,'#club');await A.waitForTimeout(800);
  await A.click('[data-com]');await A.waitForTimeout(300);
  await A.selectOption('#f_compte',dUid);await A.selectOption('#f_appRole','educ');await A.click('.sheet button.primary');await A.waitForTimeout(1800);
  ok((await D.evaluate(()=>ME.role))==='educ','rôle donné depuis la fiche du comité');
  await go(A,'#club');await A.waitForTimeout(600);
  ok(!!(await A.$(`.card.com [data-role-of="${dUid}"]`)),'rôle modifiable sur la carte du comité');
  await go(A,'#club/adherents');await A.waitForTimeout(600);ok(!(await A.$('[data-role-of]')),'plus de choix de rôle dans les adhérents');
  r=await D.evaluate(async()=>{try{const s=await firebase.firestore().collection('cours').where('titre','==','Cours test').get();await s.docs[0].ref.update({annule:true});return 'ok'}catch(e){return e.message}});
  ok(r==='ok','responsable éducation annule le cours d’un autre');
  r=await D.evaluate(async()=>{try{await firebase.firestore().collection('wiki').add({q:'Q ?',r:'R',cat:'Le boxer'});return 'ok'}catch(e){return e.message}});
  ok(r==='ok','responsable éducation répond dans le wiki');
  r=await tryWrite(D,()=>firebase.firestore().collection('factures').add({fournisseur:'x',payee:false,uid:firebase.auth().currentUser.uid}));ok(r==='ok','comité ajoute une facture');
  r=await tryWrite(D,()=>firebase.firestore().collection('factures').add({fournisseur:'x',payee:true,uid:firebase.auth().currentUser.uid}));ok(r.includes('permission'),'comité ne marque pas une facture payée');
  r=await tryWrite(B,()=>firebase.firestore().collection('cours').add({titre:'x'}));ok(r.includes('permission'),'caissier·ère ne modifie pas l’agenda');

  // Notes de frais : le comité les crée, le/la caissier·ère est prévenu·e, puis les paie
  await go(D,'#compta/notes');await D.waitForTimeout(800);
  await D.click('#addNote');await D.fill('#f_motif','Friandises cours');await D.fill('#f_montant','12.50');
  await D.setInputFiles('[data-addfile=fichiers][multiple]',{name:'ticket.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});await D.waitForTimeout(800);
  await D.click('.sheet button.primary');await D.waitForTimeout(2000);
  ok((await D.textContent('.v-compta')).includes('Friandises cours'),'note de frais créée avec son ticket');
  await B.waitForTimeout(800);
  ok(await B.evaluate(()=>mesNotifs().some(n=>n.titre==='Nouvelle note de frais')),'caissier·ère prévenu·e de la nouvelle note');
  r=await tryWrite(D,async()=>{const s=await firebase.firestore().collection('notes').get();return s.docs[0].ref.update({payee:true})});
  ok(r.includes('permission'),'on ne marque pas sa propre note payée');
  await go(B,'#compta/notes');await B.waitForTimeout(1000);
  await B.waitForSelector('[data-notepay]',{timeout:10000}).catch(()=>{});  await B.check('[data-notepay]');await B.waitForTimeout(1800);
  ok(await D.evaluate(()=>mesNotifs().some(n=>n.titre==='Note de frais payée')),'auteur·rice prévenu·e quand la note est payée');
  ok(await D.evaluate(()=>nbNonLus()>0),'enveloppe : notification non lue');
  r=await B.evaluate(async()=>{try{const n=all('notes')[0];const f=await getFichier(n.fichiers[0].id);return f&&f.data.slice(0,15)}catch(e){return 'ERR '+e.message}});ok(String(r).startsWith('data:image'),'ticket scanné lisible par le comité');

  // Adhérente : contacts, cotisations et comptabilité invisibles ; groupes et messages privés
  const E=await mk();await E.goto(U+'#compte/inscription');await E.waitForTimeout(1200);
  await E.fill('#rPseudo','Emma');await E.fill('#rMail','emma@test.ch');await E.fill('#rPass','secret123');await E.fill('#rTel','079 123 45 67');await E.check('#rBcv');
  await E.click('#regForm button.primary');await E.waitForTimeout(2500);
  const eUid=await E.evaluate(()=>firebase.auth().currentUser.uid);
  await go(A,'#reglages');await A.waitForTimeout(800);await A.click(`[data-ok="${eUid}"]`);await A.waitForTimeout(1500);
  ok(await A.evaluate(u=>priveDe(u).tel==='079 123 45 67'&&get('users',u).bcv===true,eUid),'téléphone et adhésion BCV visibles par le comité');
  r=await tryWrite(E,()=>firebase.firestore().collection('prives').get());ok(r.includes('permission'),'adhérente ne voit pas les contacts des autres');
  r=await tryWrite(E,()=>firebase.firestore().collection('cotisations').get());ok(r.includes('permission'),'adhérente ne voit pas les cotisations des autres');
  r=await tryWrite(E,()=>firebase.firestore().doc('cotisations/'+firebase.auth().currentUser.uid).get());ok(r==='ok','adhérente voit sa propre cotisation');
  r=await tryWrite(E,()=>firebase.firestore().collection('notes').get());ok(r.includes('permission'),'adhérente ne voit pas la comptabilité');
  r=await tryWrite(E,()=>firebase.firestore().collection('cabane').get());ok(r.includes('permission'),'adhérente ne voit pas la cabane');
  r=await tryWrite(E,()=>firebase.firestore().collection('docscomite').get());ok(r.includes('permission'),'adhérente ne voit pas les documents du comité');
  await go(A,'#club/documents');await A.waitForTimeout(600);await A.click('#addDoc');await A.fill('#f_titre','PV assemblée');
  await A.setInputFiles('[data-addfile=fichiers][multiple]',{name:'pv.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});await A.waitForTimeout(500);
  await A.click('.sheet button.primary');await A.waitForTimeout(1500);
  ok((await A.textContent('.v-club')).includes('PV assemblée'),'document du comité archivé avec son scan');
  await go(E,'#club/documents');await E.waitForTimeout(500);ok(!(await E.$('#addDoc')),'onglet documents caché aux adhérents');
  // Galerie photo : créée par le comité, vue par les membres
  await go(A,'#galerie');await A.waitForTimeout(600);await A.click('#galNew');await A.fill('#f_titre','Fête de Noël');
  await A.setInputFiles('[data-addfile=photos][multiple]',{name:'noel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});await A.waitForTimeout(500);
  await A.click('.sheet button.primary');await A.waitForTimeout(2000);
  const galId=await A.evaluate(()=>all('galeries').find(g=>g.titre==='Fête de Noël').id);
  await go(E,'#galerie/'+galId);await E.waitForTimeout(2500);
  ok(await E.evaluate(()=>!!document.querySelector('.gal-it img[src^="data:image"]')),'galerie : la photo du comité est visible par une adhérente');
  ok(!(await E.$('#galAdd')),'galerie : seul le comité ajoute des photos');
  r=await tryWrite(E,()=>firebase.firestore().collection('galeries').add({titre:'x'}));ok(r!=='ok','galerie : une adhérente ne crée pas de galerie');
  await go(B,'#club/chiens');await B.waitForTimeout(800);ok((await B.textContent('.chiens')).includes('Rex')&&(await B.textContent('.chiens')).includes('Bob'),'onglet Chiens : chien et maître affichés');
  // Année fiscale (octobre à septembre) et clôture fiscale
  ok(await A.evaluate(()=>exoDe('2026-09-30')==='2025'&&exoDe('2026-10-01')==='2026'&&labelAn('2025')==='2025 - 2026'),'année fiscale du 1er octobre au 30 septembre');
  await A.evaluate(()=>put('ecritures',{sens:'recette',compte:'club',date:'2026-03-15',montant:100,libelle:'Vente test',annee:'2026'}));
  await go(A,'#compta');await A.waitForTimeout(800);await A.selectOption('#cAn','2025');await A.waitForTimeout(600);
  ok((await A.textContent('main')).includes('Exercice 2025 - 2026'),'compta affichée par exercice 2025 - 2026');
  await A.click('#clore2');await A.waitForTimeout(400);await A.click('#cfOk');await A.waitForTimeout(2500);
  ok(await A.evaluate(()=>!!(get('compta','2025')||{}).cloture),'clôture fiscale enregistrée');
  ok(await A.evaluate(()=>all('docscomite').some(d=>d.titre==='Clôture fiscale 2025 - 2026'&&(d.fichiers||[]).length===1)),'clôture archivée dans les documents du comité, avec le tableur');
  r=await tryWrite(E,()=>firebase.firestore().collection('groupes').add({nom:'x',membres:[]}));ok(r.includes('permission'),'adhérente ne crée pas de groupe');
  await go(E,'#club/adherents');await E.waitForTimeout(1000);
  ok(!(await E.textContent('.v-club')).includes('@test.ch')&&!(await E.$('.adh-foot')),'adhérente ne voit ni e-mails ni cotisations');
  ok(!(await E.$('.side a[href="#compta"]')),'menu sans comptabilité pour l’adhérente');
  // Fiche du chien : vaccin et carnet de vaccination joint
  await go(E,'#compte');await E.waitForTimeout(500);await E.click('#addDog');await E.fill('#f_nom','Rex');await E.check('.sheet [name=vaccin]');
  await E.setInputFiles('[data-addfile=carnet][multiple]',{name:'carnet.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});await E.waitForTimeout(600);
  await E.click('.sheet button.primary');await E.waitForTimeout(1800);
  ok((await E.textContent('.dogs')).includes('Vacciné'),'chien noté vacciné');
  r=await A.evaluate(async u=>{const c=(get('users',u).chiens||[]).find(x=>x.nom==='Rex');const f=c&&c.carnet&&c.carnet[0]&&await getFichier(c.carnet[0].id);return f?f.data.slice(0,10):'rien'},eUid);
  ok(r.startsWith('data:image'),'carnet de vaccination visible par le comité');
  const carnetId=await E.evaluate(()=>{const c=(ME.chiens||[]).find(x=>x.nom==='Rex');return c.carnet[0].id});
  await E.evaluate(id=>voirFichier(id),carnetId);await E.waitForTimeout(800);
  const [dl]=await Promise.all([E.waitForEvent('download',{timeout:5000}).catch(()=>null),E.click('.sheet [data-fdl]')]);
  ok(!!dl&&/carnet/.test(dl.suggestedFilename()),'la personne qui a ajouté le carnet peut le télécharger');await E.evaluate(()=>closeSheet());
  // Groupes
  await go(A,'#tchat');await A.click('#grpBtn');await A.click('#newG');await A.fill('#f_nom','Balades');await A.click('.sheet button.primary');await A.waitForTimeout(1500);
  const gid=await A.evaluate(()=>all('groupes')[0].id);
  await go(E,'#tchat');await E.waitForTimeout(600);await E.click('#grpBtn');await E.click(`[data-join="${gid}"]`);await E.waitForTimeout(1500);
  await E.fill('#chatIn','Coucou les baladeurs');await E.click('#chatForm button');await E.waitForTimeout(1500);
  await go(A,'#agenda');await A.waitForTimeout(500);
  await E.fill('#chatIn','Qui vient dimanche ?');await E.click('#chatForm button');await E.waitForTimeout(1500);
  ok(await A.evaluate(g=>nonLusCanal(g)>0&&tchatNonLus()>0&&!!document.querySelector('.side a[href="#tchat"] .nonlu'),gid),'nouveau message de groupe signalé (rond non lu)');
  // Réactions emoji
  await go(E,'#tchat');await E.waitForTimeout(1200);await E.click('[data-bub]');await E.waitForTimeout(300);await E.click('.reac-pick [data-pe="👍"]');await E.waitForTimeout(1500);
  ok(await E.evaluate(()=>all('messages').some(x=>(x.reac||{})[ME.uid]==='👍')),'réaction emoji sur un message du tchat');
  r=await E.evaluate(async()=>{const x=all('messages').find(m=>m.uid!==ME.uid);try{await firebase.firestore().doc('messages/'+x.id).update({texte:'piraté'});return 'ok'}catch(e){return 'refusé'}});
  ok(r!=='ok','une réaction ne permet pas de modifier le texte');
  r=await E.evaluate(async()=>{const x=all('messages')[0];try{await firebase.firestore().doc('messages/'+x.id).update({['reac.autre']:'😂'});return 'ok'}catch(e){return 'refusé'}});
  ok(r!=='ok','on ne réagit pas au nom de quelqu’un d’autre');
  await go(E,'#tchat/'+gid);await E.waitForTimeout(1200);
  await go(A,'#tchat/'+gid);await A.waitForTimeout(1500);ok((await A.textContent('#chatList')).includes('Coucou les baladeurs'),'message de groupe reçu');
  r=await B.evaluate(async g=>{try{await firebase.firestore().collection('groupes').doc(g).collection('msgs').get();return 'ok'}catch(e){return String(e.message).toLowerCase()}},gid);
  ok(r!=='ok','hors du groupe : fil illisible');
  r=await D.evaluate(async([g,u])=>{try{await firebase.firestore().doc('groupes/'+g).update({membres:firebase.firestore.FieldValue.arrayUnion(u)});return 'ok'}catch(e){return String(e.message).toLowerCase()}},[gid,bUid]);
  ok(r==='ok','le comité gère les membres d’un groupe');
  r=await E.evaluate(async([g,u])=>{try{await firebase.firestore().doc('groupes/'+g).update({membres:firebase.firestore.FieldValue.arrayRemove(u)});return 'ok'}catch(e){return String(e.message).toLowerCase()}},[gid,bUid]);
  ok(r.includes('permission'),'on ne retire pas quelqu’un d’autre d’un groupe');
  // Groupe privé (caché, sur invitation)
  const pid=await D.evaluate(async me=>{const n=await put('groupes',{nom:'Comité secret',prive:true,membres:[me],uid:me});return n.id},dUid);
  await E.waitForTimeout(1500);
  ok(await E.evaluate(p=>!get('groupes',p),pid),'groupe privé invisible pour une adhérente non invitée');
  r=await tryWrite(E,()=>firebase.firestore().collection('groupes').get());ok(r!=='ok','liste complète des groupes refusée (groupes privés protégés)');
  r=await E.evaluate(async([g,u])=>{try{await firebase.firestore().doc('groupes/'+g).update({membres:firebase.firestore.FieldValue.arrayUnion(u)});return 'ok'}catch(e){return String(e.message).toLowerCase()}},[pid,eUid]);
  ok(r!=='ok','on ne s’invite pas soi-même dans un groupe privé');
  await D.evaluate(async([p,u])=>{await setMembresGroupe(get('groupes',p),[...get('groupes',p).membres,u])},[pid,eUid]);await E.waitForTimeout(2000);
  ok(await E.evaluate(p=>!!get('groupes',p)&&mesNotifs().some(n=>n.titre.includes('Comité secret')),pid),'invitée : le groupe privé apparaît, avec une notification');
  await go(E,'#tchat');await E.click('#grpBtn');await E.waitForTimeout(400);ok((await E.textContent('.sheet')).includes('Privé'),'groupe privé marqué dans la liste');await E.evaluate(()=>closeSheet());
  ok(await E.evaluate(g=>!!get('groupes',g),gid),'groupes ouverts toujours visibles');
  // Messages privés
  await go(E,'#boite/m/'+dUid);await E.waitForTimeout(800);await E.fill('#dmIn','Bonjour Cleo');await E.click('#dmForm button');await E.waitForTimeout(1500);
  await D.waitForTimeout(500);ok(await D.evaluate(()=>all('convs').some(convNonLue)),'message privé reçu (non lu)');
  ok(await D.evaluate(()=>[...nonLusSysteme().keys()].some(k=>k.startsWith('dm-'))),'notification du téléphone prévue pour le message privé');
  await go(D,'#boite/m/'+eUid);await D.waitForTimeout(1500);ok((await D.textContent('#dmList')).includes('Bonjour Cleo'),'message privé affiché');
  ok(await D.evaluate(()=>!all('convs').some(convNonLue)),'message privé marqué lu');
  ok(await D.evaluate(()=>![...nonLusSysteme().keys()].some(k=>k.startsWith('dm-'))),'notification du téléphone retirée une fois le message lu');
  r=await B.evaluate(async c=>{try{await firebase.firestore().collection('convs').doc(c).collection('msgs').get();return 'ok'}catch(e){return String(e.message).toLowerCase()}},[dUid,eUid].sort().join('_'));
  ok(r!=='ok','message privé illisible par un tiers');
  // Connexion par pseudo
  await B.click('[href="#compte"]');await go(B,'#compte');await B.click('#out');await B.waitForTimeout(1000);
  await go(B,'#compte');await B.fill('#lId','bob');await B.fill('#lPass','secret123');await B.click('#logForm button.primary');await B.waitForTimeout(2000);
  await go(B,'#compte');ok((await B.textContent('.profile h2'))==='Bob','connexion avec le pseudo');

  // Visiteur
  const C=await mk();await C.goto(U+'#agenda');await C.waitForTimeout(1500);
  ok((await C.$$('[data-cours]')).length===2,'visiteur voit l’agenda');
  r=await tryWrite(C,()=>firebase.firestore().collection('users').get());ok(r.includes('permission'),'visiteur ne lit pas les comptes');
  r=await tryWrite(C,()=>firebase.firestore().collection('messages').get());ok(r.includes('permission'),'visiteur ne lit pas le tchat');
  r=await tryWrite(C,()=>firebase.firestore().collection('pseudos').get());ok(r.includes('permission'),'visiteur ne liste pas les pseudos');
  await b.close();console.log(fails?fails+' échec(s)':'TOUT EST OK');process.exit(fails?1:0);
})();
