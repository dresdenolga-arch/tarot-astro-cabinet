const DATA = window.TAROT_ASTRO_DATA;
const state = {
  mode: "solar",
  cardId: "tarot_major_15",
  houseId: "solar_house_07",
  dossierTab: "short",
};

const $ = (selector) => document.querySelector(selector);

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function byId(list, id) {
  return list.find((item) => item.id === id) || list[0];
}

function list(items) {
  if (!items || !items.length) return "<p class='empty'>Пока нет данных</p>";
  return `<ul class="clean">${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function optionList(items, selectedId) {
  return items.map((item) => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

function findCombo(card, house) {
  return DATA.combos.find((combo) => combo.card_id === card.id && combo.house_id === house.id);
}

function render() {
  const app = $("#app");
  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <h1>Таро-Астро наставник</h1>
          <p>Мобильный кабинет для обучения, Соляра, разборов и дневника</p>
        </div>
        <div class="status-pill">${DATA.cards.length} карт · ${DATA.houses.length} домов</div>
      </header>
      ${renderModeGrid()}
      <section class="layout">
        ${renderControls()}
        <div class="panel"><div class="panel-inner result">${renderMode()}</div></div>
      </section>
    </main>
    ${renderBottomNav()}
  `;
  bindEvents();
}

function renderModeGrid() {
  return `<nav class="mode-grid">${DATA.modes.map((mode) => `
    <button class="mode-btn ${state.mode === mode.id ? "active" : ""}" data-mode="${mode.id}">
      <strong>${mode.name}</strong><span>${mode.hint}</span>
    </button>`).join("")}</nav>`;
}

function renderBottomNav() {
  return `<nav class="bottom-nav">${DATA.modes.map((mode) => `
    <button class="${state.mode === mode.id ? "active" : ""}" data-mode="${mode.id}">${mode.name}</button>`).join("")}</nav>`;
}

function renderControls() {
  const needsCard = ["immerse", "dossier", "solar", "quiz"].includes(state.mode);
  const needsHouse = state.mode === "solar" || (state.mode === "dossier" && state.dossierTab === "solar");
  return `<aside class="panel"><div class="panel-inner">
    <h2>${DATA.modes.find((m) => m.id === state.mode)?.name || "Режим"}</h2>
    ${needsCard ? `<div class="field"><label for="cardSelect">Карта</label><select id="cardSelect">${optionList(DATA.cards, state.cardId)}</select></div>` : ""}
    ${needsHouse ? `<div class="field"><label for="houseSelect">Дом Соляра</label><select id="houseSelect">${optionList(DATA.houses, state.houseId)}</select></div>` : ""}
    ${state.mode === "case" ? renderCaseControls() : ""}
    ${state.mode === "diary" ? renderDiaryControls() : ""}
    <div class="button-row">
      <button class="primary" id="copyResult">Копировать итог</button>
      <button class="quiet" id="resetView">Сбросить</button>
    </div>
  </div></aside>`;
}

function renderCaseControls() {
  return `
    <div class="field"><label for="caseQuestion">Вопрос</label><textarea id="caseQuestion" placeholder="Например: что мне важно понять в отношениях сейчас?"></textarea></div>
    <div class="field"><label for="caseTarot">Карты / расклад</label><textarea id="caseTarot" placeholder="Например: Дьявол в 7 доме, Жрица, 2 Мечей..."></textarea></div>
    <div class="field"><label for="caseAstro">Астрологические показатели</label><textarea id="caseAstro" placeholder="Например: активен 7 дом, транзит к Венере..."></textarea></div>
    <button class="secondary" id="saveCase">Сохранить разбор</button>
  `;
}

function renderDiaryControls() {
  return `
    <div class="field"><label for="diaryEvent">Наблюдение</label><textarea id="diaryEvent" placeholder="Что произошло, что почувствовала, какая карта включилась?"></textarea></div>
    <div class="field"><label for="diaryTags">Теги</label><input id="diaryTags" placeholder="Дьявол, 7 дом, отношения" /></div>
    <button class="secondary" id="saveDiary">Записать</button>
  `;
}

