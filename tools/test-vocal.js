// Test des messages vocaux et des accusés de lecture, contre les émulateurs Firebase (micro simulé par Chromium).
// Usage : python3 -m http.server 8765 dans le dossier de l'app, puis
//   npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-vocal.js"
const {chromium,webkit}=require('playwright');
const U='http://localhost:8765/';
const CONF='window.BCV_FIREBASE_CONFIG={apiKey:"demo-key",authDomain:"demo-bcv.firebaseapp.com",projectId:"demo-bcv"};window.BCV_EMULATEUR=true;';
let fails=0;const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m);if(!c)fails++};
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  const mk=async(vp={width:1200,height:850})=>{const ctx=await b.newContext({viewport:vp,permissions:['microphone']});
    await ctx.route('**/firebase-config.js',r=>r.fulfill({body:CONF,contentType:'application/javascript'}));
    const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGEERROR',e.message));return p};
  const go=async(p,h)=>{await p.evaluate(h=>location.hash=h,h);await p.waitForTimeout(800)};
  const reg=async(p,pseudo,mail)=>{await p.goto(U+'#compte/inscription');await p.waitForTimeout(1200);
    await p.fill('#rPseudo',pseudo);await p.fill('#rMail',mail);await p.fill('#rPass','secret123');await p.fill('#dNom','Chien de '+pseudo);
    await p.click('#regForm button.primary');await p.waitForTimeout(2500)};
  const tryWrite=(p,fn,arg)=>p.evaluate(`(async()=>{try{await (${fn.toString()})(${JSON.stringify(arg)});return 'ok'}catch(e){return 'ERR '+(e.code||'')+' '+e.message}})()`);
  const hold=async(p,ms)=>{const m=await p.$('.chat-form .mic');const bx=await m.boundingBox();
    await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2);await p.mouse.down();await p.waitForTimeout(ms);await p.mouse.up();await p.waitForTimeout(2500)};

  const A=await mk();await reg(A,'Lolo','lolo@test.ch');
  const B=await mk({width:390,height:800});await reg(B,'Bob','bob@test.ch');
  await go(A,'#reglages');await A.waitForTimeout(800);await A.click('[data-ok][data-r=adherent]');await A.waitForTimeout(2000);
  const aUid=await A.evaluate(()=>ME.uid),bUid=await B.evaluate(()=>ME.uid);
  console.log('   format enregistré par Chromium :',await A.evaluate(()=>vocalMime()));

  // ---- Tchat général : vocal maintenu-relâché ----
  await go(A,'#tchat');await A.waitForTimeout(800);
  ok(await A.isVisible('.chat-form .mic'),'bouton micro visible quand le champ est vide');
  await A.fill('#chatIn','x');await A.dispatchEvent('#chatIn','input');ok(!(await A.isVisible('.chat-form .mic')),'micro remplacé par « Envoyer » quand on écrit');
  await A.fill('#chatIn','');await A.dispatchEvent('#chatIn','input');
  await hold(A,2600);
  const v=await A.evaluate(()=>all('messages').find(x=>x.audio));
  ok(!!v&&v.audio.dur>=2&&v.audio.dur<4&&v.texte==='','message vocal envoyé (durée '+(v&&v.audio.dur)+' s, '+(v&&v.audio.size)+' octets, '+(v&&v.audio.mime)+')');
  ok(await A.isVisible('#chatList .vocal'),'lecteur affiché dans la bulle');
  ok(await A.evaluate(()=>!!document.querySelector('#chatList .msg.me .tick')&&!document.querySelector('#chatList .msg.me .tick.lu')),'coches grises (pas encore vu)');
  // Bob ouvre le tchat : il voit et écoute le vocal, la coche de Lolo passe au bleu
  await go(B,'#tchat');await B.waitForTimeout(1500);
  ok(await B.isVisible('#chatList .vocal'),'vocal reçu par Bob');
  await B.click('#chatList [data-play]');await B.waitForTimeout(1500);
  const st=await B.evaluate(()=>({on:!!document.querySelector('.vocal.on'),t:AUD&&AUD.currentTime,src:AUD&&AUD.src.slice(0,5),err:AUD&&AUD.error&&AUD.error.code}));
  ok(st.on&&st.t>0.3&&st.src==='blob:','lecture du vocal chez Bob ('+JSON.stringify(st)+')');
  await B.waitForTimeout(400);
  const w=await B.evaluate(()=>document.querySelector('.vocal.on .vbar i').style.width);ok(parseFloat(w)>5,'barre de progression qui avance ('+w+')');
  // Vitesse de lecture : 1× → 1,5× → 2× → 1×, retenue sur l'appareil
  await B.click('#chatList [data-speed]');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>AUD.playbackRate===1.5&&document.querySelector('.vspeed').textContent==='1,5×'),'vitesse 1,5× appliquée');
  await B.click('#chatList [data-speed]');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>AUD.playbackRate===2&&localStorage.getItem('bcv-vocal-vitesse')==='2'),'vitesse 2× appliquée et retenue');
  await B.click('#chatList [data-speed]');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>AUD.playbackRate===1),'retour à 1×');
  await A.waitForTimeout(1500);
  ok(await A.evaluate(()=>!!document.querySelector('#chatList .msg.me .tick.lu')),'coches bleues quand Bob a vu');
  await A.click('#chatList [data-vus]');await A.waitForTimeout(400);ok((await A.textContent('.sheet')).includes('Bob'),'« Vu par » liste Bob');await A.evaluate(()=>closeSheet());
  // Aperçu sur l'accueil
  await go(A,'#accueil');ok((await A.textContent('.apercu')).includes('Message vocal'),'aperçu « 🎤 Message vocal » sur l’accueil');

  // ---- Appui court = enregistrement verrouillé, puis annuler / envoyer ----
  await go(B,'#tchat');const m=await B.$('.chat-form .mic');await m.click();await B.waitForTimeout(1500);
  ok(await B.isVisible('.rec-ok'),'appui court : enregistrement verrouillé (boutons Supprimer / Envoyer)');
  await B.click('.rec-x');await B.waitForTimeout(800);
  ok(!(await B.isVisible('.rec-bar'))&&(await B.evaluate(()=>all('messages').filter(x=>x.audio).length))===1,'Supprimer : rien n’est envoyé');
  await m.click();await B.waitForTimeout(2200);await B.click('.rec-ok');await B.waitForTimeout(2500);
  ok((await B.evaluate(()=>all('messages').filter(x=>x.audio).length))===2,'Envoyer : deuxième vocal envoyé');
  // Glisser vers la gauche pour annuler
  {const bx=await m.boundingBox();await B.mouse.move(bx.x+20,bx.y+20);await B.mouse.down();await B.waitForTimeout(1500);
   for(let i=1;i<=6;i++){await B.mouse.move(bx.x+20-i*25,bx.y+20);await B.waitForTimeout(50)}await B.mouse.up();await B.waitForTimeout(1500)}
  ok((await B.evaluate(()=>all('messages').filter(x=>x.audio).length))===2,'glisser à gauche annule');

  // ---- Messages privés : vocal + coches ----
  await go(A,'#boite/m/'+bUid);await A.waitForTimeout(800);
  await A.fill('#dmIn','Salut Bob');await A.click('#dmForm button.primary:not(.mic)');await A.waitForTimeout(1500);
  await hold(A,1800);
  ok((await A.evaluate(()=>all('dmsgs').filter(x=>x.audio).length))===1,'vocal envoyé en message privé');
  ok((await A.textContent('.v-boite')).length>0&&await A.evaluate(()=>document.querySelectorAll('#dmList .msg.me .tick').length===2&&!document.querySelector('#dmList .tick.lu')),'privé : coches grises avant lecture');
  ok(await A.evaluate(c=>get('convs',c).last.includes('Message vocal'),[aUid,bUid].sort().join('_')),'aperçu de la conversation : « 🎤 Message vocal »');
  await go(B,'#boite/m/'+aUid);await B.waitForTimeout(1800);
  await B.click('#dmList [data-play]');await B.waitForTimeout(1200);
  ok(await B.evaluate(()=>!!AUD&&AUD.currentTime>0.2),'Bob écoute le vocal privé');
  await A.waitForTimeout(1500);
  ok(await A.evaluate(()=>document.querySelectorAll('#dmList .msg.me .tick.lu').length===2),'privé : coches bleues après lecture');
  // Supprimer le vocal supprime aussi le son
  const dm=await A.evaluate(()=>all('dmsgs').find(x=>x.audio));
  await A.evaluate(x=>delDM(x),dm);await A.waitForTimeout(1500);
  const left=await tryWrite(B,async([c,id])=>{const d=await firebase.firestore().doc(`convs/${c}/audios/${id}_0`).get({source:'server'});if(d.exists)throw new Error('encore là')},[dm.c,dm.id]);
  ok(left==='ok','supprimer un vocal efface aussi son enregistrement');

  // ---- Groupe ----
  await A.evaluate(async()=>{await put('groupes',{nom:'Balades',desc:'',prive:false,membres:[ME.uid]})});await A.waitForTimeout(1200);
  const gid=await A.evaluate(()=>all('groupes')[0].id);
  await B.evaluate(g=>rejoindreGroupe(get('groupes',g),true),gid);await B.waitForTimeout(1200);
  await go(A,'#tchat/'+gid);await A.waitForTimeout(1000);await hold(A,1500);
  ok((await A.evaluate(()=>all('gmsgs').filter(x=>x.audio).length))===1,'vocal envoyé dans un groupe');
  ok(await A.evaluate(()=>!!document.querySelector('#chatList .msg.me .tick')&&!document.querySelector('#chatList .tick.lu')),'groupe : coches grises');
  await go(B,'#tchat/'+gid);await B.waitForTimeout(2000);await A.waitForTimeout(1500);
  ok(await A.evaluate(()=>!!document.querySelector('#chatList .msg.me .tick.lu')),'groupe : coches bleues quand Bob a vu');

  // ---- Règles de la base ----
  let r=await tryWrite(B,u=>firebase.firestore().doc('lus/'+u).set({at:'2099'}),aUid);ok(r.includes('permission'),'impossible d’écrire l’accusé de lecture de quelqu’un d’autre');
  r=await tryWrite(B,()=>firebase.firestore().doc('audios/zz_0').set({uid:ME.uid,i:0,n:1,data:firebase.firestore.Blob.fromUint8Array(new Uint8Array(1000500))}));ok(r.includes('permission')||r.includes('exceeds'),'morceau de plus de 1 Mo refusé');
  r=await tryWrite(B,()=>firebase.firestore().doc('audios/zz_0').set({uid:'autre',i:0,n:1,data:firebase.firestore.Blob.fromUint8Array(new Uint8Array(10))}));ok(r.includes('permission'),'morceau au nom de quelqu’un d’autre refusé');
  r=await tryWrite(B,()=>firebase.firestore().collection('messages').add({uid:ME.uid,pseudo:ME.pseudo,texte:'',at:'1'}));ok(r.includes('permission'),'message vide (sans texte ni vocal) refusé');
  r=await tryWrite(B,()=>firebase.firestore().collection('messages').add({uid:ME.uid,pseudo:ME.pseudo,texte:'',audio:{dur:999,n:1,mime:'audio/mp4'},at:'1'}));ok(r.includes('permission'),'vocal trop long refusé');
  const C=await mk();await C.goto(U);await C.waitForTimeout(1500);
  r=await tryWrite(C,()=>firebase.firestore().collection('audios').get());ok(r.includes('permission'),'visiteur ne lit pas les vocaux');
  const pid=[aUid,bUid].sort().join('_');
  const D=await mk();await reg(D,'Dora','dora@test.ch');await go(A,'#reglages');await A.waitForTimeout(800);await A.click('[data-ok][data-r=adherent]');await A.waitForTimeout(1500);
  r=await tryWrite(D,c=>firebase.firestore().collection(`convs/${c}/audios`).get(),pid);ok(r.includes('permission'),'un·e autre membre ne lit pas les vocaux privés');
  r=await tryWrite(D,g=>firebase.firestore().collection(`groupes/${g}/audios`).get(),gid);ok(r.includes('permission'),'hors du groupe : vocaux du groupe illisibles');

  // ---- Safari (WebKit) : lecture d'un vocal enregistré ailleurs ----
  try{
    const wb=await webkit.launch();const wc=await wb.newContext({viewport:{width:390,height:800}});
    await wc.route('**/firebase-config.js',r=>r.fulfill({body:CONF,contentType:'application/javascript'}));
    const W=await wc.newPage();W.on('pageerror',e=>console.log('PAGEERROR webkit',e.message));
    await W.goto(U+'#compte');await W.waitForTimeout(1500);
    await W.evaluate(async()=>{await firebase.auth().signInWithEmailAndPassword('bob@test.ch','secret123')});await W.waitForTimeout(3000);
    await W.evaluate(()=>location.hash='#tchat');await W.waitForTimeout(2000);
    console.log('   WebKit : MediaRecorder',await W.evaluate(()=>!!window.MediaRecorder),'format',await W.evaluate(()=>window.MediaRecorder?vocalMime():'-'));
    ok(await W.isVisible('#chatList .vocal'),'WebKit : vocaux affichés');
    await W.click('#chatList [data-play]');await W.waitForTimeout(2000);
    const ws=await W.evaluate(()=>({t:AUD&&AUD.currentTime,err:AUD&&AUD.error&&AUD.error.code,on:!!document.querySelector('.vocal.on')}));
    console.log('   WebKit lecture :',JSON.stringify(ws));
    await wb.close();
  }catch(e){console.log('   WebKit indisponible :',e.message.split('\n')[0])}

  await b.close();console.log(fails?fails+' échec(s)':'TOUT EST OK');process.exit(fails?1:0);
})();
