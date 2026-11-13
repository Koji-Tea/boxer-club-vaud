"use strict";
/* Comptabilité du club, visible seulement par le comité.
   Résumé de l'exercice, cotisations, recettes et dépenses, factures, notes de frais, archives par année.
   Modifier : admin, président·e, caissier·ère. Notes de frais : chaque membre du comité en crée. */
let COMPTA_AN=ls("bcv-compta-an")||exoDe(new Date().toISOString());
const COMPTES={club:"Club Boxer Vaud",cabane:"Compte Cabane"};
const CAT_REC=["Cours","Dons","Manifestations","Vente vêtements","Location cabane","Subventions","Autres recettes"];
const CAT_DEP=["Cabane","Matériel","Assurances","Cotisation Boxer Club Suisse","Manifestations","Frais bancaires","Administration","Autres dépenses"];
const anDe=o=>o.date?exoDe(o.date):String(o.annee||"");
const exo=(an=COMPTA_AN)=>get("compta",an)||{};
const cloture=(an=COMPTA_AN)=>!!exo(an).cloture;
const peutModif=()=>isComptaEdit()&&!cloture();
// Montant de la cotisation : figé à la clôture de l'exercice, sinon celui des réglages.
const montantAn=an=>Number(exo(an).cotisation)||montantCotis();
const somme=l=>l.reduce((a,o)=>a+(Number(o.montant)||0),0);
function annees(){
  const set=new Set([anneeCotis(),COMPTA_AN]);
  ["ecritures","factures","notes"].forEach(c=>all(c).forEach(o=>{const a=anDe(o);if(/^\d{4}$/.test(a))set.add(a)}));
  all("compta").forEach(o=>set.add(o.id));all("cotisations").forEach(o=>Object.keys(o.paye||{}).forEach(a=>set.add(a)));
  return[...set].sort().reverse();
}
const cotisAn=an=>all("cotisations").filter(o=>(o.paye||{})[an]);
function bilan(an){
  const ec=all("ecritures").filter(o=>anDe(o)===an),fa=all("factures").filter(o=>anDe(o)===an),no=all("notes").filter(o=>anDe(o)===an);
  const nbCot=cotisAn(an).length,cot=nbCot*montantAn(an);
  const autresRec=somme(ec.filter(o=>o.sens==="recette")),ecDep=somme(ec.filter(o=>o.sens==="depense"));
  const faPay=somme(fa.filter(o=>o.payee)),noPay=somme(no.filter(o=>o.payee));
  const rec=cot+autresRec,dep=ecDep+faPay+noPay;
  return{ec,fa,no,nbCot,cot,autresRec,ecDep,faPay,noPay,rec,dep,res:rec-dep};
}
const signe=(n,sens)=>`<b class="${sens==="depense"?"neg":"pos"}">${sens==="depense"?"− ":"+ "}${chf(n)}</b>`;

