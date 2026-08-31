(function () {
"use strict";
const client = window.clientData;
const storageKey = "astro-feedback-" + client.id + "-encrypted-v1";
const ratings = {match:"Очень похоже на меня",partial:"Частично подходит",miss:"Не подходит",general:"Слишком общее описание",unsure:"Пока не могу оценить"};
const feedbackFields = ["rating","hit","miss","question"];
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
function cleanState(raw) {
  const result = {feedback:{},answers:{}};
  if (!raw || typeof raw !== "object") return result;
  for (const section of client.sections) {
    const source = raw.feedback && own(raw.feedback,section.id) ? raw.feedback[section.id] : null;
    if (source && typeof source === "object") {
      result.feedback[section.id] = {};
      for (const key of feedbackFields) {
        if (own(source,key) && typeof source[key] === "string") result.feedback[section.id][key] = source[key].slice(0,5000);
      }
      if (!own(ratings,result.feedback[section.id].rating || "")) result.feedback[section.id].rating = "";
    }
    for (const q of section.questions || []) {
      if (raw.answers && own(raw.answers,q.id) && typeof raw.answers[q.id] === "string") result.answers[q.id] = raw.answers[q.id].slice(0,5000);
    }
  }
  return result;
}
function formatFeedback(raw) {
  const state = cleanState(raw);
  const blocks = [];
  for (const section of client.sections) {
    const f = state.feedback[section.id] || {};
    const lines = [];
    if (f.rating) lines.push("Оценка: " + ratings[f.rating]);
    if (f.hit && f.hit.trim()) lines.push("Что подходит / пример:\n" + f.hit.trim());
    if (f.miss && f.miss.trim()) lines.push("Что не подходит / поправка:\n" + f.miss.trim());
    if (f.question && f.question.trim()) lines.push("Что обсудить:\n" + f.question.trim());
    for (const q of section.questions || []) {
      const value = state.answers[q.id];
      if (value && value.trim()) lines.push(q.label + "\n" + value.trim());
    }
    if (lines.length) blocks.push("РАЗДЕЛ: " + section.title + "\n" + lines.join("\n\n"));
  }
  return blocks.length ? "Обратная связь — Мария\nПредварительный разбор, версия " + client.version + "\n\n" + blocks.join("\n\n──────────\n\n") : "";
}
function splitText(text,limit) {
  const parts = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n",limit);
    if (cut < limit / 2) cut = limit;
    else cut += 1;
    if (cut === limit && /[\uD800-\uDBFF]/.test(rest.charAt(cut-1))) cut--;
    parts.push(rest.slice(0,cut)); rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}
window.mariaFeedbackHelpers = {cleanState,formatFeedback,splitText};
if (typeof document === "undefined") return;

let state = cleanState(null);
let dirty = false;
let parts = [];
let partIndex = 0;
const esc = value => String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const getSection = () => client.sections.find(s=>s.id === window.location.hash.replace(/^#\/?/,"")) || client.sections[0];
function status(text) { const n=document.getElementById("page-status"); if(n)n.textContent=text; }
function hasAnswers() { return Boolean(formatFeedback(state)); }
function renderQuestions(section) {
  if (!(section.questions || []).length) return "";
  return '<section class="question-form" aria-label="Вопросы к разделу"><h3>Ваш опыт</h3><p class="notice">Все ответы необязательны. Можно написать «не помню» или пропустить вопрос.</p>' +
    section.questions.map(q=>'<label for="answer-'+esc(q.id)+'">'+esc(q.label)+'</label>' +
      (q.hint ? '<span class="field-hint" id="hint-'+esc(q.id)+'">'+esc(q.hint)+'</span>' : "") +
      '<textarea maxlength="5000" id="answer-'+esc(q.id)+'" data-answer="'+esc(q.id)+'"'+(q.hint?' aria-describedby="hint-'+esc(q.id)+'"':"")+'></textarea>').join("") + '</section>';
}
function render() {
  const section = getSection();
  document.title = "Мария — " + section.title;
  document.getElementById("app").innerHTML =
    '<div class="shell"><header class="topbar"><div class="brand"><div class="brand-mark" aria-hidden="true">М</div><div class="brand-text"><div class="brand-title">Мария</div><div class="brand-subtitle">Предварительный разбор</div></div></div><nav class="nav" aria-label="Разделы кабинета">' +
    client.sections.map(s=>'<button type="button" data-section="'+esc(s.id)+'" class="'+(s.id===section.id?"active":"")+'"'+(s.id===section.id?' aria-current="page"':"")+'>'+esc(s.title)+'</button>').join("") +
    '</nav><button type="button" class="ghost-button" id="lock-cabinet">Закрыть кабинет</button></header><main class="main"><section class="page-head"><div><div class="eyebrow">Творчество и профессиональное направление</div><h1>Мария</h1><p class="lead">'+esc(client.intro)+'</p></div></section><section class="section-layout"><article class="content-card"><div class="eyebrow">'+esc(section.summary)+'</div><h2 tabindex="-1" id="section-title">'+esc(section.title)+'</h2>'+section.body+renderQuestions(section)+
    '<div class="next-card"><h3>Следующий шаг</h3><p>'+esc(section.next || client.defaultNext)+'</p></div></article><aside class="feedback-card" aria-label="Обратная связь"><h3>Ваш отклик</h3><p>Можно не соглашаться и поправлять описание. Оценка не выбрана заранее.</p><label for="rating">Насколько подходит этот раздел?</label><select id="rating" data-feedback="rating"><option value="">Выберите, если хотите</option>'+
    Object.entries(ratings).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join("")+'</select>'+
    '<label for="hit">Что подходит? Пример из жизни</label><textarea maxlength="5000" id="hit" data-feedback="hit"></textarea><label for="miss">Что не подходит или требует поправки?</label><textarea maxlength="5000" id="miss" data-feedback="miss"></textarea><label for="question">Что хочется обсудить?</label><textarea maxlength="5000" id="question" data-feedback="question"></textarea>'+
    '<div class="section-actions"><button type="button" class="primary-button" id="prepare">Подготовить ОС из всех разделов</button><button type="button" class="secondary-button" id="save">Сохранить черновик на устройстве</button><button type="button" class="ghost-button" id="load">Загрузить сохранённый черновик</button><button type="button" class="ghost-button" id="clear">Удалить черновик и очистить ответы</button></div><p class="notice">Без сохранения черновика ответы живут только в открытой вкладке. Сохранённый черновик зашифрован тем же паролем. Не сохраняйте ответы на чужом устройстве и не оставляйте открытый кабинет без присмотра.</p><div class="status" id="page-status" role="status" aria-live="polite"></div></aside></section></main>'+
    '<footer class="footer">Содержимое и сохранённые черновики зашифрованы. Вход доступен любому, кто знает пароль; не передавайте его посторонним. Здесь нет полной анкеты и чувствительных подробностей. Ответы не отправляются на сервер сайта. Передать их Ольге можно вручную через Telegram. Версия '+esc(client.version)+'.</footer></div>'+
    '<dialog id="export-dialog" aria-labelledby="export-title"><h2 id="export-title">Проверьте обратную связь</h2><p>Ниже собраны только заполненные ответы. Скопируйте текст, откройте чат Ольги и отправьте его самостоятельно. Сайт не отправляет сообщения.</p><p id="part-label"></p><label for="export-text">Текст сообщения</label><textarea id="export-text" readonly></textarea><div class="dialog-actions"><button type="button" class="secondary-button" id="prev-part">Предыдущая часть</button><button type="button" class="secondary-button" id="next-part">Следующая часть</button><button type="button" class="primary-button" id="copy">Скопировать текст</button><a class="secondary-button" href="https://t.me/OlgaFleur" target="_blank" rel="noopener noreferrer">Открыть чат Ольги</a><button type="button" class="ghost-button" id="close-dialog">Вернуться к ответам</button></div><div id="copy-status" class="status" role="status" aria-live="polite"></div></dialog>';
  const f = state.feedback[section.id] || {};
  document.querySelectorAll("[data-feedback]").forEach(el=>{
    el.value = f[el.dataset.feedback] || "";
    el.addEventListener("input",()=>{
      if(!state.feedback[section.id])state.feedback[section.id]={};
      state.feedback[section.id][el.dataset.feedback]=el.value; dirty=true;
      status("Изменения остаются в этой вкладке; на сервер ничего не отправлено.");
    });
  });
  document.querySelectorAll("[data-answer]").forEach(el=>{
    el.value = state.answers[el.dataset.answer] || "";
    el.addEventListener("input",()=>{state.answers[el.dataset.answer]=el.value;dirty=true;status("Ответ изменён. При переходе между разделами он сохранится в этой вкладке.");});
  });
  document.querySelectorAll("[data-section]").forEach(button=>button.addEventListener("click",()=>{window.location.hash=button.dataset.section;}));
  document.getElementById("lock-cabinet").addEventListener("click",()=>window.location.reload());
  document.getElementById("save").addEventListener("click",async()=>{
    if(!hasAnswers()){status("Пока нет заполненных ответов.");return;}
    try {const snapshot=JSON.stringify(state); await window.cabinetVault.saveDraft(storageKey,snapshot); if(JSON.stringify(state)===snapshot)dirty=false;status("Зашифрованный черновик сохранён на этом устройстве. Ольге он не отправлен.");}
    catch {status("Браузер не разрешил сохранение. Подготовьте ОС и скопируйте текст, чтобы не потерять ответы.");}
  });
  document.getElementById("load").addEventListener("click",async()=>{
    if(dirty && !window.confirm("Заменить текущие ответы сохранённым черновиком?"))return;
    try {
      const before=JSON.stringify(state);
      const raw=await window.cabinetVault.loadDraft(storageKey);
      if(JSON.stringify(state)!==before){status("Ответы изменились во время загрузки. Черновик не применён; нажмите загрузку ещё раз при необходимости.");return;}
      if(!raw){status("Сохранённого черновика на этом устройстве нет.");return;}
      state=cleanState(JSON.parse(raw));dirty=false;render();status("Черновик загружен. Ничего не отправлено.");
    } catch {status("Не удалось прочитать черновик. Текущие ответы не заменены.");}
  });
  document.getElementById("clear").addEventListener("click",async()=>{
    if(!window.confirm("Удалить сохранённый черновик и очистить ответы во всех разделах?"))return;
    let removed=true;
    try {await window.cabinetVault.clearDraft(storageKey);} catch {removed=false;}
    state=cleanState(null);dirty=false;render();
    status(removed?"Ответы и сохранённый черновик удалены.":"Ответы во вкладке очищены, но браузер не подтвердил удаление сохранённого черновика.");
  });
  document.getElementById("prepare").addEventListener("click",()=>{
    const text=formatFeedback(state);
    if(!text){status("Добавьте хотя бы один ответ или оценку раздела.");return;}
    parts=splitText(text,3500);partIndex=0;showPart();
    document.getElementById("export-dialog").showModal();
  });
  document.getElementById("prev-part").addEventListener("click",()=>{if(partIndex>0)partIndex--;showPart();});
  document.getElementById("next-part").addEventListener("click",()=>{if(partIndex<parts.length-1)partIndex++;showPart();});
  document.getElementById("close-dialog").addEventListener("click",()=>{document.getElementById("export-dialog").close();document.getElementById("prepare").focus();});
  document.getElementById("copy").addEventListener("click",copyPart);
}
function showPart() {
  const multiple=parts.length>1;
  document.getElementById("part-label").textContent=multiple?"Часть "+(partIndex+1)+" из "+parts.length+". Длинные ответы разделены для Telegram. Отправьте все части.":"Одно сообщение";
  document.getElementById("export-text").value=(multiple?"ОС Марии — часть "+(partIndex+1)+"/"+parts.length+"\n\n":"")+parts[partIndex];
  document.getElementById("prev-part").hidden=!multiple;
  document.getElementById("next-part").hidden=!multiple;
  document.getElementById("prev-part").disabled=partIndex===0;
  document.getElementById("next-part").disabled=partIndex===parts.length-1;
  document.getElementById("copy-status").textContent="";
}
async function copyPart() {
  const box=document.getElementById("export-text");
  const message=document.getElementById("copy-status");
  let copied=false;
  try {
    if(navigator.clipboard && navigator.clipboard.writeText){await navigator.clipboard.writeText(box.value);copied=true;}
  } catch {}
  if(!copied){
    box.focus();box.select();
    try {copied=document.execCommand("copy");} catch {}
  }
  message.textContent=copied?"Текст скопирован. Откройте чат, вставьте сообщение и нажмите «Отправить» в Telegram.":"Не удалось скопировать автоматически. Текст выделен: скопируйте его вручную.";
}
window.addEventListener("hashchange",()=>{render();document.getElementById("section-title").focus();});
window.addEventListener("beforeunload",event=>{if(dirty&&hasAnswers()){event.preventDefault();event.returnValue="";}});
render();
}());
