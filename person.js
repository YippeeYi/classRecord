/************************************************************
 * person.js
 * 人物个人页面
 ************************************************************/

const params = new URLSearchParams(location.search);
const personId = params.get("id");

const recordContainer = document.getElementById("record-list");
const btnParticipated = document.getElementById("btn-participated");
const btnAuthored = document.getElementById("btn-authored");

let allRecords = [];
let participatedRecords = [];
let authoredRecords = [];

/* ===============================
   加载人物信息
   =============================== */
fetch(`data/people/${personId}.json`)
    .then(res => res.json())
    .then(person => {
        document.getElementById("person-id").textContent = person.id;
        document.getElementById("person-alias").innerHTML =
            `<strong>${parseContent(person.alias || "—")}</strong>`;
        document.getElementById("person-bio").innerHTML =
            `<strong>${formatContent(person.bio || "—")}</strong>`;
    });

/* ===============================
   加载记录
   =============================== */
loadRecords((record, index) => {
    // 自动生成 id（基于 records_index.json 顺序）
    record.id = `R${String(index + 1).padStart(3, "0")}`;
    return record;
})
    .then(list => {
        allRecords = list;

        participatedRecords = allRecords.filter(r =>
            r.content && new RegExp(`\\[\\[${personId}\\|.+?\\]\\]`).test(r.content)
        );

        authoredRecords = allRecords.filter(r => r.author === personId);

        renderRecordList(participatedRecords, recordContainer);
    });

/* ===============================
   按钮切换
   =============================== */
btnParticipated.onclick = () => {
    renderRecordList(participatedRecords, recordContainer);
};

btnAuthored.onclick = () => {
    renderRecordList(authoredRecords, recordContainer);
};
