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

function generatePersona(provider, apiKey, productDescription, targetAudience) {
  var prompt = '根據以下目標受眾描述，生成一份詳細的受眾畫像（Persona），包含：\n'
    + '1. 基本資料（年齡、性別、職業、收入）\n'
    + '2. 生活型態與價值觀\n'
    + '3. 主要痛點與需求\n'
    + '4. 購買動機與決策因素\n'
    + '5. 常用媒體管道與資訊來源\n\n'
    + '產品描述：' + productDescription + '\n'
    + '目標受眾描述：' + targetAudience + '\n\n'
    + '請以繁體中文回覆，使用條列式格式，內容具體實用。';

  return callTextAI(provider, apiKey, prompt);
}

// ============================================================
// 文案生成
// ============================================================

function generateAdCopy(provider, apiKey, projectData, style, count) {
  var styleMap = {
    professional: '專業可靠、數據支撐、語氣正式',
    humorous: '幽默輕鬆、有趣味性、容易引起共鳴',
    urgent: '緊迫感、限時限量、製造稀缺性',
    question: '以問句開頭、引發思考、吸引注意',
    'pain-point': '直擊痛點、提供解決方案、引起共感',
    storytelling: '故事敘述、場景描繪、引人入勝',
    emotional: '情感訴求、溫馨感人、建立連結'
  };

  var goalMap = {
    'brand-awareness': '品牌認知',
    'traffic': '網站流量',
    'leads': '潛在客戶獲取',
    'conversions': '銷售轉化'
  };

  var prompt = '你是一位資深廣告文案專家。請根據以下資訊，生成 ' + count + ' 組廣告文案。\n\n'
    + '產品名稱：' + projectData.productName + '\n'
    + '產品描述：' + projectData.productDescription + '\n'
    + '廣告目標：' + (goalMap[projectData.adGoal] || projectData.adGoal) + '\n'
    + '目標受眾：' + projectData.targetAudience + '\n'
    + '核心賣點：' + projectData.keySellingPoints + '\n'
    + '文案風格：' + (styleMap[style] || style) + '\n\n'
    + '每組文案必須包含：\n'
    + '1. headline：標題，20 字以內，吸引眼球\n'
    + '2. body：內文，50-100 字，說明產品價值\n'
    + '3. call_to_action：行動呼籲，5-10 字\n\n'
    + '請以 JSON 陣列格式回覆，例如：\n'
    + '[{"headline":"...","body":"...","call_to_action":"..."}]\n\n'
    + '請只回覆 JSON 陣列，不要包含其他文字或 markdown 標記。';

  var result = callTextAI(provider, apiKey, prompt);
  return result;
}

// ============================================================
// 圖片 Prompt 生成
// ============================================================

function generateImagePrompts(provider, apiKey, projectData, imageStyle, description, count) {
  var styleNames = {
    minimalist: '極簡風格 (Minimalist)',
    tech: '科技感 (Tech/Futuristic)',
    warm: '溫馨自然 (Warm/Natural)',
    bold: '大膽鮮明 (Bold/Vibrant)',
    elegant: '優雅精緻 (Elegant/Premium)',
    lifestyle: '生活場景 (Lifestyle)'
  };

  var prompt = '你是一位專業的廣告視覺設計總監，擅長撰寫 AI 圖像生成 Prompt。\n\n'
    + '請根據以下資訊，生成 ' + count + ' 組可直接用於 Midjourney / DALL-E / Stable Diffusion 的圖片生成 Prompt。\n\n'
    + '產品名稱：' + projectData.productName + '\n'
    + '產品描述：' + projectData.productDescription + '\n'
    + '目標受眾：' + projectData.targetAudience + '\n'
    + '期望風格：' + (styleNames[imageStyle] || imageStyle) + '\n'
    + '補充描述：' + (description || '無') + '\n\n'
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

    var copyHeaders = ['編號', '風格', '標題', '內文', 'CTA'];
    sheet.getRange(2, 1, 1, copyHeaders.length).setValues([copyHeaders]);
    sheet.getRange(2, 1, 1, copyHeaders.length)
      .setFontWeight('bold').setBackground('#4F46E5').setFontColor('#FFFFFF');

    if (exportData.copies && exportData.copies.length > 0) {
      var copyRows = exportData.copies.map(function(c, i) {
        return [i + 1, c.style || '', c.headline || '', c.body || '', c.cta || ''];
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
