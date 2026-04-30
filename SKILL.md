---
name: biochem-quiz-web 操作說明
description: 中國醫藥大學-醫技系 臨床生化／生化國考題庫網站（Next.js 16 + Prisma 6 + Auth.js v5 + OpenAI），部署在 https://biochem-quiz-web.vercel.app
type: project
---

# biochem-quiz-web

中國醫藥大學-醫技系 臨床生化／生化國考題庫練習平台。

> **線上網址**：https://biochem-quiz-web.vercel.app
> **資料庫**：Prisma Postgres（Vercel Marketplace integration `prisma-postgres-camel-dog`）
> **題庫**：1350 題（106-2 ~ 114-2 國考），預先生成 1360 筆 OpenAI Verified 解析

---

## 快速指令

```bash
# 開發
npm run dev                    # localhost:3000

# 部署（會自動 prisma generate + next build）
vercel deploy --prod
vercel alias set <new-deploy-url> biochem-quiz-web.vercel.app
# ↑ 一定要手動 alias！這個 Vercel 專案沒接 Git，預設不會自動更新公開域名

# 環境變數
vercel env pull .env.local --environment production    # 拉最新環境變數

# 資料庫
npx prisma db push                                      # 推 schema 變更
npx prisma db pull                                      # 從現有 DB 反向產出 schema
npx prisma generate                                     # 產生 Prisma Client
npx prisma studio                                       # 視覺化 DB 管理（localhost:5555）
```

---

## 技術棧

| 元件 | 版本 / 用法 |
|------|------------|
| **Next.js** | 16.2.4（App Router + Turbopack） |
| **React** | 19.2.4 |
| **TypeScript** | ^5 |
| **Tailwind v4** | （已 PostCSS 安裝但未使用，全部用原版 CSS） |
| **Prisma** | 6.19.3（不要升 7，Prisma Postgres 在 7 需要 accelerateUrl 麻煩） |
| **Auth.js** | v5 (next-auth@beta)，Google OAuth，JWT session |
| **OpenAI SDK** | gpt-4o-mini（環境變數 `OPENAI_API_KEY`） |
| **Vercel** | 部署平台、Prisma Postgres integration |

---

## 資料夾結構

```
biochem_test/
├── app/
│   ├── _components/
│   │   ├── QuestionCard.tsx          # ★ 共用題目卡片（exam + wrong-questions 都用）
│   │   └── ResumeBanner.tsx          # 首頁的「繼續上次練習」橫幅
│   ├── admin/
│   │   ├── page.tsx                  # 後台主頁（管理者限定）
│   │   ├── reports-panel.tsx         # 題目回報卡片列表（可展開看完整題目）
│   │   ├── error-rate-ranking.tsx    # 錯誤率排行（可展開看解析）
│   │   └── reset-all-button.tsx      # 危險區重置按鈕
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth handler
│   │   ├── admin/
│   │   │   ├── clear-reports/route.ts    # 清除全部回報
│   │   │   ├── delete-reports/route.ts   # 刪除特定回報（接受 {ids} 或 {reportId}）
│   │   │   └── reset-all/route.ts        # 全站作答資料重置
│   │   ├── attempt-batch/route.ts        # ★ 批次儲存作答（每筆 examSeed，server 端算 is_correct）
│   │   ├── exam-finish/route.ts          # 考試結算
│   │   ├── explain/route.ts              # ★ AI 解釋（先讀 question_explanations）
│   │   ├── history/reset/route.ts        # 個人歷史重置
│   │   ├── practice/clear/route.ts       # 清除特定 seed 的練習進度
│   │   ├── report/route.ts               # 使用者回報題目
│   │   └── wrong-questions/reset/route.ts # 個人錯題重置
│   ├── exam/
│   │   ├── page.tsx                  # ★ Server component（auth + prefill 過往作答）
│   │   └── exam-client.tsx           # ★ 練習/考試模式 UI（含 result screen）
│   ├── history/
│   │   ├── page.tsx                  # 作答紀錄頁
│   │   ├── history-reset.tsx         # 清除紀錄按鈕
│   │   └── trend-chart.tsx           # ★ SVG 趨勢圖
│   ├── login/
│   │   ├── page.tsx
│   │   └── login-button.tsx
│   ├── wrong-questions/
│   │   ├── page.tsx                  # 錯題練習頁
│   │   └── wrong-questions-client.tsx
│   ├── globals.css                   # ★ 全部用 CSS variables，不用 Tailwind classes
│   ├── layout.tsx                    # 含 SessionProvider
│   ├── page.tsx                      # 首頁
│   └── providers.tsx                 # SessionProvider wrapper
├── lib/
│   ├── admin.ts                      # 管理者 email 名單
│   ├── prisma.ts                     # PrismaClient singleton
│   └── questions.ts                  # ★ 從 data/questions.json 載題庫 + 種子隨機抽題
├── data/
│   └── questions.json                # ★ 1350 題完整題庫（912 KB）
├── public/exam-images/               # 7 題附圖（部分 production 是 404）
├── prisma/schema.prisma              # 5 個 model
├── auth.ts                           # NextAuth v5 設定
├── package.json
└── SKILL.md                          # 本檔案
```