function renderMode() {
  if (state.mode === "immerse") return renderImmerse();
  if (state.mode === "dossier") return renderDossier();
  if (state.mode === "solar") return renderSolar();
  if (state.mode === "quiz") return renderQuiz();
  if (state.mode === "case") return renderCase();
  if (state.mode === "diary") return renderDiary();
  return "";
}

function findDossier(card) {
  return (DATA.dossiers || []).find((item) => item.card_id === card.id);
}

function solarHouseFocus(card, house) {
  const name = card.name;
  const lowerHouse = house.name.toLowerCase();
  const houseQuestion = house.main_question || "Как эта сфера хочет проявиться в году?";
  if (name === "Девятка Жезлы" && house.number === 1) {
    return {
      formula: "Год учит входить в новый цикл не из доказательства силы, а из зрелой собранности: я знаю, сколько во мне огня, где моя граница и как мне не жить в постоянной обороне.",
      yearTask: "В 1 доме 9 Жезлов становится темой личности, тела, внешнего проявления и первого импульса года. Это не про то, что весь год надо держать удар. Скорее, год показывает, где ты уже выросла, многое выдержала и теперь можешь опираться на опыт без привычки напрягаться заранее. Важно научиться показывать себя не через усталую стойкость, а через спокойную силу и право выбирать, кого и что впускать в свое поле.",
      resource: [
        "Собрать себя вокруг собственного опыта: признать, что ты уже не начинаешь с нуля.",
        "Выстроить личные границы в теле, графике, общении и самопрезентации без оправданий.",
        "Показывать силу спокойно: не доказывать, не соревноваться, не жить в режиме ожидания нападения.",
      ],
      shadow: [
        "Входить в год как в оборону: будто нужно заранее защищаться от людей, задач и чужих ожиданий.",
        "Путать самостоятельность с закрытостью: никого не подпускать, даже когда контакт мог бы поддержать.",
        "Держать тело в постоянной мобилизации: напряженные плечи, сжатая спина, невозможность расслабиться.",
      ],
      practice: [
        "Сформулировать личное правило года: что я больше не доказываю.",
        "Отследить, где тело сжимается до того, как реально появилась угроза.",
        "Выбрать один способ быть видимой без борьбы: спокойный пост, честный разговор, обновление образа, ясное 'нет'.",
      ],
      eventMarkers: [
        "Ситуации, где нужно отстоять свое время, тело, стиль, желание или право на паузу.",
        "Повторы старого сценария: 'я должна выдержать сама'.",
        "Моменты, когда окружающие проверяют твою границу, а ты учишься отвечать без атаки.",
      ],
      questions: [
        "Где я уже достаточно сильна и могу перестать это доказывать?",
        "Какая моя граница в этом году защищает жизнь, а какая держит меня в одиночестве?",
        "Как мое тело показывает, что я снова в режиме обороны?",
        "Каким человеком я становлюсь, если выбираю спокойную силу вместо постоянной готовности к бою?",
      ],
    };
  }
  const cardLine = String(card.display_formula || card.core_formula || name).replace(/[.]+$/, "");
  return {
    formula: `В теме “${house.name}” карта “${name}” показывает, какие ситуации, люди и внутренние реакции будут чаще всего включать эту тему в течение года.`,
    yearTask: `${house.core_formula || houseQuestion} Здесь важно спросить не “что значит ${name} вообще?”, а “как ${name} будет проявляться именно через ${lowerHouse}?”`,
    resource: [
      `В этой сфере года наблюдать, где проявляется тема карты: ${cardLine}.`,
      `Смотреть, какие люди и события включают тему “${house.name}”, а не трактовать карту отдельно от жизни.`,
      "Переводить символ в навык: что я могу сделать, сказать, выбрать, остановить или признать."
    ],
    shadow: [
      "читать карту слишком общо и не связывать ее с конкретной сферой дома",
      "перекладывать всю тему на других людей вместо наблюдения своей роли",
      "ждать события, но не замечать ежедневных повторяющихся сигналов"
    ],
    practice: card.practice_steps,
    eventMarkers: card.in_life,
    questions: card.study_prompts || card.self_check_questions || [
      houseQuestion,
      "Через каких людей или события эта тема может стать видимой?",
      "Что здесь нужно сделать практически, а не только понять?"
    ],
  };
}