VIEWS.compta={t:"Comptabilité",r(){
  if(!isComite())return comiteOnly();
  const tab=["cotisations","ecritures","factures","notes"].includes(ARG)?ARG:"resume";
  const aPayer=all("notes").filter(n=>!n.payee).length;
  const T=(k,l,n)=>`<a href="#compta${k==="resume"?"":"/"+k}" class="${tab===k?"on":""}">${l}${n?` <em class="pill">${n}</em>`:""}</a>`;
  return`<div class="row between wrap"><div class="seg">${T("resume","Résumé")}${T("cotisations","Cotisations")}${T("ecritures","Recettes & dépenses")}${T("factures","Factures")}${T("notes","Notes de frais",aPayer)}</div>
      <div class="row wrap an-bar">${isComptaEdit()&&!cloture()?`<button class="btn sm" id="clore2">${ico("shield")} Clôture fiscale</button>`:""}<label class="small an-sel">Exercice <select id="cAn">${annees().map(a=>`<option value="${a}"${a===COMPTA_AN?" selected":""}>${labelAn(a)}</option>`).join("")}</select></label></div></div>
    ${cloture()?`<div class="banner info">${ico("shield")}<div>L’exercice ${labelAn(COMPTA_AN)} est <b>clôturé</b> : il reste consultable dans les archives, mais n’est plus modifiable${isComptaEdit()?" (le rouvrir depuis le résumé si besoin)":""}.</div></div>`:""}
    ${!isComptaEdit()?`<p class="small muted">${ico("shield")} Consultation : seuls l’admin, le/la président·e et le/la caissier·ère modifient la comptabilité. Tu peux créer tes notes de frais.</p>`:""}
    ${{resume:resumeHTML,cotisations:cotisationsHTML,ecritures:ecrituresHTML,factures:facturesHTML,notes:notesHTML}[tab]()}`;
},bind(m){
  if(!isComite())return;
  const sel=$("#cAn",m);sel.onchange=()=>{COMPTA_AN=sel.value;ls("bcv-compta-an",COMPTA_AN);rerender()};
  const b=(id,f)=>{const e=$("#"+id,m);if(e)e.onclick=f};
  // Résumé
  b("soldes",()=>{const o=exo();editSheet("Soldes des comptes au "+fmtDayY(today()),[
      {k:"club",l:"Compte « Club Boxer Vaud » (CHF)",t:"number",half:true},{k:"cabane",l:"Compte « Cabane » (CHF)",t:"number",half:true},
      {k:"majLe",l:"Montants relevés le",t:"date",d:today()},{k:"notes",l:"Remarques",t:"textarea",rows:2}],
    {...o,majLe:today()},{save:v=>put("compta",{...o,...v,id:COMPTA_AN})})});
  b("csv",()=>exportCSV(COMPTA_AN));
  b("clore",()=>clotureFiscale(COMPTA_AN));b("clore2",()=>clotureFiscale(COMPTA_AN));
  b("rouvrir",()=>put("compta",{...exo(),id:COMPTA_AN,cloture:false}));
  $$("[data-arch]",m).forEach(x=>x.onclick=()=>{COMPTA_AN=x.dataset.arch;ls("bcv-compta-an",COMPTA_AN);rerender()});
  // Cotisations
  b("montantCot",()=>editSheet("Montant de la cotisation",[{k:"cotisation",l:"Cotisation annuelle Boxer Club Vaud (CHF)",t:"number",min:0,req:true}],{cotisation:montantCotis()},{save:v=>putCfg({cotisation:Number(v.cotisation)||0})}));
  bindCotis(m);
  // Écritures
  b("addEc",()=>editEcriture({sens:"recette",compte:"club",date:defDate()}));
  $$("[data-ec]",m).forEach(x=>x.onclick=e=>!e.target.closest("label,button")&&peutModif()&&editEcriture(get("ecritures",x.dataset.ec)));
  $$("[data-filt]",m).forEach(x=>x.onclick=()=>{ls("bcv-compta-filt",x.dataset.filt);rerender()});
  // Factures
  b("addFa",()=>editFacture({compte:"club",date:defDate()}));
  $$("[data-fa]",m).forEach(x=>x.onclick=e=>!e.target.closest("label,button")&&peutFacture(get("factures",x.dataset.fa))&&editFacture(get("factures",x.dataset.fa)));
  $$("[data-fapay]",m).forEach(c=>{c.onclick=e=>e.stopPropagation();c.onchange=()=>{const o=get("factures",c.dataset.fapay);put("factures",{...o,payee:c.checked,payeeLe:c.checked?today():""});toast(c.checked?"Facture notée payée":"Facture notée à payer")}});
  // Notes de frais
  b("addNote",()=>editNote({date:today()}));
  $$("[data-note]",m).forEach(x=>x.onclick=e=>{if(e.target.closest("label,button"))return;const o=get("notes",x.dataset.note);if(peutNote(o))editNote(o)});
  $$("[data-notepay]",m).forEach(c=>{c.onclick=e=>e.stopPropagation();c.onchange=()=>payerNote(get("notes",c.dataset.notepay),c.checked)});
  bindFichiers(m);
}};
const defDate=()=>COMPTA_AN===anneeCotis()?today():finAn(COMPTA_AN);