---

## 資料模型（Prisma schema）

```prisma
// 使用者答題紀錄（核心 table）
model attempts {
  id              BigInt    @id @default(autoincrement())
  user_email      String?    // 用 email 識別使用者，沒有獨立 user table
  exam_seed       String?    // 考試 seed；練習模式 prefix p_<seed>
  question_id     String     // 對應 data/questions.json 的 id
  selected_answer String?
  correct_answer  String?
  is_correct      Int?       // 1 or 0（server 端計算，不信任 client）
  guessed         Int?       @default(0)  // ★ 「猜的」標記
  created_at      DateTime?
}

// 考試會話（只有 exam mode 才會寫）
model exam_sessions {
  exam_seed       String    @id
  user_email      String?
  elapsed_seconds Int?
  created_at      DateTime?
}

// ★ 預先生成的解析（1360 筆 OpenAI Verified）
// /api/explain 必須優先讀這張表，找不到才打 OpenAI
model question_explanations {
  question_id        String    @id
  answer_text        String?
  reason_text        String?
  wrong_options_text String?
  key_point_text     String?
  source_text        String?      // 例如 "[OpenAI Verified] 110-2 第46題"
  status             String?   @default("draft")   // draft / generated 才有效
  created_at         DateTime?
  updated_at         DateTime?
}

// AI 解釋快取（即時生成的存這裡）
model ai_explanations {
  question_id   String    @id
  prompt        String
  response_text String
  provider      String?   // "openai"
  created_at    DateTime?
}

// 使用者回報題目錯誤
model question_reports {
  id          BigInt    @id @default(autoincrement())
  question_id String?
  user_email  String?
  content     String
  created_at  DateTime?
}
```

⚠️ **沒有 `users` table**，使用者完全用 `user_email` 識別。NextAuth 用 JWT session 不存 DB。

---

## 題目資料結構

`data/questions.json` 是 1350 題的陣列，每題：

```ts
{
  id: "111-1-80",                                      // <yearTerm>-<questionNo>
  subject: "生物化學與臨床生化學",
  yearTerm: "111-1",                                    // 民國年-期
  questionNo: 80,
  question: "美國 CDC 建議孩童血中鉛濃度不可超過多少 μg/dL？",
  options: { A: "5 μg/dL", B: "15 μg/dL", C: "30 μg/dL", D: "60 μg/dL" },
  optionImages: {},                                    // 部分題目選項有圖
  answer: "A",
  correctionNote: "",                                  // 國考答案修正附註（如「答A、C給分」）
  image: "",
  imageUrl: "",                                        // /exam-images/xxx.png
  imageType: "none",
  source: { workbook: "...xlsx", sheet: "111-1" }
}
```

題庫涵蓋：106-2 / 107-1 / 107-2 / 108-1 / 108-2 / 109-1 / 109-2 / 110-1 / 110-2 / 111-1 / 111-2 / 112-1 / 112-2 / 113-1 / 113-2 / 114-1 / 114-2，每場約 80 題。

---

## 重要環境變數

| 變數 | 用途 |
|------|------|
| `DATABASE_URL` | Prisma Postgres 連線（使用） |
| `POSTGRES_URL` | 同上（Vercel auto） |
| `PRISMA_DATABASE_URL` | 同上（Vercel auto） |
| `NEXTAUTH_SECRET` | NextAuth JWT 加密 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `OPENAI_API_KEY` | AI 解釋呼叫（gpt-4o-mini） |
| `GEMINI_API_KEY` | （備用，目前未使用） |
| `OPENAI_MODEL` | 可覆寫預設模型，省略時用 `gpt-4o-mini` |
| `ADMIN_EMAILS` | 逗號分隔；不設則 fallback 到 `chenyc0901@gmail.com` |

