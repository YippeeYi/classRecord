# 编日史（classRecord）

一个纯前端的班级档案网站，用于整理和展示「记录」「人物」「术语」三类内容。

## 项目特性

- **纯静态部署**：HTML + CSS + JavaScript + JSON，无后端依赖。
- **结构化数据源**：按模块拆分数据目录，便于多人协作维护。
- **本地缓存加速**：首次加载后缓存到 `localStorage`，减少重复请求。
- **访问密钥保护**：前端哈希校验 + 24 小时有效期。
- **跨页面联动**：记录中的人物、术语可跳转到详情页。

## 页面说明

- `index.html`：导览页（统计概览、页面入口）。
- `record.html`：记录列表页。
- `people.html`：人物列表页。
- `person.html`：人物详情页。
- `glossary.html`：术语列表页。
- `term.html`：术语详情页。
- `auth.html`：访问密钥验证页。
- `docs/record-format.html`：记录 JSON 格式说明。

## 目录结构

```text
classRecord/
├── *.html                 # 页面入口
├── style.css              # 全局样式
├── js/                    # 前端逻辑
│   ├── authGate.js        # 访问控制
│   ├── cacheLoader.js     # 缓存加载与清理
│   ├── recordStore.js     # 记录数据加载
│   ├── peopleStore.js     # 人物数据加载
│   └── glossaryStore.js   # 术语数据加载
├── data/
│   ├── record/            # 记录数据 + records_index.json
│   ├── people/            # 人物数据 + people_index.json
│   ├── glossary/          # 术语数据 + glossary_index.json
│   └── attachments/       # 附件资源
├── images/                # 记录主图
└── docs/
    └── record-format.html # 记录格式说明
```

## 本地运行

> 不要直接双击 HTML 打开（`file://` 协议下 `fetch` 读取 JSON 会受限）。

在项目根目录启动静态服务器：

```bash
python3 -m http.server 8000
```

然后访问：

```bash
http://localhost:8000/index.html`
```

## 数据维护规范

### 1) 记录（`data/record/`）

- 每条记录一个 JSON 文件，文件名建议：`YYYY-MM-DD-序号.json`
- 必填字段：`date`、`author`、`content`、`image`
- 可选字段：`time`、`attachments`
- 新增文件后，需同步更新 `data/record/records_index.json`

### 2) 人物（`data/people/`）

- 每个人物一个 JSON 文件，文件名通常与人物 ID 对应。
- 新增文件后，需同步更新 `data/people/people_index.json`

### 3) 术语（`data/glossary/`）

- 每个术语一个 JSON 文件。
- 新增文件后，需同步更新 `data/glossary/glossary_index.json`

### 4) 图片与附件

- 记录主图建议放在 `images/`。
- 额外材料放在 `data/attachments/`，并在记录 JSON 的 `attachments` 字段中引用。

## 访问密钥配置

访问控制逻辑位于 `js/authGate.js`。

- 你可以通过全局变量 `window.CLASS_RECORD_ACCESS_KEY_HASH` 覆盖默认哈希值。
- 默认策略：
  - 验证成功后写入本地存储
  - 授权有效期为 24 小时
  - 过期后自动跳转回 `auth.html`

如果你要更换密钥：

1. 先计算新密钥的 SHA-256（十六进制小写）。
2. 将哈希值注入 `window.CLASS_RECORD_ACCESS_KEY_HASH`（例如在页面中提前挂载配置脚本）。

## 缓存机制

- 缓存前缀：`classRecord:`
- 默认缓存时间：24 小时
- 首次访问或缓存过期时会批量加载 `record / people / glossary` 数据
- 可通过页面按钮清空缓存（会删除本项目前缀下的本地缓存项）

## 常见问题

### Q1：页面一直跳到 `auth.html`？
- 检查是否已输入正确密钥。
- 检查浏览器是否禁用了 `localStorage`。
- 清空浏览器缓存后重试。

### Q2：新增 JSON 后页面没变化？
- 确认对应 `*_index.json` 已加入新文件名。
- 点击页面上的“清空缓存”按钮或手动清理 `localStorage` 后刷新。

### Q3：本地打不开数据？
- 确认是通过 `http://localhost` 打开，而不是 `file://`。

## 贡献建议

- 提交前至少自查：页面能打开、数据能加载、跳转链接可用。
- 记录文本尽量保持中性客观，避免引发歧义。
- 文件命名保持一致，避免中英文与大小写混用。