/* ---------- Résumé ---------- */
function resumeHTML(){
  const o=exo(),bl=bilan(COMPTA_AN);
  const fa=all("factures").filter(f=>!f.payee),no=all("notes").filter(n=>!n.payee);
  const line=(l,v,cls="")=>`<div class="kv ${cls}"><span>${l}</span><div>${v}</div></div>`;
  const total=(Number(o.club)||0)+(Number(o.cabane)||0);
  return`<div class="stats">
      <div class="card stat"><span class="small muted">${COMPTES.club}</span><b>${o.club!=null?chf(o.club):"—"}</b></div>
      <div class="card stat"><span class="small muted">${COMPTES.cabane}</span><b>${o.cabane!=null?chf(o.cabane):"—"}</b></div>
      <div class="card stat soft"><span class="small muted">Total disponible</span><b>${o.club!=null||o.cabane!=null?chf(total):"—"}</b></div></div>
    <p class="small muted">${o.majLe?"Montants relevés le "+esc(fmtDayY(o.majLe)):"Montants des comptes pas encore saisis pour "+labelAn(COMPTA_AN)+"."}${o.notes?" · "+esc(o.notes):""}</p>
    ${peutModif()?`<div class="row wrap"><button class="btn sm" id="soldes">${ico("edit")} Saisir les soldes des comptes</button></div>`:""}
    <h2 class="h">Exercice ${labelAn(COMPTA_AN)}</h2>
    <div class="card">
      ${line("Cotisations membres",`${bl.nbCot} × ${chf(montantAn(COMPTA_AN))} = <b class="pos">${chf(bl.cot)}</b>`)}
      ${line("Autres recettes",`<b class="pos">${chf(bl.autresRec)}</b>`)}
      ${line("<b>Total des recettes</b>",`<b class="pos">${chf(bl.rec)}</b>`,"tot")}
      ${line("Dépenses saisies",`<b class="neg">${chf(bl.ecDep)}</b>`)}
      ${line("Factures payées",`<b class="neg">${chf(bl.faPay)}</b>`)}
      ${line("Notes de frais payées",`<b class="neg">${chf(bl.noPay)}</b>`)}
      ${line("<b>Total des dépenses</b>",`<b class="neg">${chf(bl.dep)}</b>`,"tot")}
      ${line("<b>Résultat</b>",`<b class="${bl.res<0?"neg":"pos"}">${chf(bl.res)}</b>`,"tot")}
    </div>
    ${fa.length||no.length?`<div class="banner">${ico("clock")}<div><b>À payer : ${chf(somme(fa)+somme(no))}</b><br><span class="small">${fa.length?`<a href="#compta/factures">${fa.length} facture${fa.length>1?"s":""}</a>`:""}${fa.length&&no.length?" · ":""}${no.length?`<a href="#compta/notes">${no.length} note${no.length>1?"s":""} de frais</a>`:""}</span></div></div>`:""}
    <div class="row wrap"><button class="btn sm" id="csv">${ico("download")} Exporter ${labelAn(COMPTA_AN)} (tableur CSV)</button>
      ${isComptaEdit()?(cloture()?`<button class="btn sm ghost" id="rouvrir">Rouvrir l’exercice ${labelAn(COMPTA_AN)}</button>`:`<button class="btn sm ghost" id="clore">${ico("check")} Clôture fiscale ${labelAn(COMPTA_AN)}</button>`):""}</div>
    <h2 class="h">Archives</h2>
    <div class="list">${annees().map(a=>{const x=bilan(a),e=exo(a);return`<button class="card row arch ${a===COMPTA_AN?"on":""}" data-arch="${a}"><b>${labelAn(a)}</b><span class="grow small">${e.cloture?`Clôturé${e.clotureLe?" le "+esc(fmtDayY(e.clotureLe)):""}`:"En cours"}</span><span class="small">Recettes ${chf(x.rec)} · Dépenses ${chf(x.dep)} · <b class="${x.res<0?"neg":"pos"}">${chf(x.res)}</b></span></button>`}).join("")}</div>
    <p class="small muted">Les factures et notes de frais payées comptent automatiquement dans les dépenses, et les cotisations cochées dans les recettes : inutile de les saisir une deuxième fois.</p>`;
}

