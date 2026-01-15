/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");

/* ===============================
   加载并渲染记录
   =============================== */
(async function () {
  try {
    const records = await loadAllRecords();

    sortRecords(records);
    renderRecordList(records, container);
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>记录加载失败</p>";
  }
})();
