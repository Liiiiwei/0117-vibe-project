/**
 * AI 廣告素材產生器 - Google Apps Script 後端
 *
 * 部署步驟：
 * 1. 前往 https://script.google.com 建立新專案
 * 2. 建立以下檔案：
 *    - Code.gs（此檔案）
 *    - index.html（前端頁面）
 * 3. 點選「部署」>「新增部署」>「網頁應用程式」
 * 4. 執行身分：自己 / 存取權限：所有人
 * 5. 部署後取得 URL 即可使用
 */

// ============================================================
// Web App 入口
// ============================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('AI 廣告素材產生器')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// API Key 測試
// ============================================================

function testApiKey(provider, apiKey) {
  try {
    if (provider === 'openai') {
      var res = UrlFetchApp.fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': 'Bearer ' + apiKey },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) {
        throw new Error('OpenAI API 回傳錯誤 (' + res.getResponseCode() + ')');
      }
      return { success: true, message: 'OpenAI API 連線成功！' };
    } else if (provider === 'google') {
      var res = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey,
        { muteHttpExceptions: true }
      );
      if (res.getResponseCode() !== 200) {
        throw new Error('Google AI API 回傳錯誤 (' + res.getResponseCode() + ')');
      }
      return { success: true, message: 'Google AI API 連線成功！' };
    }
    throw new Error('不支援的 AI 服務提供者');
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ============================================================
// AI 文字生成（通用）
// ============================================================

function callTextAI(provider, apiKey, prompt) {
  if (provider === 'openai') {
    return callOpenAI_(apiKey, prompt);
  } else if (provider === 'google') {
    return callGoogleAI_(apiKey, prompt);
  }
  throw new Error('不支援的 AI 服務提供者：' + provider);
}

function callOpenAI_(apiKey, prompt) {
  var url = 'https://api.openai.com/v1/chat/completions';
  var payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: '你是一位資深的廣告行銷專家，擅長撰寫各種風格的廣告文案與圖片描述。請用繁體中文回覆。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 3000
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    var err = JSON.parse(response.getContentText());
    throw new Error(err.error ? err.error.message : 'OpenAI API 錯誤 (' + response.getResponseCode() + ')');
  }

  var data = JSON.parse(response.getContentText());
  return data.choices[0].message.content;
}

function callGoogleAI_(apiKey, prompt) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 3000 }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    var err = JSON.parse(response.getContentText());
    throw new Error(err.error ? err.error.message : 'Google AI API 錯誤 (' + response.getResponseCode() + ')');
  }

  var data = JSON.parse(response.getContentText());
  return data.candidates[0].content.parts[0].text;
}

// ============================================================
// 受眾畫像生成
// ============================================================

function generatePersona(provider, apiKey, productDescription, targetAudience, industry) {
  var industryPersonaDimensions = {
    'ecommerce': '6. 購物習慣（線上/線下偏好、常逛平台、衝動購物 vs 比價型）\n7. 促銷敏感度（對折扣/免運/限時的反應）\n',
    'online-course': '6. 學習習慣（偏好影片/文字、每日可學習時間、過去購課經驗）\n7. 技術接受度與自學能力\n',
    'local-service': '6. 地理生活圈（通勤範圍、常去區域、在地社群參與度）\n7. 服務選擇習慣（口碑導向/價格導向/便利導向）\n',
    'saas': '6. 技術接受度與工具使用習慣（現有軟體/流程/團隊規模）\n7. 決策流程（個人決策/團隊決策/需上級審批、採購預算週期）\n',
    'event': '6. 活動參與習慣（線上/線下偏好、社交型/學習型、過去參加過的類似活動）\n7. 資訊獲取管道（社群/電子報/KOL 推薦/口碑）\n'
  };

  var extraDimensions = industryPersonaDimensions[industry] || '';

  var prompt = '根據以下目標受眾描述，生成一份詳細的受眾畫像（Persona），包含：\n'
    + '1. 基本資料（年齡、性別、職業、收入）\n'
    + '2. 生活型態與價值觀\n'
    + '3. 主要痛點與需求\n'
    + '4. 購買動機與決策因素\n'
    + '5. 常用媒體管道與資訊來源\n'
    + extraDimensions + '\n'
    + '產品描述：' + productDescription + '\n'
    + '目標受眾描述：' + targetAudience + '\n\n'
    + '請以繁體中文回覆，使用條列式格式，內容具體實用。';

  return callTextAI(provider, apiKey, prompt);
}