OAuth callback 設定在 Google Cloud Console：
`https://biochem-quiz-web.vercel.app/api/auth/callback/google`

---

## 功能模組

### 練習模式 `/exam?seed=...&mode=practice`
- ✅ 每題按「提交答案」立即顯示對錯 + 修正附註
- ✅ **自動儲存**：每按一次提交答案就 POST 一筆到 `attempts`，中途離開不會掉
- ✅ **可接續**：同 seed 重進會 prefill 已答題目，跳到第一題未答
- ✅ AI 解釋（5 段：正確答案 / 為什麼對 / 其他選項錯在哪 / 重點觀念 / 記憶重點）
- ✅ 「🎲 猜的」checkbox：勾選後即使選對也會收進錯題本
- ✅ 快速跳題下拉選單（顯示 ✅/❌/●/○）
- ✅ 1.25 分/題 × 80 題 = 滿分 100

### 考試模式 `/exam?seed=...&mode=exam`
- ✅ 點選項後 350ms 自動跳下一題
- ✅ 不顯示即時對錯
- ✅ 計時器（90 分鐘 = 5400 秒過後變紅）
- ✅ 「🎲 猜的」一樣可勾
- ✅ 交卷才寫入 DB（批次 `/api/attempt-batch` + `/api/exam-finish` 寫 exam_sessions）
- ✅ 結果頁：紫色漸層 result-card + 答對/答錯/未答 + 錯題列表（可重答 + AI 解釋）

### 作答紀錄 `/history`
- 4 格統計：總作答 / 總答對 / 累計正確率 / 完成考試場次
- **趨勢圖**：自製 SVG 折線圖，最近 20 場 exam（紫線+面積+60 分及格紅虛線）
- 詳細列表：分練習/考試 badge、分數、用時

### 錯題練習 `/wrong-questions`
- 收錄條件：`is_correct=0` OR `guessed=1`（猜對的題目也會收）
- 上方統計：收錄題數 / 答錯次數 / 🎲 猜的次數
- 每題可摺疊展開重做（共用 `QuestionCard`）+ AI 解釋

### 後台 `/admin`（chenyc0901@gmail.com 限定）
1. **📩 題目回報**：可摺疊卡片，展開後顯示完整題目 + 選項 + 修正附註 + 預先驗證解析；支援搜尋、多選刪除、清除全部
2. **👥 使用者答題狀況**：表格列出每位使用者的總作答 / 對 / 錯 / 🎲 猜 / 正確率 / 考試場次 / 最近活動
3. **🔥 錯誤率排行**：≥ 3 次作答的前 20 題，可展開看完整題目 + 選項 + 解析
4. **📊 系統統計**：累計使用者 / 累計作答 / 完成考試場次 / 題庫題數
5. **⚠️ 危險操作**：摺疊收起，重置全站作答資料

---

## 關鍵 API 契約

### `POST /api/attempt-batch`
```jsonc
{
  "attempts": [
    {
      "questionId": "111-1-80",
      "selectedAnswer": "A",
      "correctAnswer": "A",
      "examSeed": "p_xyz123",   // 練習用 p_ prefix，考試用原始 seed
      "guessed": 0              // 0 / 1
    }
  ]
}
```
Server 端會自動計算 `is_correct`（不信任 client 的值）。

### `POST /api/explain`
```jsonc
{
  "prompt": "完整準備好的 prompt（可選）",
  "question": { /* full question 物件 */ },
  "questionId": "111-1-80"
}
```

回傳：
```jsonc
{
  "text": "解釋內容",
  "source": "curated"   // curated（DB 預先驗證） / cache（AI 快取）/ live（即時生成）
}
```

**讀取優先序**：
1. `question_explanations`（status ≠ draft 且有 `reason_text` 或 `answer_text`）→ 組成 5 段格式回傳
2. `ai_explanations` cache（同 question_id）
3. 都沒有才打 OpenAI，並把結果寫進 `ai_explanations`

