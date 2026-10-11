# www.liukui2050.com · 合併部署包

把**原站（思辨遊戲·破壁求真）**與**全球華人廟宇神祇地圖合集（55 頁）**合成一個 Vercel 專案。
原站檔案原樣保留（含 51.la 統計），地圖合集全部隔離在 `/maps/` 下，與原站零衝突。

首頁維持**原來的 4 張卡**、2 列網格：第 4 張「點亮遊戲 · 香火傳承」即本次的地圖合集，
原地升級指向 `/maps/`，沒有新增第 5 張卡。四張卡結構完全一致（標題 + 一句描述 + 一個標籤），
第 3、4 張在同一排且等高。

`/maps/` 即「88 主神點亮模式」頁：88 個神祇徽章網格，點擊開 overlay 載入對應地圖。
87 張地圖全部為真實檔案（含考錄版），共 1018 個廟宇點位。

---

## 一、目錄結構

```
/
├── index.html              總入口（原 4 張卡，第 4 張指向 /maps/）
├── game.html               主體遊戲頁（原站）
├── ritual.html             人日倡議頁（原站）
├── chart.html              數據可視化頁（原站）
├── 88god/
│   └── 88主神點亮模式.html   舊版 iframe 聚合入口（首頁已不再鏈接，詳見第五節）
├── maps/
│   ├── index.html          地圖合集導航頁（搜索 + 分組卡片）
│   ├── assets/tracker.js   埋點 SDK（全站共用）
│   └── *.html              55 個地圖頁（拼音 slug 命名）
├── api/
│   ├── deity-track.js      埋點接收端
│   └── deity-stats.js      即時統計端點
├── vercel.json             合併原站設定 + 新增快取規則
├── package.json
└── _manifest.json          構建清單
```

**共 60 個 HTML 頁面**（原站 4 + 地圖導航 1 + 地圖 55），約 3.6 MB。

---

## 二、與原站的關係：只加不改

| 項目 | 處理 |
|---|---|
| 原站 4 個頁面 | 原樣複製，僅在 `</head>` 前注入一行 tracker |
| 首頁卡片數 | **維持 4 張**，不新增 |
| 網格 | `repeat(2,1fr)` 不變，第 1、2 張一排，第 3、4 張一排 |
| 第 4 張卡 | 標題「88主神 · 全球點亮地圖」不變，`href` 由 `88god/…` 改為 `/maps/` |
| 第 4 張卡結構 | 與前三張完全一致：`h2` + 一句描述（42 字）+ 一個 tag；去掉徽章與直達 chip，確保與第 3 張同排等高 |
| 51.la 統計 | **完整保留**（`3RHx8posHa7M4tGV`），與新埋點並行互不干擾 |
| 視覺系統 | 沿用原站三色：澳門綠 `#0E7A5F`、思辨金 `#C8A24E`、米白 `#F8F5F0` |

四張卡描述字數：40 / 27 / 39 / 42 字，視覺節奏一致。

路徑零衝突：地圖頁全部在 `/maps/`，埋點 API 用 `/api/deity-*`，不佔用原站任何既有路徑。

---

## 三、部署到 www.liukui2050.com

### 步驟 1 · 上傳到 Vercel

```bash
cd site
npm i -g vercel
vercel          # 首次：登入 → 專案名留預設 → 一路 Enter
vercel --prod   # 正式上線
```

或用 Git：把 `site/` 推到倉庫，在 vercel.com → Add New → Project → Import。
Framework 選 **Other**，Build Command 與 Output Directory **都留空**。

> 不要用網頁拖拽部署——那樣 Serverless Functions 不生效，`/api/deity-track` 會 404。

### 步驟 2 · 綁定域名

Vercel 專案 → **Settings → Domains**，添加：

| 主機記錄 | 類型 | 值 |
|---|---|---|
| `@`（liukui2050.com） | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

Vercel 會自動簽發 SSL 憑證，生效通常 5–30 分鐘（取決於 DNS TTL）。
建議兩個都加，並把其中一個設為 Primary 開啟自動跳轉。

### 步驟 3 · 驗證