// ============================================================
// 文案生成
// ============================================================

// 風格 × 漏斗智慧匹配矩陣（供前端提示用）
function getFunnelStyleMatrix() {
  return {
    tofu: {
      recommended: ['question', 'storytelling', 'emotional', 'humorous'],
      acceptable: ['professional', 'pain-point'],
      discouraged: ['urgent']
    },
    mofu: {
      recommended: ['professional', 'pain-point', 'storytelling'],
      acceptable: ['question', 'emotional', 'humorous'],
      discouraged: ['urgent']
    },
    bofu: {
      recommended: ['urgent', 'pain-point', 'professional'],
      acceptable: ['emotional', 'question'],
      discouraged: ['storytelling', 'humorous']
    }
  };
}

function generateAdCopy(provider, apiKey, projectData, style, count, funnel, hookAngle, adPlatform, existingHeadlines) {
  var styleMap = {
    professional: '專業可靠、數據支撐、語氣正式、引用權威來源',
    humorous: '幽默輕鬆、有趣味性、用比喻或反差製造笑點、容易引起共鳴',
    urgent: '緊迫感、限時限量、倒數計時、製造稀缺性、NOW or NEVER',
    question: '以問句開頭、引發思考、吸引注意、讓受眾在心中回答「對！」',
    'pain-point': '直擊痛點、描述困境的具體畫面、提供解決方案、引起共感',
    storytelling: '故事敘述、第一人稱或第三人稱敘事、場景描繪、引人入勝、有轉折',
    emotional: '情感訴求、溫馨感人、建立情感連結、觸動內心柔軟面'
  };

  // 廣告目標策略（影響 prompt 重點）
  var goalStrategies = {
    'brand-awareness':
      '【廣告目標策略：品牌認知】\n'
      + '重點：讓受眾記住品牌名稱和核心價值主張。\n'
      + '- headline 必須包含品牌名稱或品牌 slogan\n'
      + '- body 強調品牌故事、理念、獨特定位，而非促銷\n'
      + '- CTA 偏向軟性互動（追蹤我們、了解品牌故事、加入社群）\n'
      + '- 語調要有記憶點，可用 rhyme、對仗或金句\n',

    'traffic':
      '【廣告目標策略：網站流量】\n'
      + '重點：吸引點擊，讓受眾想進一步了解。\n'
      + '- headline 要製造「資訊落差」或「好奇心」，讓人想點進去\n'
      + '- body 給出部分有價值的資訊，但留下懸念引導點擊\n'
      + '- CTA 強調「了解更多」「看完整內容」「免費閱讀」\n'
      + '- 避免在文案中就把所有資訊講完\n',

    'leads':
      '【廣告目標策略：潛在客戶獲取】\n'
      + '重點：讓受眾願意留下聯絡資訊或預約諮詢。\n'
      + '- headline 強調免費資源或專業價值（免費白皮書/報告/諮詢/試用）\n'
      + '- body 建立專業信任感，說明留下資訊後能獲得什麼\n'
      + '- CTA 明確說出交換價值（免費索取、預約專人服務、領取限定資源）\n'
      + '- 降低個資焦慮：強調隱私保護、不騷擾\n',

    'conversions':
      '【廣告目標策略：銷售轉化】\n'
      + '重點：推動立即購買行為，消除最後猶豫。\n'
      + '- headline 要有明確的價值主張 + 優惠誘因\n'
      + '- body 組合：限時優惠 + 風險消除（退款保證/保固） + 社會證明（已售 N 件）\n'
      + '- CTA 直接且有急迫感（立即購買、馬上下單、限時搶購）\n'
      + '- 每組文案要針對不同的購買障礙（價格、信任、時機、需求確認）\n'
  };

  // 切角（Hook Angle）策略
  var hookAngleStrategies = {
    'price': '【切角：價格/優惠導向】\n以價格優勢為核心訴求：折扣、CP 值、省下多少錢、與競品價差。每組文案用不同的價格框架（原價 vs 特價、每日花費換算、投資報酬率）。\n',
    'quality': '【切角：品質/功能導向】\n以產品品質和功能為核心訴求：材質、技術、細節、使用體驗。每組文案凸顯不同的品質面向。\n',
    'social-proof': '【切角：社會證明導向】\n以他人認可為核心訴求：評價、銷量、名人推薦、媒體報導、用戶見證。每組文案用不同的社會證明類型。\n',
    'emotion': '【切角：情感共鳴導向】\n以情感連結為核心訴求：夢想、恐懼、歸屬感、自我認同。每組文案觸動不同的情感面向。\n',
    'scarcity': '【切角：稀缺性導向】\n以稀缺和急迫為核心訴求：限量、限時、獨家、季節限定、即將售完。每組文案用不同的稀缺框架。\n',
    'problem-solution': '【切角：問題解決導向】\n以解決痛點為核心訴求：先描述問題場景，再提出解決方案。每組文案針對不同的痛點場景。\n',
    'auto': '' // 自動分配，不指定
  };

  // 廣告平台規範
  var platformSpecs = {
    'facebook': '【投放平台：Facebook】\n'
      + '- headline 字數限制：25 字以內（超過會被截斷）\n'
      + '- body 字數：50-80 字為佳（太長會被「...更多」折疊）\n'
      + '- 語氣：可親近口語化，像朋友推薦\n'
      + '- 可使用 emoji 增加視覺吸引（每段最多 1-2 個）\n',
    'instagram': '【投放平台：Instagram】\n'
      + '- headline 字數限制：20 字以內\n'
      + '- body 字數：30-60 字（IG 用戶注意力短，簡潔有力）\n'
      + '- 語氣：潮流感、視覺導向、年輕化\n'
      + '- 適合使用 hashtag 風格的關鍵字\n',
    'google-ads': '【投放平台：Google Ads】\n'
      + '- headline 字數限制：15 字以內（Google 搜尋廣告）\n'
      + '- body（說明文字）：45 字以內\n'
      + '- 語氣：精準、直接、包含搜尋關鍵字\n'
      + '- 必須清楚傳達價值主張，不能模糊\n',
    'line': '【投放平台：LINE 廣告】\n'
      + '- headline 字數限制：20 字以內\n'
      + '- body 字數：40-75 字\n'
      + '- 語氣：親切、生活化、像鄰居推薦\n'
      + '- 台灣在地用語，避免太正式\n',
    'general': '' // 通用，不加平台規範
  };

  // 各產業專屬文案架構
  var industryFrameworks = {
    'ecommerce':
      '【電商產品文案架構】\n'
      + '你是一位專精電商轉化的廣告文案專家，熟悉台灣電商市場。\n'
      + '文案必須遵循以下架構：\n'
      + '- headline 必須包含「產品核心賣點」或「具體數字/折扣」來吸引點擊\n'
      + '- body 結構：賣點差異化 → 社會證明（銷量/評價/媒體推薦） → 限時優惠或促購誘因（免運/退換貨保障）\n'
      + '- call_to_action 要有急迫感，如「限時搶購」「立即加入購物車」「最後 XX 組」\n'
      + '- 每組文案要針對不同的購買動機（價格、品質、從眾、稀缺）\n',

    'online-course':
      '【線上課程文案架構】\n'
      + '你是一位專精知識付費行銷的廣告文案專家。\n'
      + '文案必須遵循以下架構：\n'
      + '- headline 要直擊學員痛點或呈現學習後的理想成果\n'
      + '- body 結構：痛點共鳴（現狀問題） → 成果承諾（學完能做到什麼） → 信任背書（講師資歷/學員數/見證）\n'
      + '- call_to_action 要降低決策門檻，如「免費試看」「0 元先修」「立即報名享早鳥價」\n'
      + '- 每組文案要針對不同痛點角度（時間不夠、學不會、太貴、不確定有沒有用）\n',

    'local-service':
      '【線下服務文案架構】\n'
      + '你是一位專精在地服務行銷的廣告文案專家，熟悉台灣消費者習慣。\n'
      + '文案必須遵循以下架構：\n'
      + '- headline 要營造體驗感或結合地理位置優勢\n'
      + '- body 結構：服務體驗描述（感官/情境） → 專業度/口碑佐證（評分/回頭率/年資） → 到店誘因（首次優惠/限定體驗）\n'
      + '- call_to_action 要引導預約行動，如「立即預約」「LINE 私訊享優惠」「到店出示享 9 折」\n'
      + '- 每組文案要針對不同到店動機（嘗鮮、送禮、犒賞自己、解決問題）\n',

    'saas':
      '【SaaS / 軟體服務文案架構】\n'
      + '你是一位專精 B2B / SaaS 行銷的廣告文案專家。\n'
      + '文案必須遵循以下架構：\n'
      + '- headline 要量化效率提升或用具體數據吸引決策者\n'
      + '- body 結構：工作痛點（效率低/流程亂） → 解決方案價值（省時/省錢/數據化） → 信任佐證（客戶數/企業案例/安全認證）\n'
      + '- call_to_action 要零門檻體驗，如「免費試用 14 天」「立即申請 Demo」「免綁約立即啟用」\n'
      + '- 每組文案要針對不同決策者角色（老闆看 ROI、主管看效率、使用者看易用性）\n',

    'event':
      '【活動/展覽文案架構】\n'
      + '你是一位專精活動行銷的廣告文案專家。\n'
      + '文案必須遵循以下架構：\n'
      + '- headline 要製造 FOMO（錯過可惜）或突出亮點陣容/獨家內容\n'
      + '- body 結構：活動亮點（講者/內容/體驗） → 稀缺性（限額/倒數/獨家） → 參加價值（能獲得什麼/人脈/知識）\n'
      + '- call_to_action 要有時間急迫感，如「早鳥倒數 3 天」「限額 100 位」「立即搶位」\n'
      + '- 每組文案要針對不同參加動機（學習成長、社交人脈、體驗獨家、怕錯過）\n'
  };

  // 漏斗階段策略
  var funnelFrameworks = {
    'tofu':
      '【上層漏斗 TOFU — 認知階段】\n'
      + '受眾狀態：完全不認識品牌/產品，是陌生流量。\n'
      + '文案策略：\n'
      + '- headline 要用「共鳴」或「好奇」吸引停留，避免直接推銷\n'
      + '- body 重點放在引發興趣、點出受眾痛點或理想場景，不需急著介紹產品細節\n'
      + '- CTA 要軟性、低門檻，例如：「了解更多」「看看這個」「領取免費指南」「一分鐘測驗」\n',

    'mofu':
      '【中層漏斗 MOFU — 考慮階段】\n'
      + '受眾狀態：已對品牌/產品有印象，正在比較評估。\n'
      + '文案策略：\n'
      + '- headline 要突出「差異化價值」或「社會證明」來建立信任\n'
      + '- body 重點放在產品優勢、客戶見證、與競品差異，幫助受眾做出判斷\n'
      + '- CTA 要提供深入了解的機會，例如：「免費試用」「索取完整方案」「預約諮詢」「下載案例」\n',

    'bofu':
      '【下層漏斗 BOFU — 轉化階段】\n'
      + '受眾狀態：已充分了解，猶豫是否要行動。\n'
      + '文案策略：\n'
      + '- headline 要製造「急迫感」或「最後推力」，消除猶豫\n'
      + '- body 重點放在限時優惠、風險保障（退款/保固）、行動後的立即好處\n'
      + '- CTA 要直接且有急迫感，例如：「立即購買」「馬上報名」「限時 5 折」「今天下單享免運」\n'
  };

  var industry = projectData.industry || '';
  var frameworkPrompt = industryFrameworks[industry] || '你是一位資深廣告文案專家。\n';
  var funnelPrompt = funnelFrameworks[funnel] || '';
  var goalPrompt = goalStrategies[projectData.adGoal] || '';
  var hookPrompt = hookAngleStrategies[hookAngle] || '';
  var platformPrompt = platformSpecs[adPlatform] || '';

  // 去重：將已生成的標題注入 prompt
  var dedupPrompt = '';
  if (existingHeadlines && existingHeadlines.length > 0) {
    var headlines = existingHeadlines.slice(-20); // 最多取最近 20 筆避免 token 浪費
    dedupPrompt = '\n【重要 - 避免重複】\n以下是已經生成過的文案標題，新生成的文案必須使用完全不同的切角、句式和用詞，嚴禁與以下標題相似：\n'
      + headlines.map(function(h, i) { return (i + 1) + '. ' + h; }).join('\n') + '\n';
  }

  var prompt = frameworkPrompt + '\n' + funnelPrompt + '\n' + goalPrompt + '\n' + hookPrompt + '\n' + platformPrompt
    + '\n請根據以下資訊，生成 ' + count + ' 組廣告文案。\n\n'
    + '產品名稱：' + projectData.productName + '\n'
    + '產品描述：' + projectData.productDescription + '\n'
    + '廣告目標：' + (projectData.adGoal || '') + '\n'
    + '目標受眾：' + projectData.targetAudience + '\n'
    + '核心賣點：' + projectData.keySellingPoints + '\n'
    + '文案風格：' + (styleMap[style] || style) + '\n\n'
    + dedupPrompt
    + '\n每組文案必須包含：\n'
    + '1. headline：標題，20 字以內，吸引眼球\n'
    + '2. body：內文，50-100 字，說明產品價值\n'
    + '3. call_to_action：提供 3 個不同方向的 CTA 選項（JSON 陣列），每個 5-10 字\n\n'
    + '重要：每組文案之間切角要有明顯差異，不要重複類似的表達方式。\n\n'
    + '請以 JSON 陣列格式回覆，例如：\n'
    + '[{"headline":"...","body":"...","call_to_action":["CTA選項1","CTA選項2","CTA選項3"]}]\n\n'
    + '請只回覆 JSON 陣列，不要包含其他文字或 markdown 標記。';

  var result = callTextAI(provider, apiKey, prompt);
  return result;
}

