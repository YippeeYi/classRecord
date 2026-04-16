/************************************************************
 * people.js
 * 人物名单页面
 ************************************************************/

const container = document.getElementById("people-list");

let peopleList = [];
let records = [];
let currentSortKey = "id";
let currentSortOrder = "asc";

const cacheReady = window.cacheReadyPromise || Promise.resolve();

cacheReady.then(() => Promise.all([
    loadAllPeople(),
    loadAllRecords()
])).then(([people, allRecords]) => {
    peopleList = people;
    records = allRecords;
    renderByRole(currentSortKey, currentSortOrder);
});

const roleNameMap = {
    student: "同学",
    teacher: "老师",
    other: "其他"
};

function renderByRole(sortKey = "id", sortOrder = "asc") {
    container.innerHTML = "";

    const groups = { student: [], teacher: [], other: [] };

    peopleList.forEach((person) => {
        if (groups[person.role]) {
            groups[person.role].push(person);
        } else {
            groups.other.push(person);
        }
    });

    Object.keys(groups).forEach((role) => {
        const list = sortPeople(groups[role], sortKey, sortOrder);
        if (!list.length) {
            return;
        }

        const section = document.createElement("section");
        section.className = "list-section";
        section.innerHTML = `
            <div class="list-section-heading">
                <h2 class="list-section-title">${roleNameMap[role]}</h2>
                <span class="list-section-count">${list.length}</span>
            </div>
            <div class="table-shell">
                <table class="people-table">
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>ID</th>
                            <th>别名</th>
                            <th>参与</th>
                            <th>记录</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((person, index) => `
                            <tr data-id="${person.id}">
                                <td>${index + 1}</td>
                                <td>${person.id}</td>
                                <td>${parseContent(person.alias) || "-"}</td>
                                <td>${countAsParticipant(person.id)}</td>
                                <td>${person.role === "student" ? countAsAuthor(person.id) : "-"}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(section);
    });

    bindRowClick();
}

function bindRowClick() {
    document.querySelectorAll(".people-table tbody tr").forEach((tr) => {
        tr.onclick = () => {
            const href = `person.html?id=${tr.dataset.id}`;
            if (typeof window.navigateTo === "function") {
                window.navigateTo(href);
            } else {
                location.href = href;
            }
        };
    });
}

function countAsAuthor(id) {
    return records.filter((record) => record.author === id).length;
}

function countAsParticipant(id) {
    const reg = new RegExp(`\\[\\[${id}\\|.+?\\]\\]`);
    return records.filter((record) => record.content && reg.test(record.content)).length;
}

function sortPeople(list, key, order) {
    return [...list].sort((a, b) => {
        const getValue = (person) => ({
            id: person[key] || "",
            participation: countAsParticipant(person.id),
            record: person.role === "student" ? countAsAuthor(person.id) : 0
        }[key]);

        const A = getValue(a);
        const B = getValue(b);

        if (key === "id") {
            return order === "asc"
                ? A.localeCompare(B)
                : B.localeCompare(A);
        }

        return order === "asc" ? A - B : B - A;
    });
}

const sortControls = document.querySelector(".sort-controls");
const sortDropdown = sortControls.querySelector(".sort-dropdown");
const keyTrigger = sortControls.querySelector(".dropdown-trigger");
const keyLabel = keyTrigger.querySelector(".dropdown-label");
const orderToggle = sortControls.querySelector(".sort-order-toggle");

const sortKeyText = {
    id: "按 ID",
    participation: "按参与事件数",
    record: "按记录事件数"
};

function updateSortControls() {
    keyTrigger.dataset.value = currentSortKey;
    keyLabel.textContent = sortKeyText[currentSortKey] || "按 ID";

    orderToggle.dataset.value = currentSortOrder;
    orderToggle.textContent = currentSortOrder === "asc" ? "升序" : "降序";

    sortControls.querySelectorAll(".sort-option").forEach((option) => {
        option.classList.toggle("is-active", option.dataset.value === currentSortKey);
    });
}

sortControls.addEventListener("click", (event) => {
    const option = event.target.closest(".sort-option");
    if (option) {
        currentSortKey = option.dataset.value || "id";
        closeSortDropdown(false);
        updateSortControls();
        renderByRole(currentSortKey, currentSortOrder);
        return;
    }

    if (event.target.closest(".sort-order-toggle")) {
        currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
        updateSortControls();
        renderByRole(currentSortKey, currentSortOrder);
    }
});

const DROPDOWN_CLOSE_DELAY = 140;
let dropdownCloseTimer = null;

function openSortDropdown() {
    if (dropdownCloseTimer) {
        clearTimeout(dropdownCloseTimer);
        dropdownCloseTimer = null;
    }
    sortDropdown.classList.add("is-open");
}

function closeSortDropdown(withDelay = true) {
    if (dropdownCloseTimer) {
        clearTimeout(dropdownCloseTimer);
    }

    if (!withDelay) {
        sortDropdown.classList.remove("is-open");
        dropdownCloseTimer = null;
        return;
    }

    dropdownCloseTimer = setTimeout(() => {
        sortDropdown.classList.remove("is-open");
        dropdownCloseTimer = null;
    }, DROPDOWN_CLOSE_DELAY);
}

sortDropdown.addEventListener("mouseenter", openSortDropdown);
sortDropdown.addEventListener("mouseleave", () => closeSortDropdown(true));

updateSortControls();
