"use strict";
/* Annonces de naissances et chiots disponibles, par élevage.
   Une portée : {elevage, naissance, dispoDes, mere, pere, description, chiots:[{nom, sexe M/F, robe, dispo}], uid (auteur)}. */
const ELEV_FIELDS=[{k:"nom",l:"Nom de l’élevage",req:true},{k:"eleveur",l:"Éleveur·euse",req:true},{k:"adresse",l:"Adresse"},
  {k:"tel",l:"Téléphone",t:"tel",half:true},{k:"tel2",l:"Autre téléphone",t:"tel",half:true},{k:"email",l:"E-mail",t:"email",half:true},{k:"site",l:"Site internet",half:true,ph:"https://"},
  {k:"photo",l:"Logo ou photo",t:"photo"}];
const compte=p=>{const l=p.chiots||[];const M=l.filter(c=>c.sexe==="M"),F=l.filter(c=>c.sexe==="F");
  return{n:l.length,m:M.length,f:F.length,dm:M.filter(c=>c.dispo).length,df:F.filter(c=>c.dispo).length,d:l.filter(c=>c.dispo).length}};
VIEWS.chiots={t:"Chiots & portées",r(){
  const onlyDispo=ARG!=="tout";
  const portees=all("portees").filter(p=>!onlyDispo||compte(p).d>0||!(p.chiots||[]).length).sort((a,b)=>String(b.naissance).localeCompare(a.naissance));
  const elev=all("elevages").sort(byOrder);
  return`<p class="lead">Annonces de naissances et chiots disponibles chez les éleveurs proches du club.</p>
    <div class="row between wrap"><div class="seg"><a href="#chiots" class="${onlyDispo?"on":""}">Chiots disponibles</a><a href="#chiots/tout" class="${onlyDispo?"":"on"}">Toutes les portées</a></div>
      ${canWrite("portees")?addBtn("addPortee","Annoncer une portée"):""}</div>
    ${portees.length?`<div class="list">${portees.map(porteeCard).join("")}</div>`:`<p class="muted">${onlyDispo?"Aucun chiot disponible en ce moment.":"Aucune portée annoncée."}</p>`}
    <h2 class="h">Les élevages</h2>
    ${canWrite("elevages")?`<div class="row end">${addBtn("addElev","Ajouter un élevage")}</div>`:""}
    <div class="people">${elev.map(e=>`<div class="card person">${avatar(e.nom,e.photo,"lg")}<div class="grow"><b>${esc(e.nom)}</b><span class="role">${esc(e.eleveur||"")}</span>
      <div class="small">${e.adresse?esc(e.adresse)+"<br>":""}${[telLink(e.tel),telLink(e.tel2)].filter(Boolean).join(" · ")}${e.tel||e.tel2?"<br>":""}${mailLink(e.email)}${e.site?`<br><a target="_blank" rel="noopener" href="${esc(e.site)}">${esc(e.site.replace(/^https?:\/\//,""))}</a>`:""}</div></div>
      ${canEditDoc("elevages",e)?editBtn("data-elev",e.id):""}</div>`).join("")}</div>
    <p class="small muted">Le club met en relation ; chaque éleveur·euse est responsable de ses annonces. Demandez toujours les tests de santé des parents.</p>`;
},bind(m){
  $$("[data-portee]",m).forEach(b=>b.onclick=()=>editPortee(get("portees",b.dataset.portee)));
  $$("[data-chiot]",m).forEach(b=>b.onclick=e=>{e.stopPropagation();const[pid,i]=b.dataset.chiot.split(":");const p=get("portees",pid);
    const ch=[...p.chiots];ch[i]={...ch[i],dispo:!ch[i].dispo};put("portees",{...p,chiots:ch});toast(ch[i].dispo?"Chiot de nouveau disponible":"Chiot marqué réservé")});
  $$("[data-plus]",m).forEach(b=>b.onclick=()=>{const p=get("portees",b.dataset.plus);put("portees",{...p,chiots:(p.chiots||[]).map(c=>({...c,dispo:false}))});toast("Portée marquée « plus disponible »")});
  const ed=o=>editSheet(o.id?"Modifier l’élevage":"Nouvel élevage",ELEV_FIELDS,o,{wide:true,save:v=>put("elevages",{...o,...v}),remove:o.id&&isBoard()&&(()=>del("elevages",o.id))});
  const ae=$("#addElev",m);if(ae)ae.onclick=()=>ed({});
  $$("[data-elev]",m).forEach(b=>b.onclick=()=>ed(get("elevages",b.dataset.elev)));
  const ap=$("#addPortee",m);if(ap)ap.onclick=()=>editPortee({naissance:today(),chiots:[]});
}};
function porteeCard(p){
  const e=get("elevages",p.elevage)||{nom:p.elevageNom||"Élevage"};const k=compte(p);const can=canEditDoc("portees",p);
  const statut=!k.n?`<span class="badge info">Naissance annoncée</span>`:k.d?`<span class="badge good">${k.d} disponible${k.d>1?"s":""}</span>`:`<span class="badge bad">Plus disponible</span>`;
  const born=p.naissance&&parseDay(p.naissance)<=new Date();
  return`<div class="card portee">
    <div class="row between wrap"><div><b class="big">${esc(e.nom)}</b><div class="small muted">${esc(e.eleveur||"")}</div></div>${statut}</div>
    <p class="small">${born?`Nés le <b>${esc(fmtDayY(p.naissance))}</b> (${esc(ageFrom(p.naissance))})`:p.naissance?`Naissance prévue vers le <b>${esc(fmtDayY(p.naissance))}</b>`:""}${p.dispoDes?` · prêts à partir dès le ${esc(fmtDayY(p.dispoDes))}`:""}</p>
    ${p.mere||p.pere?`<p class="small">Parents : ${p.mere?"♀ "+esc(p.mere):""}${p.mere&&p.pere?" × ":""}${p.pere?"♂ "+esc(p.pere):""}</p>`:""}
    ${k.n?`<div class="counts"><span><b>${k.n}</b> chiot${k.n>1?"s":""}</span><span>♂ <b>${k.m}</b> mâle${k.m>1?"s":""} (${k.dm} dispo)</span><span>♀ <b>${k.f}</b> femelle${k.f>1?"s":""} (${k.df} dispo)</span></div>
      <div class="chips">${p.chiots.map((c,i)=>{const lab=`${c.sexe==="F"?"♀":"♂"} ${esc(c.nom||(c.sexe==="F"?"Femelle":"Mâle"))}${c.robe?" · "+esc(c.robe):""}`;
        return can?`<button class="chip ${c.dispo?"ok":"no"}" data-chiot="${esc(p.id)}:${i}" title="Changer la disponibilité">${lab} · ${c.dispo?"disponible":"réservé"}</button>`
          :`<span class="chip ${c.dispo?"ok":"no"}">${lab} · ${c.dispo?"disponible":"réservé"}</span>`}).join("")}</div>`:""}
    ${p.description?`<p>${rich(p.description)}</p>`:""}
    <div class="row wrap">${e.tel?`<a class="btn sm primary" href="tel:${esc(e.tel.replace(/[^\d+]/g,""))}">${ico("phone")} ${esc(e.tel)}</a>`:""}${e.email?`<a class="btn sm" href="mailto:${esc(e.email)}?subject=${encodeURIComponent("Portée du "+fmtDayY(p.naissance))}">${ico("mail")} Écrire</a>`:""}${e.site?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(e.site)}">${ico("ext")} Site</a>`:""}
      ${can?`<span class="grow"></span>${k.d?`<button class="btn sm ghost" data-plus="${esc(p.id)}">Plus disponible</button>`:""}<button class="btn sm ghost" data-portee="${esc(p.id)}">${ico("edit")} Modifier</button>`:""}</div>
  </div>`;
}
// Formulaire de portée avec la liste des chiots (une ligne par chiot).
function editPortee(o){
  const elev=all("elevages").sort(byOrder);
  if(!elev.length){toast("Ajoute d’abord ton élevage en bas de la page.","bad");return}
  const chiotRow=(c={sexe:"M",dispo:true})=>`<div class="chiot-row"><select name="sexe"><option value="M"${c.sexe==="M"?" selected":""}>♂ Mâle</option><option value="F"${c.sexe==="F"?" selected":""}>♀ Femelle</option></select>
    <input name="cnom" placeholder="Nom ou collier" value="${esc(c.nom||"")}"><input name="robe" placeholder="Robe" value="${esc(c.robe||"")}">
    <label class="chk"><input type="checkbox" name="dispo"${c.dispo?" checked":""}> dispo</label><button type="button" class="iconbtn" data-rm aria-label="Retirer">${ico("x")}</button></div>`;
  const s=sheet(o.id?"Modifier la portée":"Annoncer une portée",`<form class="form">
    <div class="f"><label>Élevage</label><select name="elevage" required>${elev.map(e=>`<option value="${esc(e.id)}"${e.id===o.elevage?" selected":""}>${esc(e.nom)} (${esc(e.eleveur||"")})</option>`).join("")}</select></div>
    <div class="f half"><label>Date de naissance (ou prévue)</label><input type="date" name="naissance" value="${esc(o.naissance||"")}" required></div>
    <div class="f half"><label>Prêts à partir dès le</label><input type="date" name="dispoDes" value="${esc(o.dispoDes||"")}"></div>
    <div class="f half"><label>Mère</label><input name="mere" value="${esc(o.mere||"")}"></div>
    <div class="f half"><label>Père</label><input name="pere" value="${esc(o.pere||"")}"></div>
    <div class="f"><label>Chiots</label><div id="chiots">${(o.chiots||[]).map(chiotRow).join("")}</div>
      <div class="row"><button type="button" class="btn sm" data-add="M">+ Mâle</button><button type="button" class="btn sm" data-add="F">+ Femelle</button></div>
      <small>Laisse vide pour annoncer une naissance à venir.</small></div>
    <div class="f"><label>Description</label><textarea name="description" rows="3" placeholder="Santé des parents, vaccins, puce, prix…">${esc(o.description||"")}</textarea></div>
    <div class="row end full">${o.id?`<button type="button" class="btn danger ghost" data-del>${ico("trash")} Supprimer</button><span class="grow"></span>`:""}<button type="button" class="btn" data-close>Annuler</button><button class="btn primary">Enregistrer</button></div></form>`,{wide:true});
  const f=$("form",s),box=$("#chiots",s);
  const wire=()=>$$("[data-rm]",box).forEach(b=>b.onclick=()=>b.closest(".chiot-row").remove());wire();
  $$("[data-add]",s).forEach(b=>b.onclick=()=>{box.insertAdjacentHTML("beforeend",chiotRow({sexe:b.dataset.add,dispo:true}));wire()});
  f.onsubmit=async e=>{e.preventDefault();
    const chiots=$$(".chiot-row",box).map(r=>({sexe:$("[name=sexe]",r).value,nom:$("[name=cnom]",r).value.trim(),robe:$("[name=robe]",r).value.trim(),dispo:$("[name=dispo]",r).checked}));
    const v={elevage:f.elevage.value,naissance:f.naissance.value,dispoDes:f.dispoDes.value,mere:f.mere.value.trim(),pere:f.pere.value.trim(),description:f.description.value.trim(),chiots};
    try{await put("portees",{...o,...v});closeSheet();toast("Annonce enregistrée")}catch(err){}
  };
  const d=$("[data-del]",s);if(d)d.onclick=async()=>{if(await confirmBox("Supprimer cette annonce ?"))del("portees",o.id)};
}
