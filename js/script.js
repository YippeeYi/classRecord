/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");
const filterContainer = document.getElementById("record-filter");
let allRecords = [];
let currentCriteria = { year: "", month: "", day: "", important: false, excludeDaily: false };
let currentView = "list";
let currentPageIndex = 0;

function getRecordSerial(record) {
  return (record.fileName || record.id || "").replace(/.json$/i, "").slice(-2);
}

function isDailyRecord(record) {
  return getRecordSerial(record) === "00";
}

function getFilteredRecords() {
  const filtered = filterRecordsByDate(allRecords, currentCriteria);
  sortRecords(filtered);
  return filtered;
}

function getWrittenPages(records) {
  return [...new Set(records.map((record) => record.date).filter(Boolean))].sort().reverse();
}

function renderWrittenView(records) {
  const pages = getWrittenPages(records);
  if (!pages.length) {
    container.innerHTML = '<div class="record-written-empty">当前筛选条件下没有可展示的记录。</div>';
    return;
  }
  currentPageIndex = Math.min(currentPageIndex, pages.length - 1);
  const page = pages[currentPageIndex];
  const pageRecords = records.filter((record) => record.date === page);
  sortRecords(pageRecords);
  const imageBase = `images/record-pages/${page}`;
  container.innerHTML = `
    <section class="record-written-view">
      <div class="record-written-toolbar">
        <button class="btn-action record-page-prev" type="button" ${currentPageIndex >= pages.length - 1 ? 'disabled' : ''}>上一页</button>
        <span class="record-written-page">${page} · 第 ${currentPageIndex + 1} / ${pages.length} 页</span>
        <button class="btn-action record-page-next" type="button" ${currentPageIndex <= 0 ? 'disabled' : ''}>下一页</button>
      </div>
      <div class="record-written-layout">
        <figure class="record-written-image">
          <picture>
            <source srcset="${imageBase}.png" type="image/png">
            <img src="${imageBase}.jpg" alt="${page} 原始书面记录" onerror="this.closest('figure').classList.add('is-missing')">
          </picture>
          <figcaption>原始书面记录：images/record-pages/${page}.jpg 或 .png</figcaption>
        </figure>
        <div class="record-written-records"></div>
      </div>
    </section>
  `;
  renderRecordList(pageRecords, container.querySelector(".record-written-records"));
  container.querySelector(".record-page-prev")?.addEventListener("click", () => {
    currentPageIndex = Math.min(currentPageIndex + 1, pages.length - 1);
    renderCurrentView();
  });
  container.querySelector(".record-page-next")?.addEventListener("click", () => {
    currentPageIndex = Math.max(currentPageIndex - 1, 0);
    renderCurrentView();
  });
}

function renderCurrentView() {
  const records = getFilteredRecords();
  if (currentView === "written") {
    renderWrittenView(records);
  } else {
    renderRecordList(records, container);
  }
}

function renderViewControls() {
  const controls = document.createElement("div");
  controls.className = "record-view-switch switch-group";
  controls.innerHTML = `
    <button class="switch-btn active" type="button" data-view="list">按条显示</button>
    <button class="switch-btn" type="button" data-view="written">书面记录</button>
  `;
  filterContainer?.before(controls);
  controls.addEventListener("click", (event) => {
    const button = event.target.closest(".switch-btn");
    if (!button) return;
    currentView = button.dataset.view || "list";
    currentPageIndex = 0;
    controls.querySelectorAll(".switch-btn").forEach((item) => item.classList.toggle("active", item === button));
    renderCurrentView();
  });
}

/* ===============================
   加载并渲染记录
   =============================== */
const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => loadAllRecords())
  .then(records => {
    allRecords = records;
    sortRecords(allRecords);
    renderViewControls();
    renderCurrentView();

    renderRecordFilter({
      container: filterContainer,
      getRecords: () => allRecords,
      onFilterChange: criteria => {
        currentCriteria = criteria;
        currentPageIndex = 0;
        renderCurrentView();
      }
    });
  });
