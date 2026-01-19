/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");

/* ===============================
   加载并渲染记录
   =============================== */
loadRecordsWithCache()
  .then(list => {
    records = list;
    renderRecordList(records, container);
  });
