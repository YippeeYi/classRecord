/* ===============================
   获取 URL 中 id
   =============================== */
const urlParams = new URLSearchParams(window.location.search);
const personId = urlParams.get("id");

if (!personId) {
    alert("未指定人物 id！");
    throw new Error("未指定人物 id");
}

/* ===============================
   加载人物 JSON
   =============================== */
let personData = null;
fetch(`data/people/${personId}.json`)
    .then(res => res.json())
    .then(data => {
        personData = data;
        document.getElementById("person-alias").textContent = data.alias || "无别名";
        document.getElementById("person-id").textContent = data.id;
        document.getElementById("person-bio").textContent = data.bio || "无简介";
        loadRecords();
    })
    .catch(err => {
        console.error("人物数据加载失败", err);
        document.getElementById("events-container").innerHTML = "<p>人物数据加载失败</p>";
    });

/* ===============================
   解析 content 中人物标记 [[id|label]]
   =============================== */
function parseContent(text) {
    return text.replace(
        /\[\[([^\|\]]+)\|([^\]]+)\]\]/g,
        (match, pid, label) => {
            return `<span class="person-tag" data-id="${pid}">${label}</span>`;
        }
    );
}

/* ===============================
   内容格式化（换行 / 分段）
   =============================== */
function formatContent(text) {
    return text
        .split("\n\n")
        .map(p =>
            `<p>${parseContent(p).replace(/\n/g, "<br>")}</p>`
        )
        .join("");
}

/* ===============================
   加载所有记录
   =============================== */
function loadRecords() {
    fetch("data/record/records_index.json")
        .then(res => res.json())
        .then(fileList => {
            const requests = fileList.map(name =>
                fetch(`data/record/${name}`).then(res => res.json())
            );
            return Promise.all(requests);
        })
        .then(records => {
            displayRecords(records);
        })
        .catch(err => {
            console.error(err);
            document.getElementById("events-container").innerHTML = "<p>记录加载失败</p>";
        });
}

/* ===============================
   渲染记录
   =============================== */
function displayRecords(records) {
    const container = document.getElementById("events-container");
    container.innerHTML = "";

    // 排序
    records.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.id - b.id;
    });

    // 分两类
    const authored = records.filter(r => r.author === personId);
    const participated = records.filter(r => r.content.includes(`[[${personId}|`));

    // 保存全局，供按钮切换
    window.authoredRecords = authored;
    window.participatedRecords = participated;

    // 默认显示 authored
    renderRecordList(authored);
}

/* ===============================
   渲染列表函数
   =============================== */
function renderRecordList(list) {
    const container = document.getElementById("events-container");
    container.innerHTML = "";

    list.forEach(record => {
        let timeText = record.time ? record.time : (record.order !== undefined ? `（当日第 ${record.order} 条）` : "（时间不详）");

        const recordDiv = document.createElement("div");
        recordDiv.className = "record";

        recordDiv.innerHTML = `
        <div class="meta">
            <span>📅 ${record.date} ${timeText} | ✍ ${parseContent(`[[${record.author}|${record.author}]]`)}</span>
        </div>
        <div class="content">
            ${formatContent(record.content)}
        </div>
    `;

        container.appendChild(recordDiv);
    });
}

/* ===============================
   按钮切换事件
   =============================== */
document.getElementById("btn-author-events").addEventListener("click", () => {
    renderRecordList(window.authoredRecords);
    document.getElementById("btn-author-events").classList.add("active");
    document.getElementById("btn-participate-events").classList.remove("active");
});

document.getElementById("btn-participate-events").addEventListener("click", () => {
    renderRecordList(window.participatedRecords);
    document.getElementById("btn-author-events").classList.remove("active");
    document.getElementById("btn-participate-events").classList.add("active");
});

/* ===============================
   人物点击跳转个人页面
   =============================== */
document.addEventListener("click", e => {
    const tag = e.target.closest(".person-tag");
    if (!tag) return;

    const pid = tag.dataset.id;
    location.href = `person.html?id=${pid}`;
});
