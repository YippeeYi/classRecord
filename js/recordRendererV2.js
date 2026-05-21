function parseContent(text) {
    if (!text) return "";

    return text
        .replace(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g, (_, id, label) => `<span class="term-tag" data-id="${id}">${label}</span>`)
        .replace(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g, (_, id, label) => `<span class="person-tag" data-id="${id}" title="${id}">${label}</span>`)
        .replace(/\(\((.+?)\)\)/g, (_, content) => `<span class="redacted"><span class="redacted-mask"></span><span class="redacted-content">${content}</span></span>`)
        .replace(/\^(.+?)\^/g, (_, value) => `<sup>${value}</sup>`)
        .replace(/_(.+?)_/g, (_, value) => `<sub>${value}</sub>`);
}

function stripRecordMarkup(text) {
    if (!text) return "";
    return text
        .replace(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g, "$2")
        .replace(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g, "$2")
        .replace(/\(\((.+?)\)\)/g, "$1")
        .replace(/\^(.+?)\^/g, "$1")
        .replace(/_(.+?)_/g, "$1");
}

window.stripRecordMarkup = stripRecordMarkup;

function formatContent(text) {
    return text.split("\n\n").map((paragraph) => parseContent(paragraph).replace(/\n/g, "<br>")).join("");
}

function sortRecords(records) {
    records.sort((a, b) => b.id.localeCompare(a.id));
}

function buildRecordBody(record, isLocked) {
    const timeText = record.time ? `📌 ${record.time} |` : "";

    return `
        <div class="meta">
            <span>
                #${record.id} |
                📅 ${record.date} |
                ${timeText}
                ✍ ${parseContent(`[[${record.author}|${record.author}]]`)}
            </span>
            <span class="icon-group${isLocked ? " is-hidden" : ""}">
                ${record.image ? `<span class="image-toggle">📷</span>` : ""}
                ${record.attachments?.length ? `<span class="attach-toggle">📎</span>` : ""}
            </span>
        </div>
        <div class="content ${isLocked ? "content-locked" : ""}">
            ${isLocked ? `
                <div class="record-lock-panel">
                    <div class="record-lock-icon">LOCKED</div>
                    <p class="record-lock-title">重要条目已上锁</p>
                    <p class="record-lock-copy">该条目被标记为重要，解锁后可查看正文、图片和附件。</p>
                    <button class="btn-action record-unlock-btn" type="button" data-record-id="${record.id}">500 Q币解锁</button>
                </div>
            ` : formatContent(record.content)}
        </div>
        ${!isLocked && record.image ? `<div class="image-wrapper" style="display:none"><img src="${record.image}" alt="${record.id}"></div>` : ""}
        ${!isLocked && record.attachments?.length ? `
            <div class="attachments-wrapper" style="display:none">
                <ul>
                    ${record.attachments.map((attachment) => `<li><a href="${attachment.file}" target="_blank">${attachment.name}</a></li>`).join("")}
                </ul>
            </div>
        ` : ""}
    `;
}

function renderRecordList(records, container) {
    records.forEach((record) => {
        if (!record.id) {
            console.warn("发现未初始化（未带 id）的记录：", record);
        }
    });

    container.innerHTML = "";

    records.forEach((record) => {
        const importance = record.importance || "normal";
        const div = document.createElement("div");

        const renderIntoDiv = () => {
            const isLocked = Boolean(window.GameState?.isRecordLocked?.(record));
            div.className = `record importance-${importance}${isLocked ? " is-locked" : ""}`;
            div.innerHTML = buildRecordBody(record, isLocked);
            bindToggle(div);
            div.querySelector(".record-unlock-btn")?.addEventListener("click", () => {
                if (window.GameState?.unlockRecord?.(record.id, 500)) {
                    renderIntoDiv();
                }
            });
        };

        renderIntoDiv();
        container.appendChild(div);
    });
}

function filterRecordsByDate(records, { year, month, day }) {
    const hasYear = Boolean(year);
    const hasMonth = Boolean(month);
    const hasDay = Boolean(day);
    if (!hasYear && !hasMonth && !hasDay) return records.slice();

    return records.filter((record) => {
        if (!record.date) return false;
        const [recordYear, recordMonth, recordDay] = record.date.split("-");
        if (hasYear && recordYear !== year) return false;
        if (hasMonth && recordMonth !== month) return false;
        if (hasDay && recordDay !== day) return false;
        return true;
    });
}

function parseDateParts(records) {
    return records.map((record) => record.date).filter(Boolean).map((date) => {
        const [year, month, day] = date.split("-");
        return { year, month, day };
    });
}

