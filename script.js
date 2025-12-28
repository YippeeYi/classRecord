fetch("data/records.json")
    .then(response => response.json())
    .then(records => {
        // 按日期 + 时间排序（新 → 旧）
        records.sort((a, b) => {
            return new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time);
        });

        const container = document.getElementById("record-list");

        records.forEach(record => {
            const div = document.createElement("div");
            div.className = "record";

            div.innerHTML = `
        <div class="meta">
          📅 ${record.date} ${record.time} ｜ ✍ 记录人：${record.author}
        </div>
        <div class="content">
          ${record.content}
        </div>
        <img src="${record.image}" alt="记录照片">
      `;

            container.appendChild(div);
        });
    });
