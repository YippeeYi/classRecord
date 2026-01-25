/************************************************************
 * recordRenderer.js
 * 功能：
 * - 统一解析记录文本
 * - 统一排序
 * - 统一渲染记录列表
 * - 主页面 & 个人页面共用
 ************************************************************/

/* ===============================
   内容解析
   =============================== */
function parseContent(text) {
    if (!text) return "";

    return text
        // 术语标记 {{termId|显示文本}}
        .replace(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g,
            (_, id, label) =>
                `<span class="term-tag" data-id="${id}">${label}</span>`
        )
        // 人物标记 [[id|显示名]]
        .replace(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g,
            (_, id, label) =>
                `<span class="person-tag" data-id="${id}">${label}</span>`
        )
        // 黑幕 ((显示内容))
        .replace(/\(\((.+?)\)\)/g, (_, c) =>
            `<span class="redacted">${c}</span>`
        )
        // 上标 ^内容^
        .replace(/\^(.+?)\^/g, (_, t) => `<sup>${t}</sup>`)
        // 下标 _内容_
        .replace(/_(.+?)_/g, (_, t) => `<sub>${t}</sub>`);
}

/* ===============================
   段落格式化
   =============================== */
function formatContent(text) {
    return text
        .split("\n\n")
        .map(p => parseContent(p).replace(/\n/g, "<br>"))
        .join("");
}

/* ===============================
   排序规则
   =============================== */
function sortRecords(records) {
    records.sort((a, b) => {
        return b.id.localeCompare(a.id);
    });
}

/* ===============================
   渲染记录列表
   =============================== */
function renderRecordList(records, container) {
    // 检查是否已初始化
    records.forEach(record => {
        if (!record.id) {
            console.warn(
                "发现未初始化（未带 id）的记录：",
                record
            );
        }
    });

    container.innerHTML = "";

    records.forEach(record => {
        let timeText = "";
        if (record.time) timeText = "📌 " + record.time + " |";

        const importance = record.importance || "normal";

        const div = document.createElement("div");

        div.className = `record importance-${importance}`;

        div.innerHTML = `
            <div class="meta">
                <span>
                    #${record.id} |
                    📅 ${record.date} |
                    ${timeText}
                    ✍ ${parseContent(`[[${record.author}|${record.author}]]`)}
                </span>
                <span class="icon-group">
                    ${record.image ? `<span class="image-toggle">📷</span>` : ""}
                    ${record.attachments?.length ? `<span class="attach-toggle">📎</span>` : ""}
                </span>
            </div>

            <div class="content">
                ${formatContent(record.content)}
            </div>

            ${record.image ? `
                <div class="image-wrapper" style="display:none">
                    <img src="${record.image}">
                </div>
            ` : ""}

            ${record.attachments?.length ? `
                <div class="attachments-wrapper" style="display:none">
                    <ul>
                        ${record.attachments.map(a =>
            `<li><a href="${a.file}" target="_blank">${a.name}</a></li>`
        ).join("")}
                    </ul>
                </div>
            ` : ""}
        `;

        bindToggle(div);
        container.appendChild(div);
    });
}

/* ===============================
   图片 / 附件切换
   =============================== */
function bindToggle(recordDiv) {
    const imgBtn = recordDiv.querySelector(".image-toggle");
    const imgWrap = recordDiv.querySelector(".image-wrapper");

    if (imgBtn && imgWrap) {
        imgBtn.onclick = () => {
            const open = imgWrap.style.display === "block";
            imgWrap.style.display = open ? "none" : "block";
            imgBtn.textContent = open ? "📷" : "❌";
        };
    }

    const attBtn = recordDiv.querySelector(".attach-toggle");
    const attWrap = recordDiv.querySelector(".attachments-wrapper");

    if (attBtn && attWrap) {
        attBtn.onclick = () => {
            const open = attWrap.style.display === "block";
            attWrap.style.display = open ? "none" : "block";
            attBtn.textContent = open ? "📎" : "❌";
        };
    }
}

/* ===============================
   术语 Tooltip
   =============================== */
let glossaryCache = null;
let activeTooltip = null;
let activeTermId = null;
let tooltipTimer = null;
let lastMouseX = 0;
let lastMouseY = 0;

const TOOLTIP_DELAY = 200;

// 加载 glossary
async function ensureGlossary() {
    if (!glossaryCache) {
        const list = await loadAllGlossary();
        glossaryCache = {};
        list.forEach(t => glossaryCache[t.id] = t);
    }
}

/* ---------- 记录鼠标位置 ---------- */
document.addEventListener("mousemove", e => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

/* ---------- mouseover：延迟显示 tooltip ---------- */
document.addEventListener("mouseover", e => {
    const tag = e.target.closest(".term-tag");
    if (!tag) return;

    const termId = tag.dataset.id;

    if (tooltipTimer) clearTimeout(tooltipTimer);

    tooltipTimer = setTimeout(async () => {
        await ensureGlossary();

        const term = glossaryCache[termId];
        if (!term) return;

        // 已存在同一个 tooltip 不重复创建
        if (activeTooltip && activeTermId === termId) return;

        removeTooltip(true);

        activeTermId = termId;
        activeTooltip = document.createElement("div");
        activeTooltip.className = "term-tooltip hidden";
        activeTooltip.innerHTML = `
            <div class="term-tooltip-content">
                ${formatContent(term.definition)}
            </div>
            <div class="term-tooltip-hint">
                点击查看完整术语页面
            </div>
        `;

        document.body.appendChild(activeTooltip);

        // 计算位置（基于鼠标）
        const tooltipRect = activeTooltip.getBoundingClientRect();
        const padding = 12;

        let left = lastMouseX + 14;
        let top = lastMouseY + 14;

        // 屏幕边缘避让
        if (left + tooltipRect.width > window.innerWidth) {
            left = lastMouseX - tooltipRect.width - padding;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = lastMouseY - tooltipRect.height - padding;
        }

        activeTooltip.style.position = "absolute";
        activeTooltip.style.left = left + window.scrollX + "px";
        activeTooltip.style.top = top + window.scrollY + "px";

        // 渐入
        requestAnimationFrame(() => {
            activeTooltip.classList.remove("hidden");
            activeTooltip.classList.add("show");
        });
    }, TOOLTIP_DELAY);
});

/* ---------- mouseout：只在真正离开时才清除 ---------- */
document.addEventListener("mouseout", e => {
    // 取消尚未触发的延迟显示
    if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
    }

    if (!activeTooltip) return;

    const to = e.relatedTarget;

    // 只要进入 term-tag 或 tooltip，都不清除
    if (
        to &&
        (to.closest(".term-tag") || to.closest(".term-tooltip"))
    ) {
        return;
    }

    removeTooltip();
});

/* ---------- 移除 tooltip ---------- */
function removeTooltip(immediate = false) {
    if (!activeTooltip) return;

    activeTooltip.classList.remove("show");

    const el = activeTooltip;
    activeTooltip = null;
    activeTermId = null;

    if (immediate) {
        el.remove();
    } else {
        setTimeout(() => el.remove(), 150);
    }
}

/* ---------- 点击 tooltip：跳转 ---------- */
document.addEventListener("click", e => {
    const tooltip = e.target.closest(".term-tooltip");
    if (!tooltip || !activeTermId) return;

    location.href = `term.html?id=${activeTermId}`;
});

/* ===============================
   人物点击跳转
   =============================== */
document.addEventListener("click", e => {
    const tag = e.target.closest(".person-tag");
    if (tag) {
        location.href = `person.html?id=${tag.dataset.id}`;
    }
});
