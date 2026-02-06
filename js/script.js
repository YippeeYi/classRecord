/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");

/* ===============================
   加载并渲染记录
   =============================== */
const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => loadAllRecords())
  .then(records => {
    sortRecords(records);
    renderRecordList(records, container);
  });
