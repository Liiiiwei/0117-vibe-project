/**
 * Google Apps Script 後端 - AI 廣告素材產生器
 *
 * 部署步驟：
 * 1. 前往 script.google.com 建立新專案
 * 2. 將此檔案內容貼入編輯器
 * 3. 點選「部署」>「新增部署」
 * 4. 選擇「網頁應用程式」
 * 5. 設定存取權限為「所有人」
 * 6. 複製部署後的 URL，貼入 Web App 的 Apps Script URL 欄位
 */

/**
 * 處理 GET 請求（可用於健康檢查）
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'AI Ad Generator Backend is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    let result;

    switch (action) {
      case 'generateText':
        result = handleGenerateText(payload);
        break;
      case 'writeToSheet':
        result = handleWriteToSheet(payload);
        break;
      case 'writeToNotion':
        result = handleWriteToNotion(payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, result: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// Text Generation
// ============================================================

function handleGenerateText(payload) {
  const { provider, apiKey, prompt } = payload;

  if (provider === 'openai') {
    return callOpenAI(apiKey, prompt);
  } else if (provider === 'google') {
    return callGoogleAI(apiKey, prompt);
  }

  throw new Error('Unsupported provider: ' + provider);
}

function callOpenAI(apiKey, prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiKey
    },
    payload: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位資深的廣告行銷專家，擅長撰寫各種風格的廣告文案。請用繁體中文回覆。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error('OpenAI API error: ' + response.getContentText());
  }

  const data = JSON.parse(response.getContentText());
  return data.choices[0].message.content;
}

function callGoogleAI(apiKey, prompt) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2000
      }
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error('Google AI API error: ' + response.getContentText());
  }

  const data = JSON.parse(response.getContentText());
  return data.candidates[0].content.parts[0].text;
}

// ============================================================
// Google Sheets Export
// ============================================================

function handleWriteToSheet(payload) {
  const { sheetId, data } = payload;

  const spreadsheet = SpreadsheetApp.openById(sheetId);
  let sheet = spreadsheet.getSheetByName('AI廣告素材');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('AI廣告素材');
  }

  // Clear existing content
  sheet.clear();

  // Write headers
  const headers = ['組合名稱', '標題', '內文', 'CTA', '文案風格', '圖片', '圖片連結', '圖片風格', '文案Prompt', '圖片Prompt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Style headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4F46E5');
  headerRange.setFontColor('#FFFFFF');

  // Write data
  if (data && data.length > 0) {
    const rows = data.map(row => [
      row.name || '',
      row.headline || '',
      row.body || '',
      row.cta || '',
      row.copyStyle || '',
      row.imageLabel || '',
      row.imageUrl || '',
      row.imageStyle || '',
      row.copyPrompt || '',
      row.imagePrompt || ''
    ]);

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Add timestamp
  const timestampRow = data.length + 3;
  sheet.getRange(timestampRow, 1).setValue('匯出時間：' + new Date().toLocaleString('zh-TW'));
  sheet.getRange(timestampRow, 1).setFontColor('#6B7280');

  return '已成功寫入 Google Sheets！';
}

// ============================================================
// Notion Export (Optional)
// ============================================================

function handleWriteToNotion(payload) {
  const { notionToken, databaseId, data } = payload;

  if (!notionToken || !databaseId) {
    throw new Error('請提供 Notion Token 和 Database ID');
  }

  const url = 'https://api.notion.com/v1/pages';

  for (const row of data) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + notionToken,
        'Notion-Version': '2022-06-28'
      },
      payload: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          '組合名稱': { title: [{ text: { content: row.name || '' } }] },
          '標題': { rich_text: [{ text: { content: row.headline || '' } }] },
          '內文': { rich_text: [{ text: { content: row.body || '' } }] },
          'CTA': { rich_text: [{ text: { content: row.cta || '' } }] },
          '文案風格': { select: { name: row.copyStyle || '未指定' } },
          '圖片': { url: row.imageUrl || null }
        }
      }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error('Notion API error: ' + response.getContentText());
    }
  }

  return '已成功寫入 Notion！';
}
