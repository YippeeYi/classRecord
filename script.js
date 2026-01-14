/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");
let records = [];

/* ===============================
   加载记录
   =============================== */
loadRecords((record, index) => {
  // 自动生成 id（基于 records_index.json 顺序）
  record.id = `R${String(index + 1).padStart(3, "0")}`;
  return record;
})
  .then(list => {
    records = list;
    renderRecordList(records, container);
  })
  .catch(err => {
    console.error(err);
    container.innerHTML = "<p>记录加载失败</p>";
  });