```
https://www.liukui2050.com/                    總入口（4 張卡）
https://www.liukui2050.com/game.html           主體遊戲頁
https://www.liukui2050.com/maps/               地圖合集導航
https://www.liukui2050.com/maps/nezha-kaolu    哪吒考錄版
https://www.liukui2050.com/api/deity-stats     埋點統計
```

`cleanUrls` 已開啟，`/maps/nezha-kaolu` 與 `/maps/nezha-kaolu.html` 等價。

---

## 四、埋點設計

`maps/assets/tracker.js` 在構建時注入全部 60 個頁面。自動採集：

| 事件 | 時機 | 欄位 |
|---|---|---|
| `page_view` | 載入 | slug、title、referrer、UA、螢幕、語言、UTM |
| `click` | 任意點擊 | 自動識別 `.h-btn` / `.card` / `.legend-item` / Leaflet 標記，記錄按鈕文字 |
| `page_leave` | 關閉／隱藏／跳轉 | `dwell_ms` 停留、`visible_ms` 可見 |
| 行為事件 | 呼叫已 hook 的函式 | `light_all` / `clear_all` / `toggle_lotus` / `play_timeline` / `open_list` 等 |

已 hook 的函式：`lightAll`、`clearAll`、`toggleLotus`、`toggleLit`、`playTimeline`、
`toggleList`、`toggleLegend`、`toggleArea`、`toggleKind`、`showRoute`、`applyTimeFilter`、`openKao`。

手動打點：`window.__track('custom', { foo: 'bar' })`
關閉：`?track=0`

上報策略：緩衝 5 秒或滿 20 條批量發送；離頁用 `sendBeacon` 補發；失敗自動重試且不影響頁面。

### 看數據（三種，可同時開啟）

| 方式 | 地址／位置 | 留存 | 適合 |
|---|---|---|---|
| ① 即時統計 | `/api/deity-stats` | 實例內存，重啟即清 | 驗證埋點通不通、看短時數據 |
| ② Vercel Logs | 面板 → Logs → 篩 `TRACK` | 隨平台日誌留存 | 日常查看、可導出 |
| ③ 長期留存 | 見下節 | 持久 | 累積數月、做分析 |

`/api/deity-stats` 回傳：總事件數、Session 數、平均停留時長、熱門頁面、熱門事件、按日分布，
以及當前開啟了哪些 sink。加 `?raw=1` 看原始事件明細。

---

## 五、長期留存（方式 ③）

`api/deity-track.js` 同時向三個目標寫入，靠環境變量開關，可任意組合，
**任一失敗都靜默降級，不影響頁面、不影響其他 sink**。

| Sink | 開啟條件 | 說明 |
|---|---|---|
| Vercel KV | 面板建立 KV 並連到專案（自動注入 `KV_URL`） | 推薦，零外部帳號，直接在本專案內查詢 |
| GA4 | 設 `GA_MEASUREMENT_ID` + `GA_API_SECRET` | Measurement Protocol，可在 GA4 後台看報表 |
| Webhook | 設 `TRACK_WEBHOOK`（可選 `TRACK_WEBHOOK_TOKEN`） | 轉發到自建服務／Umami／Plausible／飛書或企業微信機器人 |

### 5.1 開 Vercel KV（推薦）

1. Vercel 面板 → 你的專案 → **Storage** → **Create** → **KV** → 命名後 Create
2. 在 KV 頁面點 **Connect Project**，選本專案——會自動注入 `KV_URL` 等環境變量
3. 重新部署一次（`vercel --prod`），讓新環境變量生效

`package.json` 已含 `@vercel/kv`，Vercel 會自動安裝。

寫入鍵：

```
t:evt:{YYYY-MM-DD}     hash  事件名 → 當日計數
t:page:{YYYY-MM-DD}    hash  slug   → 當日計數
t:day                  hash  日期   → 當日總數
t:dwell                hash  sum / n → 停留時長累加，用於算平均
t:recent               list  最近 5000 條事件流水
```

日歸屬統一用 **UTC+8**，與站點時區一致。

### 5.2 查詢長期數據

```
GET /api/deity-stats?store=kv             # 預設回溯 30 天
GET /api/deity-stats?store=kv&days=90     # 回溯 90 天（最多 180）
GET /api/deity-stats?store=kv&raw=1       # 最近 200 條原始事件
```