/* ---------- Cotisations ---------- */
function cotisationsHTML(){
  const an=COMPTA_AN,list=all("users").filter(u=>MEMBERS.includes(u.role)).sort((a,b)=>String(a.pseudo).localeCompare(b.pseudo));
  const paid=cotisAn(an),m=montantAn(an);
  return`<div class="banner good">${ico("check")}<div><b>${paid.length} cotisation${paid.length>1?"s":""} payée${paid.length>1?"s":""} en ${labelAn(an)} × ${chf(m)} = ${chf(paid.length*m)}</b><br>
      <span class="small">${list.length-list.filter(u=>cotisPayee(u.id,an)).length} adhérent·e·s n’ont pas encore payé.</span></div></div>
    ${isComptaEdit()&&!cloture()?`<div class="row wrap"><button class="btn sm" id="montantCot">${ico("edit")} Montant : ${chf(montantCotis())} par an</button></div>`:""}
    ${!isCotisEdit()?`<p class="small muted">Seuls l’admin, le/la président·e, le/la caissier·ère et le/la responsable membres cochent les cotisations.</p>`:""}
    <div class="list">${list.map(u=>`<div class="card adh">${userRow(u)}<div class="adh-foot">${cotisCtrl(u,an)}</div></div>`).join("")}</div>`;
}

/* ---------- Recettes et dépenses ---------- */
function editEcriture(o){
  editSheet(o.id?"Modifier l’écriture":"Nouvelle écriture",[
    {k:"sens",l:"Type",t:"select",o:[["recette","Recette (entrée d’argent)"],["depense","Dépense (sortie d’argent)"]],half:true},
    {k:"compte",l:"Compte",t:"select",o:Object.entries(COMPTES),half:true},
    {k:"date",l:"Date",t:"date",req:true,half:true},{k:"montant",l:"Montant (CHF)",t:"number",min:0,req:true,half:true},
    {k:"libelle",l:"Libellé",req:true,ph:"Vente de vêtements, assurance RC…"},
    {k:"cat",l:"Catégorie",t:"select",o:[...CAT_REC.map(c=>[c,"Recette · "+c]),...CAT_DEP.map(c=>[c,"Dépense · "+c])]},
    {k:"fichiers",l:"Justificatifs",t:"files"},{k:"remarque",l:"Remarque",t:"textarea",rows:2}],o,{wide:true,
    save:v=>put("ecritures",{...o,...v,montant:Math.abs(Number(v.montant)||0),annee:exoDe(v.date)}),
    remove:o.id&&(()=>{del("ecritures",o.id);supprimerFichiers(o.fichiers)})});
}
function ecrituresHTML(){
  const f=ls("bcv-compta-filt")||"tous";
  const l=all("ecritures").filter(o=>anDe(o)===COMPTA_AN&&(f==="tous"||o.compte===f)).sort((a,b)=>String(b.date).localeCompare(a.date));
  const rec=somme(l.filter(o=>o.sens==="recette")),dep=somme(l.filter(o=>o.sens==="depense"));
  return`<div class="row between wrap"><div class="seg">${[["tous","Tous les comptes"],...Object.entries(COMPTES)].map(([k,n])=>`<button data-filt="${k}" class="${f===k?"on":""}">${n}</button>`).join("")}</div>
      ${peutModif()?addBtn("addEc","Nouvelle écriture"):""}</div>
    <p class="small">Recettes <b class="pos">${chf(rec)}</b> · Dépenses <b class="neg">${chf(dep)}</b> · Solde <b>${chf(rec-dep)}</b></p>
    ${l.length?`<div class="list">${l.map(o=>`<div class="card row ec" data-ec="${esc(o.id)}">
      <span class="when"><b>${esc(fmtDayY(o.date).split(" ").slice(0,2).join(" "))}</b></span>
      <span class="grow"><b>${esc(o.libelle)}</b><br><span class="small muted">${[o.cat,COMPTES[o.compte]].filter(Boolean).map(esc).join(" · ")}</span>${fichiersHTML(o.fichiers)}</span>${signe(o.montant,o.sens)}</div>`).join("")}</div>`
      :`<p class="muted">Aucune écriture pour ${labelAn(COMPTA_AN)}.</p>`}`;
}

