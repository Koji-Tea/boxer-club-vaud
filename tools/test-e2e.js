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
  r=await tryWrite(B,()=>firebase.firestore().collection('elevages').add({nom:'x',uid:firebase.auth().currentUser.uid}));
  ok(r.includes('permission'),'adhérent ne peut pas créer d’élevage');
  r=await tryWrite(B,()=>firebase.firestore().collection('cours').add({titre:'pirate'}));
  ok(r.includes('permission'),'adhérent ne peut pas créer de cours');
  await go(B,'#compte');await B.click('#addDog');await B.fill('#f_nom','Rex');await B.click('.sheet button.primary');await B.waitForTimeout(1200);
  ok((await B.textContent('.dogs')).includes('Rex'),'ajout d’un chien au profil');

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
