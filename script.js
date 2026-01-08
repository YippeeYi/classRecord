/************************************************************
 * 班级纪事本 - script.js
 * 架构：分文件记录
 * 功能：
 * - 读取 records_index.json
 * - 加载所有记录文件
 * - 按 date → time → order → id 排序
 * - 图片 / 附件 点击展开
 * - 人物标记解析与个人页面跳转
 ************************************************************/

const container = document.getElementById("record-list");

/* ===============================
   人物数据加载
   =============================== */

let peopleMap = {}; // id -> person
/* ===============================
   读取人物索引
   =============================== */
fetch("data/people/people_index.json")
  .then(res => res.json())
  .then(fileList => {
    const requests = fileList.map(name =>
      fetch(`data/people/${name}`).then(res => res.json())
    );
    return Promise.all(requests);
  })
  .then(people => {
    people.forEach(p => {
      peopleMap[p.id] = p;
    });
  })
  .catch(err => {
    console.error("人物数据加载失败", err);
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
    // 处理上标：[[name|^]] -> <sup>name</sup>
    .replace(/\[\[([a-zA-Z0-9_-]+)\|([^\]]+\^)\]\]/g, (_, personId, displayName) => {
      const content = displayName.slice(0, -1);  // 去掉末尾的 ^
      return `<span class="person-tag" data-id="${personId}"><sup>${content}</sup></span>`;
    })
    // 处理下标：[[name|_]] -> <sub>name</sub>
    .replace(/\[\[([a-zA-Z0-9_-]+)\|([^\]]+_)\]\]/g, (_, personId, displayName) => {
      const content = displayName.slice(0, -1);  // 去掉末尾的 _
      return `<span class="person-tag" data-id="${personId}"><sub>${content}</sub></span>`;
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
   读取记录索引
   =============================== */
fetch("data/record/records_index.json")
  .then(res => res.json())
  .then(fileList => {
    const requests = fileList.map(name =>
      fetch(`data/record/${name}`).then(res => res.json())
    );
    return Promise.all(requests);
  })
  .then(records => {

    /* ===============================
       排序逻辑
       =============================== */
    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.time && b.time) return b.time.localeCompare(a.time);
      if (a.time) return -1;
      if (b.time) return 1;
      if (a.order !== undefined && b.order !== undefined)
        return a.order - b.order;
      return a.id - b.id;
    });

    /* ===============================
       渲染
       =============================== */
    records.forEach(record => {

      let timeText = "（时间不详）";
      if (record.time) timeText = record.time;
      else if (record.order !== undefined)
        timeText = `（当日第 ${record.order} 条）`;

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
  })
  .catch(err => {
    console.error(err);
    container.innerHTML = "<p>记录加载失败，请检查数据文件。</p>";
  });

/* ===============================
   人名点击 → 个人页面
   =============================== */
document.addEventListener("click", e => {
  const tag = e.target.closest(".person-tag");
  if (!tag) return;

  const personId = tag.dataset.id;
  location.href = `person.html?id=${personId}`;
});
