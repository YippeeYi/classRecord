/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");
const filterContainer = document.getElementById("record-filter");
let allRecords = [];

/* ===============================
   加载并渲染记录
   =============================== */
const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => loadAllRecords())
  .then(records => {
    allRecords = records;
    sortRecords(allRecords);
    renderRecordList(allRecords, container);

    renderRecordFilter({
      container: filterContainer,
      onFilterChange: criteria => {
        const filtered = filterRecordsByDate(allRecords, criteria);
        sortRecords(filtered);
        renderRecordList(filtered, container);
      }
    });
  });
