/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");
const filterContainer = document.getElementById("record-filter");
let allRecords = [];
let recordPageConfig = [];
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

function normalizeFileName(value) {
  return String(value || "").trim().replace(/^data\/record\//i, "");
}

function normalizeRecordPage(page, index) {
  if (typeof page === "string") {
    return { page, start: "", end: "" };
  }
  return {
    page: String(page?.page || page?.id || String(index + 1).padStart(2, "0")).trim(),
    start: normalizeFileName(page?.start || page?.startFile || page?.from),
    end: normalizeFileName(page?.end || page?.endFile || page?.to)
  };
}

async function loadRecordPageConfig() {
  try {
    const res = await fetch("data/record/record_pages.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pages = await res.json();
    recordPageConfig = Array.isArray(pages) ? pages.map(normalizeRecordPage).filter((page) => page.page) : [];
  } catch (error) {
    console.warn("无法加载书面记录页配置：", error);
    recordPageConfig = [];
  }
}

function getRecordIndexMap() {
  const map = new Map();
  allRecords.forEach((record) => {
    const fileName = normalizeFileName(record.fileName);
    if (fileName) map.set(fileName, record.recordIndex);
  });
  return map;
}

function getPageRecords(page, filteredRecords, recordIndexMap) {
  const startIndex = recordIndexMap.get(normalizeFileName(page.start));
  const endIndex = recordIndexMap.get(normalizeFileName(page.end));
  if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
    return [];
  }

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return filteredRecords.filter((record) => record.recordIndex >= from && record.recordIndex <= to);
}

function getWrittenPages(records) {
  const recordIndexMap = getRecordIndexMap();
  return recordPageConfig
    .map((page) => ({ ...page, records: getPageRecords(page, records, recordIndexMap) }))
    .filter((page) => page.records.length || (!page.start && !page.end));
}

function renderWrittenView(records) {
  const pages = getWrittenPages(records);
  if (!pages.length) {
    container.innerHTML = '<div class="record-written-empty">当前筛选条件下没有可展示的记录。</div>';
    return;
  }
  currentPageIndex = Math.min(currentPageIndex, pages.length - 1);
  const page = pages[currentPageIndex];
  const pageRecords = page.records || [];
  sortRecords(pageRecords);
  const imageBase = `images/record-pages/${page.page}`;
  container.innerHTML = `
    <section class="record-written-view">
      <div class="record-written-toolbar">
        <button class="btn-action record-page-prev" type="button" ${currentPageIndex >= pages.length - 1 ? 'disabled' : ''}>上一页</button>
        <span class="record-written-page">${page.page} · 第 ${currentPageIndex + 1} / ${pages.length} 页</span>
        <button class="btn-action record-page-next" type="button" ${currentPageIndex <= 0 ? 'disabled' : ''}>下一页</button>
      </div>
      <div class="record-written-layout">
        <figure class="record-written-image">
          <img src="${imageBase}.png" alt="${page.page} 原始书面记录" loading="lazy" decoding="async" onerror="if (!this.dataset.fallback) { this.dataset.fallback='1'; this.src='${imageBase}.jpg'; } else { this.closest('figure').classList.add('is-missing'); }">
          <figcaption>原始书面记录：images/record-pages/${page.page}.png 或 .jpg</figcaption>
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
  .then(async records => {
    await loadRecordPageConfig();
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