回傳與內存模式同構，只是 `store` 變為 `kv`，並多一個 `days` 欄位：

```json
{
  "ok": true, "store": "kv", "days": 30, "total": 12840,
  "avg_dwell_ms": 96000,
  "top_events": [{"evt":"page_view","n":5200}, {"evt":"click","n":4300}],
  "top_pages":  [{"slug":"maps-index","n":2100}],
  "by_day": {"2026-10-10": 480}
}
```

KV 未啟用時不會報錯，而是回傳：

```json
{"ok":false,"error":"Vercel KV 未啟用","howto":"Vercel 面板 → Storage → Create → KV → …"}
```

### 5.3 開 GA4（可選）

在 Vercel 專案 → Settings → Environment Variables 加兩個：

- `GA_MEASUREMENT_ID` = `G-XXXXXXX`
- `GA_API_SECRET` = GA4 資料串流裡產生的密鑰

事件名會自動清洗成 GA4 允許的格式（僅字母數字下劃線、不以 `ga_` 開頭），
附帶 `page_slug`、`page_title`、`page_location`、`label`、`sel` 等參數。

> GA4 網域在中國大陸可能不可達，服務端轉發失敗會靜默跳過。

### 5.4 開 Webhook（可選）

設 `TRACK_WEBHOOK` = 你的接收地址，可選 `TRACK_WEBHOOK_TOKEN`（會帶 `Authorization: Bearer`）。

POST 過去的 body：

```json
{ "source": "liukui2050",
  "events": [{ "ts":1760000000000,"sid":"…","slug":"…","evt":"page_view","props":{},
               "ua":"…","screen":"1920x1080@1","country":"MO" }] }
```

飛書／企業微信機器人、自建 Umami、資料庫寫入服務都能直接接。

### 5.5 費用提示

Vercel KV 免費額度約每月 3 萬次命令。本方案每次上報約產生 `2~4 × 事件數` 條命令；
若日均 PV 在 3000 以內基本不會超限。超量可升級或改用 Log Drains 導出到自有儲存。


## 附：地圖頁格式統一

87 張地圖已全部統一為「天后考錄版」格式（原 6 張考錄版本身即此格式，其餘 81 張由基礎版轉換）：

- 四條時間線彈窗（始建／最早可證／現存建築／最近重修）
- 大區色圓點 → 點擊綻放蓮花 → 進度條計數
- 時間軸滑塊（各頁按自身數據的實際年份範圍生成）
- 圖例開關（地區分類／廟宇性質）、同址廟宇微偏移（spider）
- 播放序列（「全部點亮」按年代由早到晚逐座綻放）
- 廟宇名錄側欄、六種底圖切換

轉換口徑：基礎版 `type` 映射為 `kind`（主祀→廟，配祀／附祀→配祀），`region`→`area`，`country`→`place`，
`year`→`y`，`desc`→`ytext`；大洲按 region 歸入亞洲／北美洲／歐洲／非洲／大洋洲／南美洲。
基礎版無法定等級資料，故 `tier` 全為 0，圖例中「法定等級外環」一組自動省略。

---

## 六、已知事項

- **地圖頁依賴 CDN 的 Leaflet 1.9.4（unpkg）與 OSM／ArcGIS 瓦片**。若主要訪客在中國大陸，建議把 Leaflet 換成本地檔案或國內 CDN，瓦片源另行替換。
- **`88god/` 目錄**：舊版 iframe 聚合入口，首頁已不再鏈接。它以 88 個 iframe 載入地圖，但這 88 份地圖檔不在本次源文件裡，直接訪問會出現白框。該目錄保留是為了讓你把本地的 88 份地圖補進去——補齊後把首頁第 4 張卡的 `href` 改回 `88god/88主神點亮模式.html` 即可；若確定不用，直接刪掉這個目錄。
- **同名神祇多版本並存**（如哪吒有考錄版、增補版、增補繁體版），便於對照同一份考錄在不同版式下的呈現。
- 地圖合集的 55 頁是獨立頁面（非 iframe），與 `88god/` 的聚合方案互不依賴。考錄版直達入口見 `/maps/` 導航頁。
