const storageKey = `astro-feedback-${window.clientData.id}-v1`;
const feedbackTelegram = "OlgaFleur";

function getStore() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(storageKey, JSON.stringify(store));
}

function routeSection() {
  const id = window.location.hash.replace(/^#\/?/, "");
  return window.clientData.sections.find((section) => section.id === id) || window.clientData.sections[0];
}

function render() {
  const client = window.clientData;
  const section = routeSection();
  document.title = `${client.name} — личный кабинет`;
  document.getElementById("app").innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">A</div>
          <div class="brand-text">
            <div class="brand-title">${client.name}</div>
            <div class="brand-subtitle">${client.type}</div>
          </div>
        </div>
        <nav class="nav">
          ${client.sections.map((item) => `<button data-section="${item.id}" class="${item.id === section.id ? "active" : ""}">${item.title}</button>`).join("")}
        </nav>
      </header>
      <main class="main">
        <section class="page-head">
          <div>
            <div class="eyebrow">${client.type}</div>
            <h1>${client.name}</h1>
            <p class="lead">${client.intro}</p>
          </div>
        </section>
        <section class="section-layout">
          <article class="content-card">
            <div class="eyebrow">${section.summary}</div>
            <h2>${section.title}</h2>
            ${section.body}
            <div class="next-card">
              <h3>Следующий шаг</h3>
              <p>${section.next || client.defaultNext}</p>
            </div>
          </article>
          ${renderFeedback(client, section)}
        </section>
      </main>
      <footer class="footer">Закрытый тестовый кабинет. Материалы предназначены только для адресата этой ссылки.</footer>
    </div>
  `;
  bind();
}

function renderFeedback(client, section) {
  const saved = getStore()[section.id] || {};
  const rating = saved.rating ?? 70;
  return `
    <aside class="feedback-card" data-feedback="${section.id}">
      <h3>Обратная связь</h3>
      <p>Оцените, насколько раздел откликается. Кнопка ниже откроет личный чат с Ольгой в Telegram и вставит готовый текст обратной связи.</p>
      <div class="rating-row">
        <label>Насколько откликается</label>
        <div class="rating-value" data-rating-value>${rating}%</div>
      </div>
      <input type="range" min="0" max="100" value="${rating}" data-field="rating" />
      <label>Что попало точно</label>
      <textarea data-field="hit">${saved.hit || ""}</textarea>
      <label>Что не откликнулось</label>
      <textarea data-field="miss">${saved.miss || ""}</textarea>
      <label>Что хочется обсудить</label>
      <textarea data-field="question">${saved.question || ""}</textarea>
      <div class="section-actions">
        <button class="primary-button" data-send>Отправить ОС в Telegram</button>
      </div>
      <div class="saved" data-message></div>
    </aside>
  `;
}

function bind() {
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.hash = button.dataset.section;
    });
  });

  const rating = document.querySelector('[data-field="rating"]');
  const ratingValue = document.querySelector("[data-rating-value]");
  rating.addEventListener("input", () => {
    ratingValue.textContent = `${rating.value}%`;
  });

  document.querySelector("[data-send]").addEventListener("click", () => {
    const card = document.querySelector("[data-feedback]");
    const data = collectFeedback(card);
    const store = getStore();
    store[card.dataset.feedback] = data;
    saveStore(store);
    const text = formatFeedback(window.clientData, routeSection(), data);
    openTelegram(text);
    flash("Открываю Telegram с готовой ОС");
  });

}

function collectFeedback(card) {
  const data = {};
  card.querySelectorAll("[data-field]").forEach((field) => {
    data[field.dataset.field] = field.value;
  });
  data.updatedAt = new Date().toISOString();
  return data;
}

function formatFeedback(client, section, data) {
  return [
    `Клиент: ${client.name}`,
    `Раздел: ${section.title}`,
    `Оценка: ${data.rating}%`,
    "",
    `Что попало: ${data.hit || "-"}`,
    "",
    `Что не откликнулось: ${data.miss || "-"}`,
    "",
    `Что хочется обсудить: ${data.question || "-"}`,
  ].join("\n");
}

function openTelegram(body) {
  const url = `https://t.me/${feedbackTelegram}?text=${encodeURIComponent(body)}`;
  window.location.href = url;
}

function flash(message) {
  const node = document.querySelector("[data-message]");
  node.textContent = message;
  setTimeout(() => {
    node.textContent = "";
  }, 1800);
}

window.addEventListener("hashchange", render);
render();
