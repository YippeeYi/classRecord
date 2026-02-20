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
                `<span class="person-tag" data-id="${id}" title="${id}">${label}</span>`
        )
        // 黑幕 ((显示内容))
        .replace(/\(\((.+?)\)\)/g,
            (_, c) =>
                `<span class="redacted"><span class="redacted-mask""></span><span class="redacted-content">${c}</span></span>`
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
   筛选控件（年/月/日）
   =============================== */
function filterRecordsByDate(records, { year, month, day }) {
    const hasYear = Boolean(year);
    const hasMonth = Boolean(month);
    const hasDay = Boolean(day);

    if (!hasYear && !hasMonth && !hasDay) {
        return records.slice();
    }

    return records.filter(record => {
        if (!record.date) return false;
        const [rYear, rMonth, rDay] = record.date.split("-");
        if (hasYear && rYear !== year) return false;
        if (hasMonth && rMonth !== month) return false;
        if (hasDay && rDay !== day) return false;
        return true;
    });
}

function parseDateParts(records) {
    return records
        .map(record => record.date)
        .filter(Boolean)
        .map(date => {
            const [year, month, day] = date.split("-");
            return { year, month, day };
        });
}

function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function buildOptions(records, criteria) {
    const dates = parseDateParts(records);

    const yearOptions = uniqueSorted(
        dates
            .filter(date => (!criteria.month || date.month === criteria.month)
                && (!criteria.day || date.day === criteria.day))
            .map(date => date.year)
    );

    const monthOptions = uniqueSorted(
        dates
            .filter(date => (!criteria.year || date.year === criteria.year)
                && (!criteria.day || date.day === criteria.day))
            .map(date => date.month)
    );

    const dayOptions = uniqueSorted(
        dates
            .filter(date => (!criteria.year || date.year === criteria.year)
                && (!criteria.month || date.month === criteria.month))
            .map(date => date.day)
    );

    return { yearOptions, monthOptions, dayOptions };
}

function renderRecordFilter({
    container,
    onFilterChange,
    getRecords,
    initial = {}
}) {
    if (!container) return;

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "record-filter";

    wrapper.innerHTML = `
        <div class="filter-field">
            <label for="filter-year">年</label>
            <button type="button" class="btn-select filter-dropdown-trigger" data-target="filter-year-options">
                选择年
                <span class="dropdown-arrow" aria-hidden="true">▾</span>
            </button>
            <div id="filter-year-options" class="filter-options" role="group" aria-label="按年筛选"></div>
        </div>
        <div class="filter-field">
            <label for="filter-month">月</label>
            <button type="button" class="btn-select filter-dropdown-trigger" data-target="filter-month-options">
                选择月
                <span class="dropdown-arrow" aria-hidden="true">▾</span>
            </button>
            <div id="filter-month-options" class="filter-options" role="group" aria-label="按月筛选"></div>
        </div>
        <div class="filter-field">
            <label for="filter-day">日</label>
            <button type="button" class="btn-select filter-dropdown-trigger" data-target="filter-day-options">
                选择日
                <span class="dropdown-arrow" aria-hidden="true">▾</span>
            </button>
            <div id="filter-day-options" class="filter-options" role="group" aria-label="按日筛选"></div>
        </div>
        <div class="filter-actions">
            <button type="button" class="btn-action clear">清空</button>
        </div>
    `;

    container.appendChild(wrapper);

    const yearOptions = wrapper.querySelector("#filter-year-options");
    const monthOptions = wrapper.querySelector("#filter-month-options");
    const dayOptions = wrapper.querySelector("#filter-day-options");
    const dropdownTriggers = wrapper.querySelectorAll(".filter-dropdown-trigger");
    const filterFields = wrapper.querySelectorAll(".filter-field");
    const clearButton = wrapper.querySelector(".clear");

    let currentCriteria = {
        year: initial.year || "",
        month: initial.month || "",
        day: initial.day || ""
    };

    const updateTriggerLabels = criteria => {
        const labels = {
            year: criteria.year ? `${criteria.year}年` : "选择年",
            month: criteria.month ? `${criteria.month}月` : "选择月",
            day: criteria.day ? `${criteria.day}日` : "选择日"
        };
        dropdownTriggers.forEach(trigger => {
            const target = trigger.dataset.target;
            if (!target) return;
            if (target.includes("year")) {
                trigger.childNodes[0].textContent = labels.year + " ";
            } else if (target.includes("month")) {
                trigger.childNodes[0].textContent = labels.month + " ";
            } else if (target.includes("day")) {
                trigger.childNodes[0].textContent = labels.day + " ";
            }
        });
    };

    const renderSelectOptions = () => {
        const records = typeof getRecords === "function" ? getRecords() : [];
        const options = buildOptions(records, currentCriteria);
        const fillOptions = (containerEl, optionValues, selectedValue, fieldKey) => {
            const selected = selectedValue || "";
            const buttons = [
                `<button type="button" class="btn-action filter-option${selected === "" ? " is-active" : ""}" data-value="" data-field="${fieldKey}">全部</button>`,
                ...optionValues.map(value => {
                    const isActive = value === selected;
                    return `<button type="button" class="btn-action filter-option${isActive ? " is-active" : ""}" data-value="${value}" data-field="${fieldKey}">${value}</button>`;
                })
            ];
            containerEl.innerHTML = buttons.join("");
        };

        fillOptions(yearOptions, options.yearOptions, currentCriteria.year, "year");
        fillOptions(monthOptions, options.monthOptions, currentCriteria.month, "month");
        fillOptions(dayOptions, options.dayOptions, currentCriteria.day, "day");
    };

    const applyCriteria = criteria => {
        currentCriteria = { ...criteria };
        renderSelectOptions();
        updateTriggerLabels(currentCriteria);
        if (typeof onFilterChange === "function") {
            onFilterChange(currentCriteria);
        }
    };

    const clearFilter = () => {
        applyCriteria({ year: "", month: "", day: "" });
    };

    const handleOptionClick = event => {
        const target = event.target.closest(".filter-option");
        if (!target) return;
        const field = target.dataset.field;
        if (!field) return;
        const fieldElement = target.closest(".filter-field");
        if (fieldElement) {
            closeField(fieldElement, false);
        }
        applyCriteria({
            ...currentCriteria,
            [field]: target.dataset.value || ""
        });
    };

    const DROPDOWN_CLOSE_DELAY = 140;
    const closeTimers = new WeakMap();

    const openField = field => {
        const timer = closeTimers.get(field);
        if (timer) {
            clearTimeout(timer);
            closeTimers.delete(field);
        }
        field.classList.add("is-open");
    };

    const closeField = (field, withDelay = true) => {
        const timer = closeTimers.get(field);
        if (timer) {
            clearTimeout(timer);
        }

        if (!withDelay) {
            field.classList.remove("is-open");
            closeTimers.delete(field);
            return;
        }

        const closeTimer = setTimeout(() => {
            field.classList.remove("is-open");
            closeTimers.delete(field);
        }, DROPDOWN_CLOSE_DELAY);

        closeTimers.set(field, closeTimer);
    };

    filterFields.forEach(field => {
        field.addEventListener("mouseenter", () => openField(field));
        field.addEventListener("mouseleave", () => closeField(field, true));
    });

    yearOptions.addEventListener("click", handleOptionClick);
    monthOptions.addEventListener("click", handleOptionClick);
    dayOptions.addEventListener("click", handleOptionClick);
    clearButton.addEventListener("click", clearFilter);

    renderSelectOptions();
    updateTriggerLabels(currentCriteria);
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
let tooltipRemoveTimer = null; // 移除 tooltip 的定时器
let lastMouseX = 0;
let lastMouseY = 0;
let isHoveringTooltip = false;
let isHoveringTerm = false;

const TOOLTIP_DELAY = 200;
const TOOLTIP_REMOVE_DELAY = 300; // 延迟时间，在鼠标移开后延迟移除 tooltip

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

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
    isHoveringTerm = true;

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
        activeTooltip.addEventListener("mouseenter", () => {
            isHoveringTooltip = true;
            if (tooltipRemoveTimer) {
                clearTimeout(tooltipRemoveTimer);
                tooltipRemoveTimer = null;
            }
        });
        activeTooltip.addEventListener("mouseleave", () => {
            isHoveringTooltip = false;
            scheduleTooltipRemoval();
        });

        // 计算位置：tooltip 出现后锁定，不再随鼠标移动
        const tooltipRect = activeTooltip.getBoundingClientRect();
        const tagRect = tag.getBoundingClientRect();
        const padding = 12;
        const verticalGap = 10;
        const mouseXAtShow = lastMouseX;

        let top = tagRect.bottom + verticalGap;
        if (top + tooltipRect.height > window.innerHeight - padding) {
            top = tagRect.top - tooltipRect.height - verticalGap;
        }
        if (!Number.isFinite(top)) {
            top = lastMouseY + verticalGap;
        }

        let left = mouseXAtShow - tooltipRect.width / 2;
        if (!Number.isFinite(left)) {
            left = mouseXAtShow;
        }

        left = clamp(left, padding, window.innerWidth - tooltipRect.width - padding);
        top = clamp(top, padding, window.innerHeight - tooltipRect.height - padding);

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

/* ---------- mouseout：延迟移除 tooltip ---------- */
document.addEventListener("mouseout", e => {
    if (e.target.closest(".term-tag")) {
        isHoveringTerm = false;
    }
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

    scheduleTooltipRemoval();
});

function scheduleTooltipRemoval() {
    if (tooltipRemoveTimer) {
        clearTimeout(tooltipRemoveTimer);
    }

    tooltipRemoveTimer = setTimeout(() => {
        const el = document.elementFromPoint(lastMouseX, lastMouseY);
        const hovering =
            isHoveringTerm ||
            isHoveringTooltip ||
            (el &&
                (el.closest(".term-tag") ||
                    el.closest(".term-tooltip")));

        if (hovering) {
            return;
        }

        removeTooltip();
    }, TOOLTIP_REMOVE_DELAY);
}

/* ---------- 移除 tooltip ---------- */
function removeTooltip(immediate = false) {
    if (!activeTooltip) return;

    activeTooltip.classList.remove("show");

    const el = activeTooltip;
    activeTooltip = null;
    activeTermId = null;
    isHoveringTooltip = false;
    isHoveringTerm = false;

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
    removeTooltip(true);
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