function renderCardHero(card, kicker = "Карта") {
  const formula = card.display_formula || card.core_formula || "";
  return `<section class="hero-card">
    <p class="kicker">${kicker}</p>
    <h2>${escapeHtml(card.name)}</h2>
    <p class="formula">${escapeHtml(formula)}</p>
  </section>`;
}

function renderImmerse() {
  const card = byId(DATA.cards, state.cardId);
  return `
    ${renderCardHero(card, "Погружение")}
    <div class="info-grid">
      <section class="info-block wide"><h3>Как понять карту</h3><p class="prose">${escapeHtml(card.learning_text || card.core_formula || "")}</p></section>
      <section class="info-block resource"><h3>Как это заметить в жизни</h3>${list(card.in_life || card.resource)}</section>
      <section class="info-block shadow"><h3>Когда карта уводит не туда</h3>${list(card.blind_spots || card.shadow)}</section>
      <section class="info-block observe"><h3>В отношениях</h3><p class="prose">${escapeHtml(card.relationships || "Посмотри, как карта меняет контакт, дистанцию, желание и способ говорить с другим человеком.")}</p></section>
      <section class="info-block observe"><h3>В работе и делах</h3><p class="prose">${escapeHtml(card.work || "Посмотри, какой практический процесс, решение или ресурс показывает карта.")}</p></section>
      ${card.body ? `<section class="info-block practice"><h3>Телесный ключ</h3><p class="prose">${escapeHtml(card.body)}</p></section>` : ""}
      <section class="info-block practice"><h3>Практика на сегодня</h3>${list(card.practice_steps)}</section>
      <section class="info-block wide"><h3>Вопросы, которые раскрывают карту</h3>${list(card.study_prompts || card.self_check_questions)}</section>
    </div>
  `;
}

function renderSolar() {
  const card = byId(DATA.cards, state.cardId);
  const house = byId(DATA.houses, state.houseId);
  const combo = findCombo(card, house);
  const dynamic = solarHouseFocus(card, house);
  const formula = combo?.core_formula || dynamic.formula;
  const resource = combo?.resource || dynamic.resource;
  const shadow = combo?.shadow || dynamic.shadow;
  const questions = combo?.self_check_questions || dynamic.questions;
  return `
    <section class="hero-card">
      <p class="kicker">Карта + дом Соляра</p>
      <h2>${escapeHtml(card.name)} · ${escapeHtml(house.name)}</h2>
      <p class="formula">${escapeHtml(formula)}</p>
    </section>
    <div class="chips">${(house.keywords || []).map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join("")}</div>
    <div class="info-grid">
      <section class="info-block wide"><h3>Как читать эту связку</h3><p class="prose">${escapeHtml(combo?.year_task || dynamic.yearTask)}</p></section>
      <section class="info-block resource"><h3>Что тренировать в этой сфере</h3>${list(resource)}</section>
      <section class="info-block shadow"><h3>Какие сигналы не пропустить</h3>${list(shadow)}</section>
      <section class="info-block practice"><h3>Практические шаги</h3>${list(combo?.practice || dynamic.practice)}</section>
      <section class="info-block observe"><h3>Что наблюдать в году</h3>${list(combo?.event_markers || dynamic.eventMarkers)}</section>
      <section class="info-block wide"><h3>Вопросы дневника</h3>${list(questions)}</section>
    </div>
  `;
}

