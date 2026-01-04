/************************************************************
 * person.js
 * 功能：
 * - 加载人物信息（分文件）
 * - 加载所有记录
 * - 区分「记录的事件 / 参与的事件」
 * - 通过按钮切换显示
 ************************************************************/

/* ===============================
   读取 URL 参数
   =============================== */
const params = new URLSearchParams(location.search);
const personId = params.get("id");

/* DOM */
const nameEl = document.getElementById("person-name");
const idEl = document.getElementById("person-id");
const aliasEl = document.getElementById("person-alias");
const introEl = document.getElementById("person-intro");

const btnRecorded = document.getElementById("btn-recorded");
const btnParticipated = document.getElementById("btn-participated");
const listEl = document.getElementById("event-list");

/* 数据缓存 */
let allRecords = [];
let recordedEvents = [];
let participatedEvents = [];

/* ===============================
   工具：解析人物标记为纯文本
   =============================== */
function stripPersonTags(text) {
    return text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
}

/* ===============================
   加载人物信息
   =============================== */
function loadPerson() {
    return fetch("data/people/people_index.json")
        .then(res => res.json())
        .then(files =>
            Promise.all(
                files.map(f =>
                    fetch(`data/people/${f}`).then(r => r.json())
                )
            )
        )
        .then(people => {
            const person = people.find(p => p.id === personId);
            if (!person) throw new Error("人物不存在");

            nameEl.textContent = person.name;
            idEl.textContent = person.id;
            aliasEl.textContent = person.alias || "—";
            introEl.textContent = person.intro || "暂无介绍";
        });
}

/* ===============================
   加载所有记录
   =============================== */
function loadRecords() {
    return fetch("data/record/records_index.json")
        .then(res => res.json())
        .then(files =>
            Promise.all(
                files.map(f =>
                    fetch(`data/record/${f}`).then(r => r.json())
                )
            )
        )
        .then(records => {
            allRecords = records;

            recordedEvents = records.filter(r => r.author === personId);

            participatedEvents = records.filter(r =>
                r.content.includes(`[[${personId}|`)
            );
        });
}

/* ===============================
   渲染事件列表
   =============================== */
function renderEvents(list) {
    listEl.innerHTML = "";

    if (list.length === 0) {
        listEl.innerHTML = "<p>暂无相关记录。</p>";
        return;
    }

    list.forEach(r => {
        const div = document.createElement("div");
        div.className = "record";

        let timeText = r.time
            ? r.time
            : r.order !== undefined
                ? `（当日第 ${r.order} 条）`
                : "（时间不详）";

        div.innerHTML = `
      <div class="meta">
        📅 ${r.date} ${timeText}
      </div>
      <div class="content">
        ${stripPersonTags(r.content)}
      </div>
    `;

        listEl.appendChild(div);
    });
}

/* ===============================
   按钮切换逻辑
   =============================== */
btnRecorded.onclick = () => {
    btnRecorded.classList.add("active");
    btnParticipated.classList.remove("active");
    renderEvents(recordedEvents);
};

btnParticipated.onclick = () => {
    btnParticipated.classList.add("active");
    btnRecorded.classList.remove("active");
    renderEvents(participatedEvents);
};

/* ===============================
   初始化
   =============================== */
Promise.all([loadPerson(), loadRecords()])
    .then(() => {
        renderEvents(recordedEvents); // 默认显示“记录的事件”
    })
    .catch(err => {
        document.body.innerHTML = "<p>人物信息加载失败。</p>";
        console.error(err);
    });