// ============================================================
// 圖片 Prompt 生成
// ============================================================

function generateImagePrompts(provider, apiKey, projectData, imageStyle, description, count, copyContext) {
  var styleNames = {
    minimalist: '極簡風格 (Minimalist)',
    tech: '科技感 (Tech/Futuristic)',
    warm: '溫馨自然 (Warm/Natural)',
    bold: '大膽鮮明 (Bold/Vibrant)',
    elegant: '優雅精緻 (Elegant/Premium)',
    lifestyle: '生活場景 (Lifestyle)'
  };

  // 文案對齊：如果有文案上下文，注入視覺方向
  var copyAlignPrompt = '';
  if (copyContext && copyContext.length > 0) {
    copyAlignPrompt = '\n【文案對齊 — 視覺需配合以下文案方向】\n'
      + '已生成的廣告文案摘要如下，圖片風格需與文案調性一致：\n'
      + copyContext.slice(0, 5).map(function(c, i) {
          return (i + 1) + '. 「' + c.headline + '」— ' + (c.funnel === 'tofu' ? '認知階段' : c.funnel === 'mofu' ? '考慮階段' : '轉化階段');
        }).join('\n')
      + '\n請確保圖片的情緒氛圍和場景設定能搭配上述文案使用。\n';
  }

  var prompt = '你是一位專業的廣告視覺設計總監，擅長撰寫 AI 圖像生成 Prompt。\n\n'
    + '請根據以下資訊，生成 ' + count + ' 組可直接用於 Midjourney / DALL-E / Stable Diffusion 的圖片生成 Prompt。\n\n'
    + '產品名稱：' + projectData.productName + '\n'
    + '產品描述：' + projectData.productDescription + '\n'
    + '目標受眾：' + projectData.targetAudience + '\n'
    + '期望風格：' + (styleNames[imageStyle] || imageStyle) + '\n'
    + '補充描述：' + (description || '無') + '\n'
    + copyAlignPrompt + '\n'
    + '每組 Prompt 必須包含：\n'
    + '1. prompt_en：英文 Prompt（80-120 字），包含場景、構圖、色調、光線、元素、風格關鍵字\n'
    + '2. prompt_zh：上述 Prompt 的繁體中文翻譯/說明\n'
    + '3. scene_description：場景簡述（繁體中文，20 字內）\n'
    + '4. suggested_platform：建議使用的圖片生成平台（Midjourney / DALL-E / Stable Diffusion）\n'
    + '5. aspect_ratio：建議的圖片比例（如 1:1, 16:9, 9:16, 4:5）\n\n'
    + '請以 JSON 陣列格式回覆，例如：\n'
    + '[{"prompt_en":"...","prompt_zh":"...","scene_description":"...","suggested_platform":"...","aspect_ratio":"..."}]\n\n'
    + '請只回覆 JSON 陣列，不要包含其他文字或 markdown 標記。';

  var result = callTextAI(provider, apiKey, prompt);
  return result;
}

