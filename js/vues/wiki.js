"use strict";
/* Wiki : questions / réponses sur le boxer, classées par thème, avec recherche. */
const WIKI_CATS=["Le club","Le boxer","Santé","Au quotidien","Éducation"];
const WIKI_FIELDS=()=>[{k:"q",l:"Question",req:true},{k:"r",l:"Réponse",t:"textarea",rows:6,req:true},
  {k:"cat",l:"Thème",t:"select",o:[...new Set([...WIKI_CATS,...all("wiki").map(w=>w.cat).filter(Boolean)])]},{k:"ordre",l:"Ordre d’affichage",t:"number"}];
VIEWS.wiki={t:"Wiki du boxer",r(){
  const list=all("wiki").sort(byOrder);
  const cats=[...new Set([...WIKI_CATS,...list.map(w=>w.cat)])].filter(c=>list.some(w=>w.cat===c));
  return`<p class="lead">Les questions importantes sur le boxer et la vie du club.</p>
    <div class="row between wrap"><div class="search grow">${ico("search")}<input id="wq" type="search" placeholder="Chercher : chaleur, chiot, torsion…"></div>${canWrite("wiki")?addBtn("addWiki","Nouvelle question"):""}</div>
    ${cats.map(c=>`<section class="wcat"><h2 class="h">${esc(c)}</h2>${list.filter(w=>w.cat===c).map(w=>`
      <details class="card qa" data-s="${esc(norm(w.q+" "+w.r))}"><summary>${esc(w.q)}</summary><div>${rich(w.r)}${canWrite("wiki")?`<div class="row end">${editBtn("data-wiki",w.id)}</div>`:""}</div></details>`).join("")}</section>`).join("")}
    <p class="muted" id="wnone" hidden>Aucune réponse trouvée. Posez la question aux moniteurs ou dans le tchat !</p>
    <p class="small muted">Ces réponses sont des conseils généraux : en cas de doute sur la santé de votre chien, demandez à votre vétérinaire.</p>`;
},bind(m){
  const q=$("#wq",m);q.oninput=()=>{const t=norm(q.value);let any=false;
    $$(".qa",m).forEach(d=>{const ok=!t||d.dataset.s.includes(t);d.hidden=!ok;if(ok)any=true;if(t&&ok)d.open=true});
    $$(".wcat",m).forEach(s=>s.hidden=!$$(".qa",s).some(d=>!d.hidden));$("#wnone",m).hidden=any};
  const ed=o=>editSheet(o.id?"Modifier la question":"Nouvelle question",WIKI_FIELDS(),o,{wide:true,save:v=>put("wiki",{...o,...v}),remove:o.id&&(()=>del("wiki",o.id))});
  const a=$("#addWiki",m);if(a)a.onclick=()=>ed({cat:"Le boxer"});
  $$("[data-wiki]",m).forEach(b=>b.onclick=e=>{e.preventDefault();ed(get("wiki",b.dataset.wiki))});
}};
