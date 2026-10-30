(function(){
"use strict";
const client=window.clientData;
const storageKey="client-feedback-"+client.id+"-v1";
const choiceLabels={a:"Ближе описание А",b:"Ближе описание Б",both:"Подходят оба",none:"Не подходит ни одно",unsure:"Пока не уверен"};
const forecastLabels={match:"Совпало",partial:"Совпало частично",miss:"Не совпало",unknown:"Пока не могу оценить"};
const forecastQuestions=client.forecast.periods.flatMap(p=>[{id:"forecast_"+p.id+"_rating"},{id:"forecast_"+p.id+"_notes"}]);
const questionList=client.comparisons.flatMap(t=>t.questions).concat([client.closingQuestion],forecastQuestions);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cleanState(raw){
 const result={choices:{},answers:{}};
 if(!raw||typeof raw!=="object")return result;
 for(const t of client.comparisons){
  const v=raw.choices&&own(raw.choices,t.id)?raw.choices[t.id]:"";
  if(typeof v==="string"&&own(choiceLabels,v))result.choices[t.id]=v;
 }
 for(const q of questionList){
  const v=raw.answers&&own(raw.answers,q.id)?raw.answers[q.id]:null;
  if(typeof v==="string")result.answers[q.id]=v.slice(0,5000);
 }
 return result;
}
function formatFeedback(raw){
 const s=cleanState(raw),blocks=[];
 for(const t of client.comparisons){
  const lines=[];
  if(s.choices[t.id])lines.push("Выбор: "+choiceLabels[s.choices[t.id]]);
  for(const q of t.questions)if(s.answers[q.id]?.trim())lines.push(q.label+"\n"+s.answers[q.id].trim());
  if(lines.length)blocks.push(t.title+"\n"+lines.join("\n\n"));
 }
 const final=s.answers[client.closingQuestion.id]?.trim();
 if(final)blocks.push(client.closingQuestion.label+"\n"+final);
 for(const p of client.forecast.periods){
  const rating=s.answers["forecast_"+p.id+"_rating"],notes=s.answers["forecast_"+p.id+"_notes"]?.trim(),lines=[];
  if(rating&&forecastLabels[rating])lines.push("Оценка: "+forecastLabels[rating]);
  if(notes)lines.push("Что происходило:\n"+notes);
  if(lines.length)blocks.push("2026 · "+p.range+" · "+p.title+"\n"+lines.join("\n\n"));
 }
 return blocks.length?"Обратная связь — Алексей\nВерсия "+client.version+"\n\n"+blocks.join("\n\n──────────\n\n"):"";
}
function splitText(text,limit=3500){
 const parts=[];let rest=text;
 while(rest.length>limit){
  let cut=rest.lastIndexOf("\n",limit);
  cut=cut<limit/2?limit:cut+1;
  if(/[\uD800-\uDBFF]/.test(rest.charAt(cut-1)))cut--;
  parts.push(rest.slice(0,cut));rest=rest.slice(cut);
 }
 if(rest)parts.push(rest);
 return parts;
}
function profileHTML(){
 return '<div class="note">Это рабочий портрет для обсуждения, а не психологическое заключение. В нём могут быть неточности. Здесь можно спокойно прочитать текст; выбирать описания и оставлять ответы вы будете в отдельных разделах.</div>'+
 client.sections.map(s=>'<section class="profile-topic"><h3>'+esc(s.title)+'</h3>'+s.body+'</section>').join("")+
 '<div class="next-card"><h3>Дальше — сравнение описаний</h3><p>В каждой теме предложены два разных способа действовать. Не нужно выбирать один вариант для всего портрета.</p><button type="button" class="primary-button" data-go="compare">Перейти к описаниям</button></div>';
}
function comparisonsHTML(s){
 return '<p class="section-intro">В каждой теме прочитайте оба описания и выберите подходящий ответ. Можно отметить оба варианта, ни один или пока не выбирать. Здесь нет правильных ответов и заранее выбранного результата.</p>'+
 client.comparisons.map((t,i)=>'<section class="comparison-topic" aria-labelledby="topic-'+t.id+'"><div class="eyebrow">Тема '+(i+1)+' из '+client.comparisons.length+'</div><h3 id="topic-'+t.id+'">'+esc(t.title)+'</h3><div class="comparison-grid">'+
 ["a","b"].map(k=>'<article class="variant-card"><span class="variant-badge">Описание '+k.toUpperCase()+'</span>'+t[k]+'</article>').join("")+
 '</div><fieldset class="choice-fieldset"><legend>Ваш выбор по этой теме</legend><div class="choice-options">'+Object.entries(choiceLabels).map(([v,label])=>'<label class="choice-pill'+(s.choices[t.id]===v?' is-selected':'')+'"><input type="radio" name="choice-'+t.id+'" data-choice="'+t.id+'" value="'+v+'"'+(s.choices[t.id]===v?' checked':'')+'><span>'+esc(label)+'</span></label>').join("")+'</div></fieldset>'+
 '<button type="button" class="ghost-button" data-reset="'+t.id+'">Сбросить выбор</button><div class="neither-note" data-neither="'+t.id+'"'+(s.choices[t.id]==="none"?'':' hidden')+'><p>Можно описать свой подход в отдельном разделе. Достаточно ответить на удобные вам вопросы.</p><button type="button" class="secondary-button" data-go="questions">Уточнить своими словами</button></div></section>').join("");
}
function questionHTML(q,s){
 return '<div class="answer-field"><label for="answer-'+q.id+'">'+esc(q.label)+'</label><p class="field-hint" id="hint-'+q.id+'">'+esc(q.hint||"Можно пропустить.")+'</p><textarea id="answer-'+q.id+'" data-answer="'+q.id+'" aria-describedby="hint-'+q.id+'" maxlength="5000">'+esc(s.answers[q.id]||"")+'</textarea></div>';
}
function forecastHTML(s){
 return '<div class="note">'+esc(client.forecast.intro)+'</div><div class="forecast-list">'+client.forecast.periods.map((p,i)=>{
  const rid="forecast_"+p.id+"_rating",nid="forecast_"+p.id+"_notes",selected=s.answers[rid]||"";
  return '<section class="forecast-period"><div class="period-meta"><span class="period-number">'+(i+1)+'</span><div><div class="period-range">'+esc(p.range)+'</div><span class="period-status">'+esc(p.status)+'</span></div></div><h3>'+esc(p.title)+'</h3><p>'+esc(p.body)+'</p><div class="check-box"><strong>Что проверить</strong><p>'+esc(p.check)+'</p></div><fieldset class="choice-fieldset"><legend>Насколько это похоже на ваш 2026 год?</legend><div class="choice-options">'+Object.entries(forecastLabels).map(([v,label])=>'<label class="choice-pill'+(selected===v?' is-selected':'')+'"><input type="radio" name="'+rid+'" data-forecast="'+rid+'" value="'+v+'"'+(selected===v?' checked':'')+'><span>'+esc(label)+'</span></label>').join("")+'</div></fieldset><div class="answer-field"><label for="answer-'+nid+'">Что происходило на самом деле?</label><p class="field-hint" id="hint-'+nid+'">Можно указать событие, решение или коротко написать, что тема не проявилась.</p><textarea id="answer-'+nid+'" data-answer="'+nid+'" aria-describedby="hint-'+nid+'" maxlength="5000">'+esc(s.answers[nid]||"")+'</textarea></div></section>';
 }).join("")+'</div><div class="next-card"><button type="button" class="primary-button" data-go="review">Посмотреть мой отклик</button></div>';
}
function questionsHTML(s,showAll){
 const selected=client.comparisons.filter(t=>showAll||s.choices[t.id]==="none");
 const hasPrevious=questionList.some(q=>s.answers[q.id]?.trim());
 if(!selected.length&&!showAll)return '<div class="empty-state"><h3>Этот раздел — для вашего собственного описания</h3><p>Вопросы по теме появятся здесь, если вы выберете «Не подходит ни одно» в сравнении описаний. При желании можно открыть все вопросы сразу.</p>'+(hasPrevious?'<p>Ранее заполненные ответы сохранены и видны в разделе «Мой отклик». Откройте все вопросы, чтобы изменить их.</p>':'')+'<button type="button" class="secondary-button" id="show-all">Открыть все вопросы</button><button type="button" class="ghost-button" data-go="compare">Вернуться к описаниям</button></div>';
 return '<p class="section-intro">Здесь можно заменить предложенные описания своими словами. Ответьте только на то, что считаете полезным. Не нужно раскрывать личные подробности других людей.</p>'+
 selected.map(t=>'<section class="question-topic"><h3>'+esc(t.title)+'</h3>'+t.questions.map(q=>questionHTML(q,s)).join("")+'</section>').join("")+
 '<section class="question-topic"><h3>Дополнение к портрету</h3>'+questionHTML(client.closingQuestion,s)+'</section>'+
 (!showAll?'<button type="button" class="ghost-button" id="show-all">Открыть вопросы по всем темам</button>':'')+
 '<div class="next-card"><button type="button" class="primary-button" data-go="review">Посмотреть мой отклик</button></div>';
}
function reviewHTML(s){
 const text=formatFeedback(s);
 return text?'<p>Ниже собраны ваши выборы и все заполненные ответы, в том числе введённые ранее. Здесь можно проверить текст перед копированием. Ничего не отправляется автоматически.</p><pre class="feedback-preview">'+esc(text)+'</pre><button type="button" class="primary-button" data-export>Подготовить к отправке</button>':'<div class="empty-state"><h3>Отклик пока не заполнен</h3><p>Выберите подходящие описания или добавьте свой вариант в отдельном разделе вопросов.</p><button type="button" class="primary-button" data-go="compare">Сравнить описания</button></div>';
}
window.alexeyFeedbackHelpers={cleanState,formatFeedback,splitText,profileHTML,comparisonsHTML,forecastHTML,questionsHTML,reviewHTML};
if(typeof document==="undefined")return;
let state=cleanState(null),dirty=false,revision=0,showAll=false,busy=false,parts=[],partIndex=0;
const pages={profile:{title:"Личный портрет",summary:"Описание без вопросов"},compare:{title:"Сравнить описания",summary:"Два варианта по каждой теме"},forecast:{title:"2026: проверить",summary:"Периоды года и место для ваших фактов"},questions:{title:"Уточнить своими словами",summary:"Отдельные вопросы, если описания не подошли"},review:{title:"Мой отклик",summary:"Ваши выборы и дополнения"}};
const pageId=()=>own(pages,window.location.hash.slice(1))?window.location.hash.slice(1):"profile";
const status=text=>{const el=document.getElementById("page-status");if(el)el.textContent=text;};
function setBusy(value){busy=value;document.querySelectorAll("[data-store-op]").forEach(el=>el.disabled=value);}
function changed(){dirty=true;revision++;status("Изменения остаются в этой вкладке. Чтобы вернуться позже, сохраните черновик.");updateCount();}
function updateCount(){const e=document.getElementById("choice-count");if(!e)return;if(pageId()==="forecast"){const n=client.forecast.periods.filter(p=>state.answers["forecast_"+p.id+"_rating"]).length;e.textContent="Проверено периодов: "+n+" из "+client.forecast.periods.length;}else e.textContent="Выбрано тем: "+Object.keys(state.choices).length+" из "+client.comparisons.length;}
function updateChoice(topic){
 document.querySelectorAll('[data-choice="'+topic+'"]').forEach(el=>{el.checked=el.value===state.choices[topic];el.closest("label").classList.toggle("is-selected",el.checked);});
 const n=document.querySelector('[data-neither="'+topic+'"]');if(n)n.hidden=state.choices[topic]!=="none";
}
function render(){
 const id=pageId(),page=pages[id];
 const content=id==="profile"?profileHTML():id==="compare"?comparisonsHTML(state):id==="forecast"?forecastHTML(state):id==="questions"?questionsHTML(state,showAll):reviewHTML(state);
 document.title="Алексей — "+page.title;
 document.getElementById("app").innerHTML='<div class="shell alexey-shell"><header class="topbar"><div class="brand"><div class="brand-mark" aria-hidden="true">А</div><div class="brand-text"><div class="brand-title">Алексей</div><div class="brand-subtitle">Личный кабинет</div></div></div><nav class="nav" aria-label="Разделы кабинета">'+Object.entries(pages).map(([key,p])=>'<button type="button" data-go="'+key+'" class="'+(id===key?'active':'')+'"'+(id===key?' aria-current="page"':'')+'>'+p.title+'</button>').join("")+'</nav><button type="button" class="ghost-button" id="lock">Закрыть кабинет</button></header>'+
 '<main class="main"><section class="page-head"><div><div class="eyebrow">Личный портрет и обратная связь</div><h1 tabindex="-1" id="page-title">'+page.title+'</h1><p class="lead">'+esc(id==="profile"?client.intro:page.summary)+'</p></div><p id="choice-count" class="progress-label"></p></section><article class="content-card alexey-content">'+content+'</article>'+
 '<section class="draft-panel" aria-label="Сохранение и передача отклика"><div class="section-actions"><button type="button" class="secondary-button" id="save" data-store-op>Сохранить черновик</button><button type="button" class="ghost-button" id="load" data-store-op>Загрузить черновик</button><button type="button" class="ghost-button" id="clear" data-store-op>Очистить ответы</button><button type="button" class="primary-button" data-export>Подготовить отклик</button></div><p class="notice">Без сохранения ответы остаются только в открытой вкладке. Сохранённый черновик зашифрован и хранится на этом устройстве. На сервер сайта ответы не отправляются.</p><div id="page-status" role="status" aria-live="polite" class="status"></div></section></main>'+
 '<footer class="footer">Пароль открывает содержимое в вашем браузере. Не передавайте его посторонним и закрывайте кабинет после работы. Передача отклика Ольге — только вручную. Версия '+esc(client.version)+'.</footer></div>'+
 '<dialog id="export-dialog" aria-labelledby="export-title"><h2 id="export-title">Передать отклик Ольге</h2><p>Проверьте текст, скопируйте его и самостоятельно отправьте в Telegram. Если частей несколько, отправьте каждую.</p><p id="part-label"></p><label for="export-text">Текст сообщения</label><textarea id="export-text" readonly></textarea><div class="dialog-actions"><button type="button" class="secondary-button" id="prev">Предыдущая часть</button><button type="button" class="secondary-button" id="next">Следующая часть</button><button type="button" class="primary-button" id="copy">Скопировать текст</button><a class="secondary-button" href="https://t.me/OlgaFleur" target="_blank" rel="noopener noreferrer">Открыть чат Ольги</a><button type="button" class="ghost-button" id="close-dialog">Вернуться</button></div><div id="copy-status" role="status" aria-live="polite" class="status"></div></dialog>';
 updateCount();setBusy(busy);
 document.querySelectorAll("[data-go]").forEach(el=>el.addEventListener("click",()=>window.location.hash=el.dataset.go));
 document.querySelectorAll("[data-choice]").forEach(el=>el.addEventListener("change",()=>{state.choices[el.dataset.choice]=el.value;changed();updateChoice(el.dataset.choice);}));
 document.querySelectorAll("[data-forecast]").forEach(el=>el.addEventListener("change",()=>{state.answers[el.dataset.forecast]=el.value;changed();document.querySelectorAll('[data-forecast="'+el.dataset.forecast+'"]').forEach(x=>x.closest("label").classList.toggle("is-selected",x.checked));}));
 document.querySelectorAll("[data-reset]").forEach(el=>el.addEventListener("click",()=>{delete state.choices[el.dataset.reset];changed();updateChoice(el.dataset.reset);}));
 document.querySelectorAll("[data-answer]").forEach(el=>el.addEventListener("input",()=>{state.answers[el.dataset.answer]=el.value;changed();}));
 document.getElementById("show-all")?.addEventListener("click",()=>{showAll=true;render();document.getElementById("page-title").focus();});
 document.getElementById("lock").addEventListener("click",()=>window.location.reload());
 document.getElementById("save").addEventListener("click",async()=>{
  if(busy)return;if(!formatFeedback(state)){status("Пока нет выборов или ответов для сохранения.");return;}
  const at=revision,snapshot=JSON.stringify(state);setBusy(true);
  try{await window.cabinetVault.saveDraft(storageKey,snapshot);if(revision===at)dirty=false;status(revision===at?"Зашифрованный черновик сохранён на этом устройстве.":"Черновик сохранён; более поздние изменения ещё нужно сохранить.");}
  catch{status("Не удалось сохранить. Подготовьте отклик и скопируйте текст, чтобы не потерять ответы.");}
  finally{setBusy(false);}
 });
 document.getElementById("load").addEventListener("click",async()=>{
  if(busy)return;if(dirty&&!window.confirm("Заменить текущие ответы сохранённым черновиком?"))return;
  const at=revision;setBusy(true);
  try{const raw=await window.cabinetVault.loadDraft(storageKey);if(revision!==at){status("Ответы изменились во время загрузки. Черновик не применён.");return;}if(!raw){status("Сохранённого черновика на этом устройстве нет.");return;}state=cleanState(JSON.parse(raw));dirty=false;revision++;render();status("Черновик загружен. Ничего не отправлено.");}
  catch{status("Не удалось загрузить черновик. Текущие ответы сохранены во вкладке.");}
  finally{setBusy(false);}
 });
 document.getElementById("clear").addEventListener("click",async()=>{
  if(busy||!window.confirm("Очистить все выборы и ответы и удалить сохранённый черновик?"))return;
  setBusy(true);state=cleanState(null);dirty=false;revision++;render();
  try{await window.cabinetVault.clearDraft(storageKey);status("Выборы, ответы и сохранённый черновик удалены.");}
  catch{status("Ответы во вкладке очищены, но браузер не подтвердил удаление сохранённого черновика.");}
  finally{setBusy(false);}
 });
 document.querySelectorAll("[data-export]").forEach(el=>el.addEventListener("click",()=>{
  const text=formatFeedback(state);if(!text){status("Сначала выберите описание или добавьте ответ.");return;}parts=splitText(text);partIndex=0;showPart();document.getElementById("export-dialog").showModal();
 }));
 document.getElementById("prev").addEventListener("click",()=>{if(partIndex>0)partIndex--;showPart();});
 document.getElementById("next").addEventListener("click",()=>{if(partIndex<parts.length-1)partIndex++;showPart();});
 document.getElementById("close-dialog").addEventListener("click",()=>document.getElementById("export-dialog").close());
 document.getElementById("copy").addEventListener("click",copyPart);
}
function showPart(){
 const many=parts.length>1;
 document.getElementById("part-label").textContent=many?"Часть "+(partIndex+1)+" из "+parts.length:"Одно сообщение";
 document.getElementById("export-text").value=(many?"Отклик Алексея — "+(partIndex+1)+"/"+parts.length+"\n\n":"")+parts[partIndex];
 for(const id of ["prev","next"])document.getElementById(id).hidden=!many;
 document.getElementById("prev").disabled=partIndex===0;document.getElementById("next").disabled=partIndex===parts.length-1;document.getElementById("copy-status").textContent="";
}
async function copyPart(){
 const box=document.getElementById("export-text");let ok=false;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(box.value);ok=true;}}catch{}
 if(!ok){box.focus();box.select();try{ok=document.execCommand("copy");}catch{}}
 document.getElementById("copy-status").textContent=ok?"Скопировано. Вставьте текст в чат Ольги и отправьте самостоятельно.":"Скопируйте выделенный текст вручную.";
}
window.addEventListener("hashchange",()=>{render();document.getElementById("page-title").focus();});
window.addEventListener("beforeunload",event=>{if(dirty&&formatFeedback(state)){event.preventDefault();event.returnValue="";}});
render();
}());
