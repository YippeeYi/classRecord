const container = document.getElementById("people-container");

// 显示人物列表
function renderPersonItem(person) {
    return `
    <div class="person-item" data-id="${person.id}">
      <strong>${person.alias}</strong> （ID: ${person.id}）
    </div>
  `;
}

/* ===============================
   加载人物索引
   =============================== */
fetch("data/people/people_index.json")
    .then(res => res.json())
    .then(fileList => {
        // 读取每个人物文件
        const requests = fileList.map(name =>
            fetch(`data/people/${name}`).then(res => res.json())
        );
        return Promise.all(requests);
    })
    .then(people => {
        container.innerHTML = people.map(p => renderPersonItem(p)).join("");

        // 点击跳转个人页面
        container.querySelectorAll(".person-item").forEach(item => {
            item.addEventListener("click", () => {
                const pid = item.dataset.id;
                location.href = `person.html?id=${pid}`;
            });
        });
    })
    .catch(err => {
        console.error("人物数据加载失败", err);
        container.innerHTML = "<p>人物数据加载失败，请检查数据文件。</p>";
    });
