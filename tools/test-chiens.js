// Test des chiens partagés entre plusieurs maîtres, contre les émulateurs Firebase.
// Usage : python3 -m http.server 8765 dans le dossier de l'app, puis
//   npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-chiens.js"
const {chromium}=require('playwright');
const U='http://localhost:8765/';
const CONF='window.BCV_FIREBASE_CONFIG={apiKey:"demo-key",authDomain:"demo-bcv.firebaseapp.com",projectId:"demo-bcv"};window.BCV_EMULATEUR=true;';
let fails=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);if(!c)fails++};
(async()=>{
  const b=await chromium.launch();
  const mk=async(vp={width:1200,height:850})=>{const ctx=await b.newContext({viewport:vp});
    await ctx.route('**/firebase-config.js',r=>r.fulfill({body:CONF,contentType:'application/javascript'}));
    const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGEERROR',e.message));return p};
  const go=async(p,h)=>{await p.evaluate(h=>location.hash=h,h);await p.waitForTimeout(900)};
  const reg=async(p,pseudo,mail,chien,deja)=>{await p.goto(U+'#compte/inscription');await p.waitForTimeout(1200);
    await p.fill('#rPseudo',pseudo);await p.fill('#rMail',mail);await p.fill('#rPass','secret123');
    if(deja){await p.check('#dDeja');ok(await p.isHidden('#dSexe'),'inscription : « déjà inscrit » cache la fiche à remplir');await p.fill('#dAutre',deja)}
    if(chien)await p.fill('#dNom',chien);
    await p.click('#regForm button.primary');await p.waitForTimeout(2500)};
  const valider=async(A)=>{await go(A,'#reglages');await A.waitForTimeout(600);await A.click('[data-ok][data-r=adherent]');await A.waitForTimeout(2000)};
  const tryWrite=(p,fn,arg)=>p.evaluate(`(async()=>{try{await (${fn.toString()})(${JSON.stringify(arg)});return 'ok'}catch(e){return 'ERR '+(e.code||'')+' '+e.message}})()`);
  const nbCartes=async(p,nom)=>(await p.$$eval('.chien-c',(l,n)=>l.filter(x=>x.querySelector('.chien-nom').textContent===n).length,nom));

  // Lolo (admin) et Julie inscrivent chacun « Groot » : le cas des deux fiches.
  const A=await mk();await reg(A,'Lolo','lolo@test.ch','Groot');
  const J=await mk({width:390,height:800});await reg(J,'Julie','julie@test.ch','Groot');
  await valider(A);
  const aUid=await A.evaluate(()=>ME.uid),jUid=await J.evaluate(()=>ME.uid);
  await J.waitForTimeout(1500);
  ok(await J.evaluate(()=>ME.chiens[0].id&&ME.chiens[0].id.startsWith('c')),'un nouveau chien reçoit un identifiant stable');

  await go(A,'#club/chiens');
  ok(await nbCartes(A,'Groot')===2,'avant : deux fiches Groot');
  ok((await A.textContent('.banner')).includes('Doublons possibles'),'le comité voit le doublon signalé');
  await go(J,'#club/chiens');ok(!!(await J.$('.banner [data-fus]')),'Julie (maître d’un des deux Groot) peut aussi fusionner');

  // Un·e adhérent·e ne peut pas toucher aux chiens d'un autre compte.
  let r=await tryWrite(J,u=>firebase.firestore().doc('users/'+u).update({chiens:[],chien:''}),aUid);
  ok(r.includes('permission'),'adhérent·e : impossible de modifier les chiens d’un autre');

  // Fusion par le comité : on garde la fiche de Julie (elle a une photo dans la vraie vie).
  await J.evaluate(async()=>{const l=[...ME.chiens];l[0]={...l[0],naissance:'2024-09-01',race:'Boxer'};await ecrireChiens(ME.uid,l)});
  await A.evaluate(async()=>{const l=[...ME.chiens];l[0]={...l[0],remarque:'Adore les balles'};await ecrireChiens(ME.uid,l)});
  await A.waitForTimeout(1200);await go(A,'#club/chiens');
  await A.click('.banner [data-fus]');await A.waitForTimeout(500);
  const keepJ=await A.$$eval('[data-keep]',l=>l.findIndex(x=>x.textContent.includes('Julie')));
  await A.click(`[data-keep="${keepJ}"]`);await A.waitForTimeout(2500);
  await go(A,'#club/chiens');
  ok(await nbCartes(A,'Groot')===1,'après fusion : une seule fiche Groot');
  const card=await A.$eval('.chien-c',x=>x.textContent);
  ok(card.includes('Lolo')&&card.includes('Julie'),'la fiche affiche les deux maîtres');
  ok(!(await A.$('.banner')),'plus de doublon signalé');
  ok(await A.evaluate(()=>{const e=ME.chiens[0];return e.lien&&e.nom==='Groot'}),'la fiche de Lolo est devenue un lien');
  await J.waitForTimeout(1500);ok(await J.evaluate(()=>ME.chiens[0].remarque==='Adore les balles'),'les infos manquantes sont reprises dans la fiche gardée');
  await go(A,'#compte');ok((await A.textContent('.dogs')).includes('Fiche tenue par Julie'),'Mon compte : chien partagé, tenu par Julie');
  await go(J,'#compte');ok((await J.textContent('.dogs')).includes('Avec Lolo'),'Mon compte de Julie : avec Lolo');

  // Renommer la fiche ne casse pas le lien.
  await J.evaluate(async()=>{const l=[...ME.chiens];l[0]={...l[0],nom:'Groot II'};await ecrireChiens(ME.uid,l)});
  await A.waitForTimeout(2500);await go(A,'#compte');
  ok((await A.textContent('.dogs')).includes('Groot II'),'le lien suit le changement de nom');

  // Nouveau compte : chien déjà inscrit, choisi après validation.
  const M=await mk();await reg(M,'Mia','mia@test.ch','Groot II','Julie');
  ok(await M.evaluate(()=>ME.chiens[0].aRelier===true),'inscription : chien noté « à relier »');
  await go(M,'#compte');ok((await M.textContent('.dogs')).includes('dès que le comité'),'en attente : on explique qu’il faut la validation');
  await go(A,'#reglages');await A.waitForTimeout(600);
  ok(!!(await A.$('[data-relierpour]')),'le comité voit le chien à relier dans les comptes à valider');
  await A.click('[data-ok][data-r=adherent]');await A.waitForTimeout(2500);
  await go(M,'#compte');await M.waitForTimeout(800);
  ok(!!(await M.$('[data-relier][data-cle]')),'après validation : suggestion « C’est Groot II de Julie »');
  await M.click('[data-relier][data-cle]');await M.waitForTimeout(2500);
  ok(await M.evaluate(()=>!!ME.chiens[0].lien),'Mia est reliée à la fiche de Julie');
  await go(J,'#club/chiens');await J.waitForTimeout(800);
  const cj=await J.$eval('.chien-c',x=>x.textContent);
  ok(cj.includes('Lolo')&&cj.includes('Julie')&&cj.includes('Mia'),'trois maîtres sur la même fiche');
  ok(await nbCartes(J,'Groot II')===1,'toujours une seule fiche');

  // Un membre se relie lui-même depuis son profil (bouton « Chien déjà inscrit »).
  const R=await mk();await reg(R,'Remi','remi@test.ch','');await valider(A);await R.waitForTimeout(1500);
  await go(R,'#compte');await R.click('#linkDog');await R.waitForTimeout(500);
  await R.fill('#pkQ','groot');await R.dispatchEvent('#pkQ','input');
  await R.click('.pick-c:not([hidden])');await R.waitForTimeout(2500);
  ok(await R.evaluate(()=>ME.chiens.length===1&&!!ME.chiens[0].lien),'depuis le profil : se relier à un chien existant');

  // Quitter le partage.
  await go(R,'#compte');await R.click('[data-dog="0"]');await R.waitForTimeout(400);
  await R.click('#unlink');await R.waitForTimeout(400);await R.click('#cfOk');await R.waitForTimeout(2000);
  ok(await R.evaluate(()=>!(ME.chiens||[]).length),'ne plus être relié·e au chien');

  // Fusion par les maîtres eux-mêmes (adhérent·es, sans droit du comité).
  // 1) Pia garde la fiche de Quentin : sa fiche devient un lien (elle n'écrit que chez elle).
  const P=await mk();await reg(P,'Pia','pia@test.ch','Rex');const Q=await mk();await reg(Q,'Quentin','quentin@test.ch','Rex');
  await valider(A);await valider(A);await P.waitForTimeout(1500);
  await Q.evaluate(async()=>{const l=[...ME.chiens];l[0]={...l[0],race:'Boxer bringé'};await ecrireChiens(ME.uid,l)});
  await go(P,'#club/chiens');await P.waitForTimeout(600);
  ok(!!(await P.$('.banner [data-fus]')),'un maître voit le doublon de son propre chien');
  ok(await P.$$eval('.chien-c',l=>l.filter(x=>x.querySelector('[data-fus]')).length)===1,'« Fusionner… » seulement sur ses propres chiens');
  await P.click('.banner [data-fus]');await P.waitForTimeout(500);
  await P.click(`[data-keep="${await P.$$eval('[data-keep]',l=>l.findIndex(x=>x.textContent.includes('Quentin')))}"]`);await P.waitForTimeout(2500);
  await go(P,'#club/chiens');
  ok(await nbCartes(P,'Rex')===1,'adhérent·e : fusion en gardant la fiche de l’autre');
  ok((await P.$$eval('.chien-c',l=>l.find(x=>x.querySelector('.chien-nom').textContent==='Rex').textContent)).includes('Pia'),'Pia est maître de la fiche de Quentin');
  // 2) Sam garde sa propre fiche : la fiche de Tom est marquée remplacée, et le profil de Tom suit à l'ouverture.
  const S_=await mk();await reg(S_,'Sam','sam@test.ch','Nala');const T=await mk();await reg(T,'Tom','tom@test.ch','Nala');
  await valider(A);await valider(A);await S_.waitForTimeout(1500);
  await T.evaluate(async()=>{const l=[...ME.chiens];l[0]={...l[0],naissance:'2022-03-03',remarque:'Craint l’orage'};await ecrireChiens(ME.uid,l)});
  await go(S_,'#club/chiens');await S_.waitForTimeout(600);
  await S_.click('.banner [data-fus]');await S_.waitForTimeout(500);
  await S_.click(`[data-keep="${await S_.$$eval('[data-keep]',l=>l.findIndex(x=>x.textContent.includes('Sam')))}"]`);await S_.waitForTimeout(2500);
  await go(S_,'#club/chiens');
  ok(await nbCartes(S_,'Nala')===1,'adhérent·e : fusion en gardant sa propre fiche');
  ok(await S_.evaluate(()=>ME.chiens[0].naissance==='2022-03-03'&&ME.chiens[0].remarque==='Craint l’orage'),'infos de l’autre fiche reprises');
  await T.reload();await T.waitForTimeout(3500);
  ok(await T.evaluate(()=>!!ME.chiens[0].lien),'le profil de Tom devient un lien tout seul');
  await go(J,'#club/chiens');await J.waitForTimeout(800);
  ok(await nbCartes(J,'Nala')===1&&(await J.$$eval('.chien-c',l=>l.find(x=>x.textContent.includes('Nala')).textContent)).includes('Tom'),'les autres membres voient une seule Nala, avec Sam et Tom');
  ok(!(await J.$('.banner')),'Julie ne voit pas les doublons des autres');

  await b.close();console.log(fails?fails+' échec(s)':'TOUT EST OK');process.exit(fails?1:0);
})();