function renderDossier() {
  const card = byId(DATA.cards, state.cardId);
  const house = byId(DATA.houses, state.houseId);
  const dossier = findDossier(card);
  if (!dossier) {
    return `
      ${renderCardHero(card, "Досье")}
      <section class="info-block wide">
        <h3>Полное досье еще не собрано</h3>
        <p class="prose">Для этой карты пока доступна краткая учебная карточка. Полные досье будут добавляться постепенно по образцу Дьявола: с символами, практиками, отношениями, Соляром, ошибками трактовки и источниками.</p>
      </section>
      <div class="info-grid">
        <section class="info-block resource"><h3>Пока можно изучать так</h3>${list(card.in_life || card.resource)}</section>
        <section class="info-block practice"><h3>Практика</h3>${list(card.practice_steps)}</section>
      </div>
    `;
  }
  const activeTab = dossier.tabs.find((tab) => tab.id === state.dossierTab) || dossier.tabs[0];
  const solarFocus = activeTab.id === "solar" ? solarHouseFocus(card, house) : null;
  const solarAddOn = solarFocus ? `
    <div class="info-grid dossier-solar-add">
      <section class="info-block wide"><h3>${escapeHtml(card.name)} · ${escapeHtml(house.name)}</h3><p class="prose">${escapeHtml(solarFocus.yearTask)}</p></section>
      <section class="info-block resource"><h3>Что тренировать именно здесь</h3>${list(solarFocus.resource)}</section>
      <section class="info-block shadow"><h3>На что обратить внимание</h3>${list(solarFocus.shadow)}</section>
      <section class="info-block practice"><h3>Практика для дома</h3>${list(solarFocus.practice)}</section>
    </div>
  ` : "";
  return `
    <section class="hero-card">
      <p class="kicker">Полное учебное досье</p>
      <h2>${escapeHtml(dossier.name)}</h2>
      <p class="formula">Глубокий модуль для личного обучения по материалам курса, без публикации полного транскрипта.</p>
    </section>
    <nav class="dossier-tabs">
      ${dossier.tabs.map((tab) => `<button class="tab-btn ${tab.id === activeTab.id ? "active" : ""}" data-dossier-tab="${tab.id}">${escapeHtml(tab.name)}</button>`).join("")}
    </nav>
    <section class="info-block wide">
      <h3>${escapeHtml(activeTab.name)}</h3>
      <div class="dossier-text">${escapeHtml(activeTab.content || "Раздел пока пуст.")}</div>
    </section>
    ${solarAddOn}
    <div class="button-row">
      <button class="secondary" id="saveDossierNote">Записать мысль в дневник</button>
    </div>
  `;
}

function renderQuiz() {
  const card = byId(DATA.cards, state.cardId);
  const quizPrompts = card.study_prompts || card.self_check_questions || [];
  return `
    ${renderCardHero(card, "Самопроверка")}
    <section class="info-block practice">
      <h3>Ответь своими словами</h3>
      ${list(quizPrompts)}
      <div class="field"><label for="quizAnswer">Мой ответ</label><textarea id="quizAnswer" placeholder="Не пиши термины. Опиши карту как жизненную ситуацию: что происходит, где ресурс, где ловушка, что делать?"></textarea></div>
      <div class="button-row"><button class="secondary" id="saveQuiz">Сохранить ответ</button></div>
    </section>
    <div class="info-grid">
      <section class="info-block wide"><h3>Проверь себя по смыслу</h3><p class="prose">${escapeHtml(card.learning_text || "")}</p></section>
      <section class="info-block resource"><h3>Если карта в ресурсе</h3>${list(card.in_life || card.resource)}</section>
      <section class="info-block shadow"><h3>Если карта в тени</h3>${list(card.blind_spots || card.shadow)}</section>
      <section class="info-block practice"><h3>Что можно сделать</h3>${list(card.practice_steps)}</section>
    </div>
  `;
}

function renderCase() {
  const cases = storageGet("ta_cases", []);
  return `
    <section class="hero-card">
      <p class="kicker">Комплексный разбор</p>
      <h2>Ситуация + Таро + Астро</h2>
      <p class="formula">Заполни поля слева. Кабинет сохранит черновик в структуре, которую потом можно отдать ИИ-наставнику для глубокого синтеза.</p>
    </section>
    <section class="info-block observe"><h3>Шаблон вывода</h3>${list([
      "Вопрос и период",
      "Таро-слой: карта, ресурс, тень, совет",
      "Соляр-Таро: карта в доме, задача года",
      "Астро-слой: показатели и сроки",
      "Синтез: совпадения, расхождения, рекомендации"
    ])}</section>
    <section class="info-block"><h3>Сохраненные разборы</h3>${renderItems(cases)}</section>
  `;
}

function renderDiary() {
  const diary = storageGet("ta_diary", []);
  return `
    <section class="hero-card">
      <p class="kicker">Дневник</p>
      <h2>Наблюдения года</h2>
      <p class="formula">Записывай коротко: событие, чувство, карта, дом, вывод. Это станет личной базой для будущих разборов.</p>
    </section>
    <section class="info-block"><h3>Записи</h3>${renderItems(diary)}</section>
    <div class="button-row">
      <button class="secondary" id="exportDiary">Экспорт JSON</button>
      <button class="quiet" id="clearDiary">Очистить дневник</button>
    </div>
  `;
}