/* ---------- Factures ---------- */
// Chaque membre du comité ajoute (scanne) une facture ; seuls admin, président·e et caissier·ère la marquent payée.
const peutFacture=o=>!!o&&!cloture(anDe(o))&&(isComptaEdit()||(o.uid===ME.uid&&!o.payee));
function editFacture(o){
  const pay=isComptaEdit();
  editSheet(o.id?"Modifier la facture":"Nouvelle facture",[
    {k:"fournisseur",l:"Fournisseur",req:true,half:true},{k:"objet",l:"Objet",half:true},
    {k:"date",l:"Date de la facture",t:"date",req:true,half:true},{k:"echeance",l:"À payer avant le",t:"date",half:true},
    {k:"montant",l:"Montant (CHF)",t:"number",min:0,req:true,half:true},{k:"compte",l:"Payée depuis le compte",t:"select",o:Object.entries(COMPTES),half:true},
    {k:"fichiers",l:"Facture scannée",t:"files"},
    ...(pay?[{k:"payee",l:"Facture payée",t:"check"},{k:"payeeLe",l:"Payée le",t:"date"}]:[]),
    {k:"remarque",l:"Remarque",t:"textarea",rows:2}],o,{wide:true,
    save:v=>{const p=pay?!!v.payee:!!o.payee;return put("factures",{...o,...v,payee:p,payeeLe:p?(v.payeeLe||o.payeeLe||today()):"",annee:exoDe(v.date),uid:o.uid||ME.uid})},
    remove:o.id&&(()=>{del("factures",o.id);supprimerFichiers(o.fichiers)})});
}
function factureCard(o){
  const late=!o.payee&&o.echeance&&o.echeance<today();
  return`<div class="card fa" data-fa="${esc(o.id)}"><div class="row"><span class="grow"><b>${esc(o.fournisseur)}</b>${o.objet?` · ${esc(o.objet)}`:""}<br>
    <span class="small muted">${esc(fmtDayY(o.date))} · ${esc(COMPTES[o.compte]||"")}${o.payee?` · payée le ${esc(fmtDayY(o.payeeLe))}`:o.echeance?` · à payer avant le ${esc(fmtDayY(o.echeance))}`:""}</span>
    ${late?` <span class="badge bad">En retard</span>`:""}</span><b>${chf(o.montant)}</b></div>
    ${fichiersHTML(o.fichiers)}
    ${isComptaEdit()&&!cloture(anDe(o))?`<label class="chk"><input type="checkbox" data-fapay="${esc(o.id)}"${o.payee?" checked":""}> Payée</label>`:""}</div>`;
}
function facturesHTML(){
  const ouv=all("factures").filter(o=>!o.payee).sort((a,b)=>String(a.echeance||a.date).localeCompare(b.echeance||b.date));
  const pay=all("factures").filter(o=>o.payee&&anDe(o)===COMPTA_AN).sort((a,b)=>String(b.payeeLe||b.date).localeCompare(a.payeeLe||a.date));
  return`<div class="row between wrap"><p class="small">À payer : <b>${chf(somme(ouv))}</b></p>${!cloture()?addBtn("addFa","Nouvelle facture"):""}</div>
    <h2 class="h">À payer (${ouv.length})</h2>${ouv.length?`<div class="list">${ouv.map(factureCard).join("")}</div>`:`<p class="muted">Aucune facture en attente.</p>`}
    <h2 class="h">Payées en ${labelAn(COMPTA_AN)} (${pay.length})</h2>${pay.length?`<div class="list">${pay.map(factureCard).join("")}</div>`:`<p class="muted">Aucune facture payée en ${labelAn(COMPTA_AN)}.</p>`}
    <p class="small muted">Scanne la facture avec l’appareil photo du téléphone, ou joins le PDF reçu par e-mail. Les factures payées restent archivées par année.</p>`;
}