// ============================================================
// Google Sheets 匯出
// ============================================================

function exportToGoogleSheet(sheetId, exportData) {
  try {
    var spreadsheet = SpreadsheetApp.openById(sheetId);
    var sheet = spreadsheet.getSheetByName('AI廣告素材');

    if (!sheet) {
      sheet = spreadsheet.insertSheet('AI廣告素材');
    }

    sheet.clear();

    // === 文案區 ===
    sheet.getRange(1, 1).setValue('【AI 生成文案】');
    sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold').setFontColor('#4F46E5');

    var copyHeaders = ['編號', '漏斗階段', '風格', '標題', '內文', 'CTA 選項'];
    sheet.getRange(2, 1, 1, copyHeaders.length).setValues([copyHeaders]);
    sheet.getRange(2, 1, 1, copyHeaders.length)
      .setFontWeight('bold').setBackground('#4F46E5').setFontColor('#FFFFFF');

    if (exportData.copies && exportData.copies.length > 0) {
      var copyRows = exportData.copies.map(function(c, i) {
        return [i + 1, c.funnel || '', c.style || '', c.headline || '', c.body || '', c.cta || ''];
      });
      sheet.getRange(3, 1, copyRows.length, copyHeaders.length).setValues(copyRows);
    }

    // === 圖片 Prompt 區 ===
    var promptStartRow = (exportData.copies ? exportData.copies.length : 0) + 5;
    sheet.getRange(promptStartRow, 1).setValue('【AI 生成圖片 Prompt】');
    sheet.getRange(promptStartRow, 1).setFontSize(14).setFontWeight('bold').setFontColor('#7C3AED');

    var promptHeaders = ['編號', '場景', '英文 Prompt', '中文說明', '建議平台', '建議比例'];
    sheet.getRange(promptStartRow + 1, 1, 1, promptHeaders.length).setValues([promptHeaders]);
    sheet.getRange(promptStartRow + 1, 1, 1, promptHeaders.length)
      .setFontWeight('bold').setBackground('#7C3AED').setFontColor('#FFFFFF');

    if (exportData.imagePrompts && exportData.imagePrompts.length > 0) {
      var promptRows = exportData.imagePrompts.map(function(p, i) {
        return [i + 1, p.scene_description || '', p.prompt_en || '', p.prompt_zh || '', p.suggested_platform || '', p.aspect_ratio || ''];
      });
      sheet.getRange(promptStartRow + 2, 1, promptRows.length, promptHeaders.length).setValues(promptRows);
    }

    // === 素材組合區 ===
    var comboStartRow = promptStartRow + (exportData.imagePrompts ? exportData.imagePrompts.length : 0) + 4;
    sheet.getRange(comboStartRow, 1).setValue('【素材組合（A/B 測試）】');
    sheet.getRange(comboStartRow, 1).setFontSize(14).setFontWeight('bold').setFontColor('#059669');

    var comboHeaders = ['組合名稱', '文案標題', '文案內文', 'CTA', '圖片 Prompt (EN)', '圖片場景'];
    sheet.getRange(comboStartRow + 1, 1, 1, comboHeaders.length).setValues([comboHeaders]);
    sheet.getRange(comboStartRow + 1, 1, 1, comboHeaders.length)
      .setFontWeight('bold').setBackground('#059669').setFontColor('#FFFFFF');

    if (exportData.combinations && exportData.combinations.length > 0) {
      var comboRows = exportData.combinations.map(function(c) {
        return [c.name || '', c.headline || '', c.body || '', c.cta || '', c.imagePromptEn || '', c.imageScene || ''];
      });
      sheet.getRange(comboStartRow + 2, 1, comboRows.length, comboHeaders.length).setValues(comboRows);
    }

    // 時間戳記
    var tsRow = comboStartRow + (exportData.combinations ? exportData.combinations.length : 0) + 4;
    sheet.getRange(tsRow, 1).setValue('匯出時間：' + new Date().toLocaleString('zh-TW'));
    sheet.getRange(tsRow, 1).setFontColor('#6B7280').setFontStyle('italic');

    // 自動調整欄寬
    for (var i = 1; i <= 6; i++) {
      sheet.autoResizeColumn(i);
    }

    return { success: true, message: '已成功寫入 Google Sheets！' };
  } catch (e) {
    return { success: false, message: '寫入失敗：' + e.message };
  }
}

// ============================================================
// 建立新的 Google Sheet
// ============================================================

function createNewSheet() {
  try {
    var ss = SpreadsheetApp.create('AI 廣告素材 - ' + new Date().toLocaleDateString('zh-TW'));
    return { success: true, sheetId: ss.getId(), url: ss.getUrl() };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
