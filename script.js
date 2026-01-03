/************************************************************
 * 班级纪事本 - script.js
 * 架构：分文件记录
 * 功能：
 * - 读取 records_index.json
 * - 加载所有记录文件
 * - 按 date → time → order → id 排序
 * - 图片 / 附件 点击展开
 ************************************************************/

const container = document.getElementById("record-list");

/* 1️⃣ 读取索引文件 */
fetch("data/records_index.json")
  .then(res => res.json())
  .then(fileList => {
    const requests = fileList.map(name =>
      fetch(`data/${name}`).then(res => res.json())
    );
    return Promise.all(requests);
  })
  .then(records => {

    /* 2️⃣ 排序逻辑 */
    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.time && b.time) return b.time.localeCompare(a.time);
      if (a.time) return -1;
      if (b.time) return 1;
      if (a.order !== undefined && b.order !== undefined)
        return a.order - b.order;
      return a.id - b.id;
    });

    /* 3️⃣ 渲染 */
    records.forEach(record => {

      let timeText = "（时间不详）";
      if (record.time) timeText = record.time;
      else if (record.order !== undefined) timeText = `（当日第 ${record.order} 条）`;

      const recordDiv = document.createElement("div");
      recordDiv.className = "record";

      recordDiv.innerHTML = `
        <div class="meta">
          <span>📅 ${record.date} ${timeText} | ✍ ${record.author}</span>
          <span class="icon-group">
            ${record.image ? `
              <span class="image-toggle" title="查看原始记录">📷</span>
            ` : ""}
            ${record.attachments && record.attachments.length > 0 ? `
              <span class="attach-toggle" title="查看附件">📎</span>
            ` : ""}
          </span>
        </div>

        <div class="content">${record.content}</div>

        ${record.image ? `
          <div class="image-wrapper">
            <img src="${record.image}" alt="纸笔原始记录">
          </div>
        ` : ""}

        ${record.attachments && record.attachments.length > 0
          ? `
          <div class="attachments-wrapper">
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

      /* 图片切换 */
      const imgBtn = recordDiv.querySelector(".image-toggle");
      const imgWrap = recordDiv.querySelector(".image-wrapper");

      if (imgBtn && imgWrap) {
        imgBtn.addEventListener("click", () => {
          const open = imgWrap.style.display === "block";
          imgWrap.style.display = open ? "none" : "block";
          imgBtn.textContent = open ? "📷" : "❌";
        });
      }

      /* 附件切换 */
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