/* ---------- Notes de frais ---------- */
const peutNote=o=>!!o&&!cloture(anDe(o))&&(isComptaEdit()||(o.uid===ME.uid&&!o.payee));
function editNote(o){
  editSheet(o.id?"Note de frais":"Nouvelle note de frais",[
    {k:"motif",l:"Motif",req:true,ph:"Achat de friandises pour les cours, essence…"},
    {k:"date",l:"Date de la dépense",t:"date",req:true,half:true},{k:"montant",l:"Montant (CHF)",t:"number",min:0,req:true,half:true},
    {k:"fichiers",l:"Tickets et quittances",t:"files",h:"Prends une photo de chaque ticket : il est joint à la note."},
    {k:"iban",l:"Rembourser sur (IBAN ou Twint, facultatif)",ph:"CH.. ou 079…"},
    {k:"remarque",l:"Remarque",t:"textarea",rows:2}],o,{wide:true,
    save:async v=>{
      const neuf=!o.id;
      const n=await put("notes",{...o,...v,montant:Math.abs(Number(v.montant)||0),annee:exoDe(v.date),uid:o.uid||ME.uid,pseudo:o.pseudo||ME.pseudo||"",payee:!!o.payee});
      if(neuf){
        // Le/la caissier·ère est prévenu·e de chaque nouvelle demande (à défaut le/la président·e, puis l'admin).
        const dest=comptesRole("caissier","president","admin").filter(u=>u.id!==ME.uid);
        for(const u of dest)await notifier(u.id,"Nouvelle note de frais",`${n.pseudo} : ${n.motif} – ${chf(n.montant)}`,"#compta/notes");
        toast("Note de frais envoyée"+(dest.length?" au/à la caissier·ère":""));
      }
    },
    remove:o.id&&(()=>{del("notes",o.id);supprimerFichiers(o.fichiers)})});
}
async function payerNote(o,on){
  await put("notes",{...o,payee:on,payeeLe:on?today():"",payePar:on?ME.pseudo||"":""});
  if(on&&o.uid&&o.uid!==ME.uid)await notifier(o.uid,"Note de frais payée",`${o.motif} – ${chf(o.montant)}, payée le ${fmtDayY(today())}.`,"#compta/notes");
  toast(on?"Note de frais payée : "+(o.pseudo||"")+" est prévenu·e":"Note de frais remise à payer");
}
function noteCard(o){
  const u=get("users",o.uid);
  return`<div class="card note ${o.payee?"payee":""}" data-note="${esc(o.id)}"><div class="row">${avatar(o.pseudo,u&&u.photo,"sm")}<span class="grow"><b>${esc(o.motif)}</b><br>
    <span class="small muted">${esc(o.pseudo)} · ${esc(fmtDayY(o.date))}${o.payee?` · payée le ${esc(fmtDayY(o.payeeLe))}${o.payePar?" par "+esc(o.payePar):""}`:""}</span></span><b>${chf(o.montant)}</b></div>
    ${o.remarque?`<p class="small">${rich(o.remarque)}</p>`:""}${fichiersHTML(o.fichiers)}
    <div class="row wrap">${isComptaEdit()&&!cloture(anDe(o))?`<label class="chk"><input type="checkbox" data-notepay="${esc(o.id)}"${o.payee?" checked":""}> Payée</label>`:o.payee?`<span class="badge good">${ico("check")} Payée</span>`:`<span class="badge">À payer</span>`}</div></div>`;
}
function notesHTML(){
  const ouv=all("notes").filter(o=>!o.payee).sort((a,b)=>String(a.date).localeCompare(b.date));
  const pay=all("notes").filter(o=>o.payee&&anDe(o)===COMPTA_AN).sort((a,b)=>String(b.payeeLe||b.date).localeCompare(a.payeeLe||a.date));
  return`<div class="row between wrap"><p class="small">Chaque membre du comité peut demander le remboursement d’une dépense pour le club, avec ses tickets.</p>${addBtn("addNote","Nouvelle note de frais")}</div>
    <h2 class="h">À payer (${ouv.length}) · ${chf(somme(ouv))}</h2>${ouv.length?`<div class="list">${ouv.map(noteCard).join("")}</div>`:`<p class="muted">Aucune note de frais en attente.</p>`}
    <h2 class="h">Payées en ${labelAn(COMPTA_AN)} (${pay.length}) · archivées</h2>${pay.length?`<div class="list">${pay.map(noteCard).join("")}</div>`:`<p class="muted">Aucune note payée en ${labelAn(COMPTA_AN)}.</p>`}`;
}