function renderItems(items) {
  if (!items.length) return "<p class='empty'>Пока нет записей</p>";
  return `<div class="journal-list">${items.slice().reverse().map((item) => `
    <article class="journal-item">
      <time>${escapeHtml(item.date)}</time>
      <strong>${escapeHtml(item.title || item.tags || "Запись")}</strong>
      <p>${escapeHtml(item.text || item.question || "")}</p>
    </article>
  `).join("")}</div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => { state.mode = button.dataset.mode; render(); });
  });
  document.querySelectorAll("[data-dossier-tab]").forEach((button) => {
    button.addEventListener("click", () => { state.dossierTab = button.dataset.dossierTab; render(); });
  });
  $("#cardSelect")?.addEventListener("change", (event) => { state.cardId = event.target.value; render(); });
  $("#houseSelect")?.addEventListener("change", (event) => { state.houseId = event.target.value; render(); });
  $("#resetView")?.addEventListener("click", () => { state.mode = "solar"; state.cardId = "tarot_major_15"; state.houseId = "solar_house_07"; render(); });
  $("#copyResult")?.addEventListener("click", copyCurrentResult);
  $("#saveDiary")?.addEventListener("click", saveDiary);
  $("#saveCase")?.addEventListener("click", saveCase);
  $("#saveQuiz")?.addEventListener("click", saveQuiz);
  $("#saveDossierNote")?.addEventListener("click", saveDossierNote);
  $("#exportDiary")?.addEventListener("click", exportDiary);
  $("#clearDiary")?.addEventListener("click", () => { if (confirm("Очистить дневник?")) { storageSet("ta_diary", []); render(); } });
}

function saveDossierNote() {
  const card = byId(DATA.cards, state.cardId);
  const dossier = findDossier(card);
  const tab = dossier?.tabs.find((item) => item.id === state.dossierTab);
  const diary = storageGet("ta_diary", []);
  diary.push({
    date: new Date().toLocaleString("ru-RU"),
    tags: `${card.name}, досье, ${tab?.name || ""}`,
    text: `Изучала раздел “${tab?.name || "досье"}” по карте ${card.name}. Записать личный вывод здесь.`,
  });
  storageSet("ta_diary", diary);
  state.mode = "diary";
  render();
}

function saveDiary() {
  const text = $("#diaryEvent")?.value.trim();
  if (!text) return;
  const tags = $("#diaryTags")?.value.trim();
  const diary = storageGet("ta_diary", []);
  diary.push({ date: new Date().toLocaleString("ru-RU"), tags, text });
  storageSet("ta_diary", diary);
  render();
}

function saveCase() {
  const question = $("#caseQuestion")?.value.trim();
  const tarot = $("#caseTarot")?.value.trim();
  const astro = $("#caseAstro")?.value.trim();
  if (!question && !tarot && !astro) return;
  const cases = storageGet("ta_cases", []);
  cases.push({
    date: new Date().toLocaleString("ru-RU"),
    title: question || "Разбор",
    question,
    text: `Таро: ${tarot || "не указано"}\nАстро: ${astro || "не указано"}`,
  });
  storageSet("ta_cases", cases);
  render();
}

function saveQuiz() {
  const text = $("#quizAnswer")?.value.trim();
  if (!text) return;
  const card = byId(DATA.cards, state.cardId);
  const progress = storageGet("ta_progress", []);
  progress.push({ date: new Date().toLocaleString("ru-RU"), title: `Проверка: ${card.name}`, text });
  storageSet("ta_progress", progress);
  alert("Ответ сохранен в прогрессе.");
}

async function copyCurrentResult() {
  const text = document.querySelector(".result")?.innerText || "";
  await navigator.clipboard.writeText(text);
  alert("Итог скопирован.");
}

async function exportDiary() {
  const payload = {
    diary: storageGet("ta_diary", []),
    cases: storageGet("ta_cases", []),
    progress: storageGet("ta_progress", []),
  };
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  alert("Экспорт скопирован в буфер.");
}

render();