function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function buildOptions(records, criteria) {
    const dates = parseDateParts(records);
    return {
        yearOptions: uniqueSorted(dates.filter((date) => (!criteria.month || date.month === criteria.month) && (!criteria.day || date.day === criteria.day)).map((date) => date.year)),
        monthOptions: uniqueSorted(dates.filter((date) => (!criteria.year || date.year === criteria.year) && (!criteria.day || date.day === criteria.day)).map((date) => date.month)),
        dayOptions: uniqueSorted(dates.filter((date) => (!criteria.year || date.year === criteria.year) && (!criteria.month || date.month === criteria.month)).map((date) => date.day))
    };
}

function renderRecordFilter({ container, onFilterChange, getRecords, initial = {} }) {
    if (!container) return;
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "record-filter";
    wrapper.innerHTML = `
        <div class="filter-field">
            <label for="filter-year">年</label>
            <button type="button" class="btn-select filter-dropdown-trigger" data-target="filter-year-options">选择年 <span class="dropdown-arrow" aria-hidden="true">▾</span></button>
            <div id="filter-year-options" class="filter-options" role="group" aria-label="按年筛选"></div>
        </div>
        <div class="filter-field">
            <label for="filter-month">月</label>
            <button type="button" class="btn-select filter-dropdown-trigger" data-target="filter-month-options">选择月 <span class="dropdown-arrow" aria-hidden="true">▾</span></button>
            <div id="filter-month-options" class="filter-options" role="group" aria-label="按月筛选"></div>
        </div>
        <div class="filter-field">
            <label for="filter-day">日</label>
            <button type="button" class="btn-select filter-dropdown-trigger" data-target="filter-day-options">选择日 <span class="dropdown-arrow" aria-hidden="true">▾</span></button>
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
    let currentCriteria = { year: initial.year || "", month: initial.month || "", day: initial.day || "" };

    const updateTriggerLabels = (criteria) => {
        const labels = {
            year: criteria.year ? `${criteria.year}年` : "选择年",
            month: criteria.month ? `${criteria.month}月` : "选择月",
            day: criteria.day ? `${criteria.day}日` : "选择日"
        };
        dropdownTriggers.forEach((trigger) => {
            const target = trigger.dataset.target || "";
            if (target.includes("year")) trigger.childNodes[0].textContent = `${labels.year} `;
            if (target.includes("month")) trigger.childNodes[0].textContent = `${labels.month} `;
            if (target.includes("day")) trigger.childNodes[0].textContent = `${labels.day} `;
        });
    };

    const renderSelectOptions = () => {
        const recordsValue = typeof getRecords === "function" ? getRecords() : [];
        const options = buildOptions(recordsValue, currentCriteria);
        const fillOptions = (containerEl, optionValues, selectedValue, fieldKey) => {
            const selected = selectedValue || "";
            containerEl.innerHTML = [
                `<button type="button" class="btn-action filter-option${selected === "" ? " is-active" : ""}" data-value="" data-field="${fieldKey}">全部</button>`,
                ...optionValues.map((value) => `<button type="button" class="btn-action filter-option${value === selected ? " is-active" : ""}" data-value="${value}" data-field="${fieldKey}">${value}</button>`)
            ].join("");
        };

        fillOptions(yearOptions, options.yearOptions, currentCriteria.year, "year");
        fillOptions(monthOptions, options.monthOptions, currentCriteria.month, "month");
        fillOptions(dayOptions, options.dayOptions, currentCriteria.day, "day");
    };

    const applyCriteria = (criteria) => {
        currentCriteria = { ...criteria };
        renderSelectOptions();
        updateTriggerLabels(currentCriteria);
        onFilterChange?.(currentCriteria);
    };

    const closeTimers = new WeakMap();
    const openField = (field) => {
        const timer = closeTimers.get(field);
        if (timer) clearTimeout(timer);
        closeTimers.delete(field);
        field.classList.add("is-open");
    };
    const closeField = (field, withDelay = true) => {
        const timer = closeTimers.get(field);
        if (timer) clearTimeout(timer);
        if (!withDelay) {
            field.classList.remove("is-open");
            closeTimers.delete(field);
            return;
        }
        closeTimers.set(field, setTimeout(() => {
            field.classList.remove("is-open");
            closeTimers.delete(field);
        }, 140));
    };

    const handleOptionClick = (event) => {
        const target = event.target.closest(".filter-option");
        if (!target) return;
        const field = target.dataset.field;
        if (!field) return;
        const fieldElement = target.closest(".filter-field");
        if (fieldElement) closeField(fieldElement, false);
        applyCriteria({ ...currentCriteria, [field]: target.dataset.value || "" });
    };

    filterFields.forEach((field) => {
        field.addEventListener("mouseenter", () => openField(field));
        field.addEventListener("mouseleave", () => closeField(field));
    });

    yearOptions.addEventListener("click", handleOptionClick);
    monthOptions.addEventListener("click", handleOptionClick);
    dayOptions.addEventListener("click", handleOptionClick);
    clearButton.addEventListener("click", () => applyCriteria({ year: "", month: "", day: "" }));

    renderSelectOptions();
    updateTriggerLabels(currentCriteria);
}