/* ---------- Clôture fiscale ----------
   Fige le bilan de l'exercice (1er octobre – 30 septembre) et l'archive dans les documents du comité, avec le détail en tableur.
   Les soldes des comptes bancaires ne sont pas touchés : c'est seulement l'écriture comptable de l'année. */
async function clotureFiscale(an){
  const bl=bilan(an),L=labelAn(an);
  const ouv=[...all("factures"),...all("notes")].filter(o=>!o.payee&&anDe(o)===an).length;
  if(!await confirmBox(`Clôture fiscale ${L} (du ${fmtDayY(debutAn(an))} au ${fmtDayY(finAn(an))}) : le bilan est figé et archivé dans « Documents du comité ». Les écritures de cet exercice ne pourront plus être modifiées (sauf en le rouvrant). Les soldes des comptes ne changent pas.${ouv?` Attention : ${ouv} facture(s) ou note(s) de frais de cet exercice ne sont pas encore payées.`:""}`,"Clôturer"))return;
  try{
    const nom=`cloture-fiscale-${an}-${+an+1}.csv`,tmp=uid();
    PENDING[tmp]={nom,type:"text/csv",data:"data:text/csv;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent("\ufeff"+csvTexte(an))))};
    const fichiers=await envoyerFichiers([{tmp,nom,type:"text/csv"}]);
    const txt=`Exercice ${L}, du ${fmtDayY(debutAn(an))} au ${fmtDayY(finAn(an))}.
Cotisations : ${bl.nbCot} × ${chf(montantAn(an))} = ${chf(bl.cot)}
Total des recettes : ${chf(bl.rec)}
Total des dépenses : ${chf(bl.dep)}
Résultat : ${chf(bl.res)}
Clôturé le ${fmtDayY(today())} par ${ME.pseudo||""}.`;
    await put("docscomite",{type:"Clôture comptable",date:today(),annee:exoDe(today()),titre:"Clôture fiscale "+L,remarque:txt,fichiers,uid:ME.uid});
    await put("compta",{...exo(an),id:an,cloture:true,cotisation:montantAn(an),bilan:{recettes:bl.rec,depenses:bl.dep,resultat:bl.res},clotureLe:today(),cloturePar:ME.pseudo||""});
    toast("Exercice "+L+" clôturé et archivé dans les documents du comité");
  }catch(e){toast(e.message||"Clôture impossible pour l’instant","bad")}
}

/* ---------- Export pour un tableur ---------- */
function exportCSV(an){telecharger(`comptabilite-boxer-club-vaud-${an}-${+an+1}.csv`,csvTexte(an))}
function csvTexte(an){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`,n=x=>(Number(x)||0).toFixed(2);
  const rows=[["Type","Date","Libellé","Catégorie","Compte","Recette","Dépense","Statut"]];
  cotisAn(an).forEach(c=>{const u=get("users",c.id);rows.push(["Cotisation",(c.date||{})[an]||"","Cotisation "+((u&&u.pseudo)||c.id),"Cotisations",COMPTES.club,n(montantAn(an)),"","Payée"])});
  all("ecritures").filter(o=>anDe(o)===an).forEach(o=>rows.push(["Écriture",o.date,o.libelle,o.cat||"",COMPTES[o.compte]||"",o.sens==="recette"?n(o.montant):"",o.sens==="depense"?n(o.montant):"",""]));
  all("factures").filter(o=>anDe(o)===an).forEach(o=>rows.push(["Facture",o.date,o.fournisseur+(o.objet?" – "+o.objet:""),"",COMPTES[o.compte]||"","",n(o.montant),o.payee?"Payée le "+o.payeeLe:"À payer"]));
  all("notes").filter(o=>anDe(o)===an).forEach(o=>rows.push(["Note de frais",o.date,o.motif+" ("+o.pseudo+")","Notes de frais","","",n(o.montant),o.payee?"Payée le "+o.payeeLe:"À payer"]));
  const e=exo(an);rows.push([]);rows.push(["Solde",e.majLe||"",COMPTES.club,"","",e.club!=null?n(e.club):""]);rows.push(["Solde",e.majLe||"",COMPTES.cabane,"","",e.cabane!=null?n(e.cabane):""]);
  return rows.map(r=>r.map(q).join(";")).join("\r\n");
}
