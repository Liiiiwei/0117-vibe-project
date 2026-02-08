# AI 廣告素材產生器

利用 AI 快速生成廣告文案與圖片 Prompt 的 Google Apps Script Web App。

## 功能

1. **API 設定** — 支援 OpenAI (GPT-4o-mini) 與 Google AI (Gemini 2.0 Flash)
2. **專案設定** — 產品資訊、廣告目標、AI 受眾畫像生成
3. **文案生成** — 7 種風格、可選 3/5/8 組、含標題、內文、CTA
4. **圖片 Prompt 生成** — 產出可用於 Midjourney / DALL-E / Stable Diffusion 的英文 Prompt
5. **素材組合** — 手動/自動配對，建立 A/B 測試組合
6. **匯出結果** — 複製到剪貼簿、下載 CSV、寫入 Google Sheets

## 部署步驟

1. 前往 [script.google.com](https://script.google.com) 建立新專案
2. 將 `apps-script/Code.gs` 的內容貼入預設的 `Code.gs` 檔案
3. 點選左側 `+` 新增 HTML 檔案，命名為 `index`，將 `apps-script/index.html` 的內容貼入
4. 點選「部署」>「新增部署」
5. 類型選擇「網頁應用程式」
6. 執行身分：**自己**
7. 存取權限：**所有人**（或依需求設定）
8. 點選「部署」，取得 Web App URL
9. 開啟該 URL 即可使用

## 專案結構

```
apps-script/
  Code.gs      — Apps Script 後端（API 呼叫、Sheets 匯出）
  index.html   — 前端頁面（HTML + CSS + JS 全部內嵌）
```

## 技術架構

```
使用者瀏覽器
    │
    │ google.script.run
    ▼
Google Apps Script (後端)
    │
    ├─→ OpenAI API / Google AI API（文案 & 圖片 Prompt 生成）
    └─→ Google Sheets API（匯出結果）
```

所有 API 呼叫均透過 Apps Script 後端處理，API Key 不會暴露在前端。