### `POST /api/report`
```jsonc
{
  "questionId": "111-1-80",
  "content": "答案應該是 A 才對..."
}
```

### `POST /api/practice/clear`
```jsonc
{ "seed": "abc123" }    // 會刪除 exam_seed = p_abc123 的所有作答
```

---

## UI / 顏色約定

`app/globals.css` 採用 CSS variables，不要混入 Tailwind classes：

```css
--bg: #f5f7fb       /* 頁面背景 */
--card: #fff        /* 卡片背景 */
--text: #111827
--muted: #6b7280
--primary: #2563eb  /* 藍 */
--good: #15803d     /* 綠 */
--bad: #b91c1c      /* 紅 */
--border: #dbe3f0
```

特殊元件：
- `.mode-card` 黑底 `#1a1a1a`（首頁練習卡）
- `.mode-card-exam` 紫底 `#1a0d2e`（首頁考試卡）
- `.btn-exam` 紫色 `#7c3aed`
- `.result-card` 紫色漸層（exam 結果頁的大卡片）
- `.option / .option.correct / .option.wrong / .option.selected` 選項配色

---

## 常見維護情境

### 新增管理者
編輯 Vercel 環境變數 `ADMIN_EMAILS`：
```
ADMIN_EMAILS=chenyc0901@gmail.com,new-admin@example.com
```
不需重新部署，下一次 request 就會生效（auth.ts 在 request 時讀）。

### 新增題目年份（例如 115-1 出來時）
1. 把新題目併入 `data/questions.json`（保持原 schema）
2. （可選）為新題目產生 `question_explanations` 解析寫進 DB
3. `vercel deploy --prod`

### 修改 AI 解釋的 prompt 模板
編輯 `app/_components/QuestionCard.tsx` 的 `fetchExplain` 函式（client 端組 prompt）和 `app/api/explain/route.ts` 的 fallback prompt。

### 改 OpenAI model
設環境變數 `OPENAI_MODEL=gpt-4o`（或其他），不需改 code。

### 趨勢圖只想看特定範圍
編輯 `app/history/page.tsx` 的 `trendData` 計算（目前抓最近 20 場 exam）。

---

## 已知限制 / 未做（stage 2 候選）

- 題目附圖 `/exam-images/*.png` 在 production 是 404（7 題受影響）
- 沒有題庫年份/科別篩選 UI（首頁直接隨機抽 80 題）
- 沒有 SRS 間隔重複（FSRS / SM-2）演算法的錯題排程
- 沒有班級排行榜
- 沒有 PWA 離線模式
- 沒有模擬考成績單 PDF 匯出

---

## 故障排除

| 症狀 | 排查 |
|------|------|
| AI 解釋回傳「AI 服務暫時無法使用」 | 看 `vercel logs`，多半是 OPENAI_API_KEY 額度或 quota |
| 部署後 biochem-quiz-web.vercel.app 還是舊版 | 忘了跑 `vercel alias set <new-url> biochem-quiz-web.vercel.app` |
| Prisma 報 `accelerateUrl` 錯 | 檢查 `@prisma/client` 是否被升到 7（要鎖在 6） |
| 登入後 callback 失敗 | Google Cloud Console 的 redirect URI 有沒有對到 https domain |
| 作答紀錄趨勢圖空白 | 還沒完成過 exam mode（趨勢圖只看 exam，不看 practice） |
| 練習模式答完 80 題回去發現紀錄沒了 | 確認 `exam_seed = p_<seed>` 在 DB；可能是登入身分不一樣 |

---

## 歷史脈絡

- 原始版本：Python（`quiz_app.py`），程式碼在 GitHub `chenyc0901/biochem_test` repo 的 main 分支
- Next.js 版本：2026-04 從零重建（原始 Next.js source code 已遺失，題庫用 React Flight payload 從線上 scrape 回來）
- 重建時資料庫沒動 → 21 位舊使用者的 8273 筆作答紀錄 + 1360 筆預先生成解析全部保留

---

## Vercel 專案資訊

- **Team**: `chenyc0901-1119s-projects`
- **Project ID**: `prj_bFZzkcS5IjHjm0JVp1vTPEJYjxcR`
- **整合**: Prisma Postgres `prisma-postgres-camel-dog`
- **Domain**: `biochem-quiz-web.vercel.app`（**不是** auto-aliased，每次部署要手動 set alias）
