/************************************************************
 * script.js
 * 主页面逻辑
 ************************************************************/

const container = document.getElementById("record-list");
let records = [];

/* ===============================
   加载记录
   =============================== */
fetch("data/record/records_index.json")
  .then(res => res.json())
  .then(files =>
    Promise.all(
      files.map((f, index) =>
        fetch(`data/record/${f}`)
          .then(r => r.json())
          .then(record => {
            // 自动生成 id（基于 index 顺序）
            record.id = `R${String(index + 1).padStart(3, "0")}`;
            return record;
          })
      )
    )
  )
  .then(list => {
    records = list;
    sortRecords(records);
    renderRecordList(records, container);
  })
  .catch(err => {
    console.error(err);
    container.innerHTML = "<p>记录加载失败</p>";
  });
