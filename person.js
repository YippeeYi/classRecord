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
        document.getElementById("person-alias").textContent = parseContent(data.alias) || "无别名";
        document.getElementById("person-id").textContent = data.id;
        document.getElementById("person-bio").textContent = formatContent(data.bio) || "无简介";
        loadRecords();
    })
    .catch(err => {
        console.error("人物数据加载失败", err);
        document.getElementById("events-container").innerHTML = "<p>人物数据加载失败</p>";
    });

/* ===============================
   解析人物标记 [[id|label]]
   =============================== */
function parseContent(text) {
    return text
        // 黑幕处理
        .replace(
            /\[\[REDACT\|(.+?)\]\]/g,
            (_, content) => {
                return `<span class="redacted">${content}</span>`;
            }
        )
        // 人物标记处理
        .replace(
            /\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g,
            (_, personId, displayName) => {
                return `<span class="person-tag" data-id="${personId}">${displayName}</span>`;
            }
        )
        .replace(/(\^.+?\^)/g, (match) => {
            return `<sup>${match.replace(/\^/g, '')}</sup>`;  // 处理上标
        })
        .replace(/(_.+?_)$/g, (match) => {
            return `<sub>${match.replace(/_/g, '')}</sub>`;  // 处理下标
        });
}

/* ===============================
   内容格式化（换行 / 分段）
   =============================== */
function formatContent(text) {
    return text
        .split("\n\n")
        .map(p =>
            `${parseContent(p).replace(/\n/g, "<br>")}`
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
    const participated = records.filter(r => r.content.includes(`[[${personId}|`));
    const authored = records.filter(r => r.author === personId);

    // 保存全局，供按钮切换
    window.participatedRecords = participated;
    window.authoredRecords = authored;

    // 默认显示 participated
    renderRecordList(participated);
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
            <span class="icon-group">
                ${record.image ? `
                    <span class="image-toggle" title="查看原始记录">📷</span>
                ` : ""}
                ${record.attachments && record.attachments.length > 0 ? `
                    <span class="attach-toggle" title="查看附件">📎</span>
                ` : ""}
            </span>
        </div>
        <div class="content">
            ${formatContent(record.content)}
        </div>

        ${record.image ? `
            <div class="image-wrapper" style="display:none">
                <img src="${record.image}" alt="纸笔原始记录">
            </div>
        ` : ""}

        ${record.attachments && record.attachments.length > 0
                ? `
            <div class="attachments-wrapper" style="display:none">
                <strong>附件：</strong>
                <ul>
                    ${record.attachments.map(att => `
                        <li>
                            <a href="${att.file}" target="_blank">${att.name}</a>
                        </li>
                    `).join("")}
                </ul>
            </div>
            `
                : ""}
    `;

        /* ===============================
           图片切换
           =============================== */
        const imgBtn = recordDiv.querySelector(".image-toggle");
        const imgWrap = recordDiv.querySelector(".image-wrapper");

        if (imgBtn && imgWrap) {
            imgBtn.addEventListener("click", () => {
                const open = imgWrap.style.display === "block";
                imgWrap.style.display = open ? "none" : "block";
                imgBtn.textContent = open ? "📷" : "❌";
            });
        }

        /* ===============================
           附件切换
           =============================== */
        const attBtn = recordDiv.querySelector(".attach-toggle");
        const attWrap = recordDiv.querySelector(".attachments-wrapper");

        if (attBtn && attWrap) {
            attBtn.addEventListener("click", () => {
                const open = attWrap.style.display === "block";
                attWrap.style.display = open ? "none" : "block";
                attBtn.textContent = open ? "📎" : "❌";
            });
        }

        container.appendChild(recordDiv);
    });
}

/* ===============================
   按钮切换事件
   =============================== */
document.getElementById("btn-participate-events").addEventListener("click", () => {
    renderRecordList(window.participatedRecords);
    document.getElementById("btn-author-events").classList.remove("active");
    document.getElementById("btn-participate-events").classList.add("active");
});

document.getElementById("btn-author-events").addEventListener("click", () => {
    renderRecordList(window.authoredRecords);
    document.getElementById("btn-author-events").classList.add("active");
    document.getElementById("btn-participate-events").classList.remove("active");
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
