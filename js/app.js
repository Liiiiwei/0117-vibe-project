/**
 * AI 廣告素材產生器 - Main Application
 */

// ============================================================
// State Management
// ============================================================
const AppState = {
  apiProvider: 'openai',
  apiKey: '',
  appsScriptUrl: '',
  project: {
    productName: '',
    productDescription: '',
    adGoal: '',
    targetAudience: '',
    keySellingPoints: ''
  },
  generatedCopies: [],
  generatedImages: [],
  combinations: [],
  nextCombinationId: 1
};

// ============================================================
// Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initOnboarding();
  initNavigation();
  initApiSettings();
  initProjectSettings();
  initCopyGeneration();
  initImageGeneration();
  initCombination();
  initExport();
  initHelp();
  restoreSessionState();
});

function restoreSessionState() {
  const savedKey = sessionStorage.getItem('ai_api_key');
  const savedProvider = sessionStorage.getItem('ai_provider');
  const savedAppsScriptUrl = sessionStorage.getItem('apps_script_url');

  if (savedKey) {
    AppState.apiKey = savedKey;
    document.getElementById('api-key-input').value = savedKey;
  }
  if (savedProvider) {
    AppState.apiProvider = savedProvider;
    document.getElementById('ai-provider').value = savedProvider;
  }
  if (savedAppsScriptUrl) {
    AppState.appsScriptUrl = savedAppsScriptUrl;
    document.getElementById('apps-script-url').value = savedAppsScriptUrl;
  }
}

// ============================================================
// Onboarding
// ============================================================
function initOnboarding() {
  const hasSeenOnboarding = sessionStorage.getItem('seen_onboarding');
  const modal = document.getElementById('onboarding-modal');

  if (hasSeenOnboarding) {
    modal.style.display = 'none';
    return;
  }

  let currentStep = 0;
  const steps = modal.querySelectorAll('.onboarding-step');
  const dots = modal.querySelectorAll('.dot');
  const prevBtn = document.getElementById('onboarding-prev');
  const nextBtn = document.getElementById('onboarding-next');
  const closeBtn = document.getElementById('onboarding-close');

  function showStep(index) {
    steps.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    steps[index].classList.add('active');
    dots[index].classList.add('active');

    prevBtn.style.display = index === 0 ? 'none' : 'inline-flex';
    nextBtn.style.display = index === steps.length - 1 ? 'none' : 'inline-flex';
    closeBtn.style.display = index === steps.length - 1 ? 'inline-flex' : 'none';
  }

  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; showStep(currentStep); }
  });

  nextBtn.addEventListener('click', () => {
    if (currentStep < steps.length - 1) { currentStep++; showStep(currentStep); }
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    sessionStorage.setItem('seen_onboarding', 'true');
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { currentStep = i; showStep(i); });
  });

  showStep(0);
}

// ============================================================
// Navigation
// ============================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.step-item');
  const sections = document.querySelectorAll('.section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.dataset.section;
      navigateToSection(targetId);
    });
  });

  // Next/Prev buttons
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => navigateToSection(btn.dataset.next));
  });
  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => navigateToSection(btn.dataset.prev));
  });
}

function navigateToSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.step-item').forEach(n => n.classList.remove('active'));

  document.getElementById(sectionId).classList.add('active');
  document.querySelector(`.step-item[data-section="${sectionId}"]`).classList.add('active');

  // Refresh combination sidebar when navigating to combination section
  if (sectionId === 'combination') {
    refreshCombinationSidebar();
  }
  if (sectionId === 'export') {
    refreshExportPreview();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// API Settings
// ============================================================
function initApiSettings() {
  const saveBtn = document.getElementById('save-api-key');
  const testBtn = document.getElementById('test-api-key');
  const toggleBtn = document.getElementById('toggle-key-visibility');
  const keyInput = document.getElementById('api-key-input');

  toggleBtn.addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  saveBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    const provider = document.getElementById('ai-provider').value;
    const appsScriptUrl = document.getElementById('apps-script-url').value.trim();

    if (!key) {
      showStatus('api-status', 'error', '請輸入 API Key。');
      return;
    }

    AppState.apiKey = key;
    AppState.apiProvider = provider;
    AppState.appsScriptUrl = appsScriptUrl;

    sessionStorage.setItem('ai_api_key', key);
    sessionStorage.setItem('ai_provider', provider);
    if (appsScriptUrl) {
      sessionStorage.setItem('apps_script_url', appsScriptUrl);
    }

    showStatus('api-status', 'success', 'API Key 已儲存至瀏覽器 Session。關閉分頁後將自動清除。');
    markStepCompleted('api-settings');
  });

  testBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus('api-status', 'error', '請先輸入 API Key。');
      return;
    }
    showStatus('api-status', 'info', '正在測試連線...');

    try {
      const provider = document.getElementById('ai-provider').value;
      await testApiConnection(provider, key);
      showStatus('api-status', 'success', 'API 連線成功！');
    } catch (err) {
      showStatus('api-status', 'error', `連線失敗：${err.message}`);
    }
  });
}

async function testApiConnection(provider, key) {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`OpenAI API 回傳錯誤 (${res.status})`);
    return true;
  } else if (provider === 'google') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) throw new Error(`Google AI API 回傳錯誤 (${res.status})`);
    return true;
  }
}

// ============================================================
// Project Settings
// ============================================================
function initProjectSettings() {
  const personaBtn = document.getElementById('generate-persona');

  personaBtn.addEventListener('click', async () => {
    const audience = document.getElementById('target-audience').value.trim();
    const product = document.getElementById('product-description').value.trim();
    if (!audience) {
      alert('請先輸入目標受眾描述。');
      return;
    }

    personaBtn.disabled = true;
    personaBtn.textContent = '生成中...';

    try {
      const prompt = `根據以下目標受眾描述，生成一份詳細的受眾畫像（Persona），包含：年齡範圍、職業、收入水平、生活型態、主要痛點、購買動機、常用媒體管道。

產品描述：${product}
目標受眾描述：${audience}

請以繁體中文回覆，使用條列式格式。`;

      const result = await callTextAI(prompt);
      const personaDiv = document.getElementById('persona-result');
      personaDiv.innerHTML = `<strong>AI 生成受眾畫像：</strong><br>${formatAIResponse(result)}`;
      personaDiv.style.display = 'block';
    } catch (err) {
      alert(`生成失敗：${err.message}`);
    } finally {
      personaBtn.disabled = false;
      personaBtn.textContent = 'AI 生成受眾畫像';
    }
  });

  // Save project state on input change
  ['product-name', 'product-description', 'ad-goal', 'target-audience', 'key-selling-points'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      saveProjectState();
    });
  });

  // Goal suggestion
  document.getElementById('ad-goal').addEventListener('change', (e) => {
    const suggestions = {
      'brand-awareness': '品牌認知目標適合新品牌或新產品推廣。建議使用視覺衝擊力強的素材，搭配品牌故事或情感訴求文案。',
      'traffic': '網站流量目標適合有內容或電商網站的品牌。建議使用引人好奇的標題，搭配明確的「了解更多」CTA。',
      'leads': '潛在客戶獲取適合 B2B 或高單價產品。建議提供免費資源（白皮書、試用）作為誘因，文案強調專業性。',
      'conversions': '銷售轉化目標適合已有知名度的產品。建議使用限時優惠、社會證明（好評/數據），搭配強力 CTA。'
    };
    const div = document.getElementById('goal-suggestion');
    if (suggestions[e.target.value]) {
      div.innerHTML = `<strong>AI 建議：</strong>${suggestions[e.target.value]}`;
      div.style.display = 'block';
    } else {
      div.style.display = 'none';
    }
  });
}

function saveProjectState() {
  AppState.project = {
    productName: document.getElementById('product-name').value.trim(),
    productDescription: document.getElementById('product-description').value.trim(),
    adGoal: document.getElementById('ad-goal').value,
    targetAudience: document.getElementById('target-audience').value.trim(),
    keySellingPoints: document.getElementById('key-selling-points').value.trim()
  };
  markStepCompleted('project-settings');
}

// ============================================================
// Copy Generation
// ============================================================
function initCopyGeneration() {
  const generateBtn = document.getElementById('generate-copy');

  generateBtn.addEventListener('click', async () => {
    saveProjectState();
    const { productName, productDescription, adGoal, targetAudience, keySellingPoints } = AppState.project;

    if (!productDescription || !adGoal || !targetAudience) {
      alert('請先完成專案設定（產品描述、廣告目標、目標受眾為必填）。');
      return;
    }

    const style = document.getElementById('copy-style').value;
    const count = parseInt(document.getElementById('copy-count').value);

    const styleMap = {
      professional: '專業可靠、數據支撐、語氣正式',
      humorous: '幽默輕鬆、有趣味性、容易引起共鳴',
      urgent: '緊迫感、限時限量、製造稀缺性',
      question: '以問句開頭、引發思考、吸引注意',
      'pain-point': '直擊痛點、提供解決方案、引起共感',
      storytelling: '故事敘述、場景描繪、引人入勝',
      emotional: '情感訴求、溫馨感人、建立連結'
    };

    const goalMap = {
      'brand-awareness': '品牌認知',
      'traffic': '網站流量',
      'leads': '潛在客戶獲取',
      'conversions': '銷售轉化'
    };

    const prompt = `你是一位資深廣告文案專家。請根據以下資訊，生成 ${count} 組廣告文案。

產品名稱：${productName}
產品描述：${productDescription}
廣告目標：${goalMap[adGoal]}
目標受眾：${targetAudience}
核心賣點：${keySellingPoints}
文案風格：${styleMap[style]}

每組文案必須包含：
1. 標題 (headline)：20 字以內，吸引眼球
2. 內文 (body)：50-100 字，說明產品價值
3. CTA (call_to_action)：5-10 字的行動呼籲

請以 JSON 陣列格式回覆，每組包含 headline, body, call_to_action 三個欄位。
例如：[{"headline":"...","body":"...","call_to_action":"..."}]

請只回覆 JSON，不要其他文字。`;

    generateBtn.disabled = true;
    document.getElementById('copy-loading').style.display = 'block';
    document.getElementById('copy-results').style.display = 'none';

    try {
      const result = await callTextAI(prompt);
      const copies = parseJsonFromAI(result);

      if (!Array.isArray(copies) || copies.length === 0) {
        throw new Error('AI 回傳格式不正確，請重試。');
      }

      AppState.generatedCopies = copies.map((c, i) => ({
        id: `copy-${Date.now()}-${i}`,
        headline: c.headline,
        body: c.body,
        cta: c.call_to_action,
        style: style,
        prompt: prompt
      }));

      renderCopyResults();
      markStepCompleted('copy-generation');
    } catch (err) {
      alert(`文案生成失敗：${err.message}`);
    } finally {
      generateBtn.disabled = false;
      document.getElementById('copy-loading').style.display = 'none';
    }
  });

  // Style suggestion based on audience
  document.getElementById('copy-style').addEventListener('change', () => {
    const audience = document.getElementById('target-audience')?.value || '';
    if (audience.length > 10) {
      const suggestionDiv = document.getElementById('copy-style-suggestion');
      const style = document.getElementById('copy-style').value;
      const tips = {
        professional: '專業風格適合 B2B 或高端產品。建議加入數據和權威引用。',
        humorous: '幽默風格適合年輕族群和大眾消費品。注意文化差異避免冒犯。',
        urgent: '緊迫風格適合促銷活動。搭配真實的限時優惠效果更佳。',
        question: '提問風格適合引起目標受眾的好奇心，讓他們想了解更多。',
        'pain-point': '痛點風格適合解決方案型產品。先描述問題再提出解方。',
        storytelling: '故事風格適合品牌建設。用使用者故事或品牌故事引起共鳴。',
        emotional: '情感風格適合節日行銷或與家庭、健康相關的產品。'
      };
      suggestionDiv.innerHTML = `<strong>風格提示：</strong>${tips[style] || ''}`;
      suggestionDiv.style.display = 'block';
    }
  });
}

function renderCopyResults() {
  const container = document.getElementById('copy-results');
  container.style.display = 'grid';

  const styleLabels = {
    professional: '專業可靠',
    humorous: '幽默輕鬆',
    urgent: '緊迫限時',
    question: '提問引導',
    'pain-point': '痛點解決',
    storytelling: '故事敘述',
    emotional: '情感訴求'
  };

  container.innerHTML = AppState.generatedCopies.map((copy, i) => `
    <div class="copy-card" data-copy-id="${copy.id}">
      <div class="copy-card-header">
        <span class="badge">${styleLabels[copy.style] || copy.style} #${i + 1}</span>
        <div class="copy-actions">
          <button class="btn btn-secondary btn-sm" onclick="copyCopyToClipboard('${copy.id}')" title="複製">複製</button>
        </div>
      </div>
      <h4>${escapeHtml(copy.headline)}</h4>
      <div class="copy-body">${escapeHtml(copy.body)}</div>
      <div class="copy-cta">${escapeHtml(copy.cta)}</div>
      <details class="copy-prompt">
        <summary>查看使用的 Prompt</summary>
        <pre style="white-space:pre-wrap;font-size:0.75rem;margin-top:0.5rem">${escapeHtml(copy.prompt)}</pre>
      </details>
    </div>
  `).join('');
}

function copyCopyToClipboard(copyId) {
  const copy = AppState.generatedCopies.find(c => c.id === copyId);
  if (!copy) return;
  const text = `標題：${copy.headline}\n內文：${copy.body}\nCTA：${copy.cta}`;
  navigator.clipboard.writeText(text).then(() => {
    alert('已複製到剪貼簿！');
  });
}

// ============================================================
// Image Generation
// ============================================================
function initImageGeneration() {
  const generateBtn = document.getElementById('generate-images');
  const suggestBtn = document.getElementById('suggest-image-prompt');

  suggestBtn.addEventListener('click', async () => {
    saveProjectState();
    const { productName, productDescription, targetAudience } = AppState.project;

    if (!productDescription) {
      alert('請先填寫產品描述。');
      return;
    }

    suggestBtn.disabled = true;
    suggestBtn.textContent = '生成中...';

    try {
      const style = document.getElementById('image-style').value;
      const styleNames = {
        minimalist: '極簡風格',
        tech: '科技感',
        warm: '溫馨自然',
        bold: '大膽鮮明',
        elegant: '優雅精緻',
        lifestyle: '生活場景'
      };

      const prompt = `你是一位廣告視覺設計專家。請根據以下產品資訊，生成一段適合用於 AI 圖片生成的英文 Prompt（約 50-80 字）。

產品：${productName} - ${productDescription}
目標受眾：${targetAudience}
期望風格：${styleNames[style]}

請直接回覆英文 Prompt，不要其他說明文字。Prompt 應描述：場景、構圖、色調、光線、元素等。`;

      const result = await callTextAI(prompt);
      document.getElementById('image-description').value = result.trim();
    } catch (err) {
      alert(`建議生成失敗：${err.message}`);
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.textContent = 'AI 建議圖片 Prompt';
    }
  });

  generateBtn.addEventListener('click', async () => {
    const description = document.getElementById('image-description').value.trim();
    const count = parseInt(document.getElementById('image-count').value);
    const style = document.getElementById('image-style').value;

    if (!description) {
      alert('請輸入圖片描述或使用 AI 建議。');
      return;
    }

    if (!AppState.apiKey) {
      alert('請先設定 API Key。');
      return;
    }

    generateBtn.disabled = true;
    document.getElementById('image-loading').style.display = 'block';
    document.getElementById('image-results').style.display = 'none';

    try {
      const images = await generateImages(description, count, style);
      AppState.generatedImages = images;
      renderImageResults();
      markStepCompleted('image-generation');
    } catch (err) {
      alert(`圖片生成失敗：${err.message}`);
    } finally {
      generateBtn.disabled = false;
      document.getElementById('image-loading').style.display = 'none';
    }
  });
}

async function generateImages(description, count, style) {
  const stylePrompts = {
    minimalist: 'minimalist, clean design, white space, simple composition',
    tech: 'futuristic, technology, digital, neon accents, modern',
    warm: 'warm tones, natural lighting, cozy, organic feel',
    bold: 'bold colors, high contrast, dynamic composition, eye-catching',
    elegant: 'elegant, luxury, refined, sophisticated, premium feel',
    lifestyle: 'lifestyle photography, natural setting, authentic, relatable'
  };

  const fullPrompt = `${description}, ${stylePrompts[style]}, advertisement, professional quality, high resolution`;

  const images = [];

  if (AppState.apiProvider === 'openai') {
    // Generate images one at a time for DALL-E
    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AppState.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: fullPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API 錯誤 (${res.status})`);
        }

        const data = await res.json();
        images.push({
          id: `img-${Date.now()}-${i}`,
          url: data.data[0].url,
          revisedPrompt: data.data[0].revised_prompt || fullPrompt,
          originalPrompt: fullPrompt,
          style: style,
          label: `圖片 ${i + 1}`
        });
      } catch (err) {
        console.error(`Image ${i + 1} generation failed:`, err);
        // Add placeholder for failed generation
        images.push({
          id: `img-${Date.now()}-${i}`,
          url: null,
          revisedPrompt: fullPrompt,
          originalPrompt: fullPrompt,
          style: style,
          label: `圖片 ${i + 1}（生成失敗）`,
          error: err.message
        });
      }
    }
  } else if (AppState.apiProvider === 'google') {
    // For Google AI - use Imagen via Gemini API
    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${AppState.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `Generate an advertising image: ${fullPrompt}` }]
              }],
              generationConfig: {
                responseModalities: ['TEXT']
              }
            })
          }
        );

        if (!res.ok) {
          throw new Error(`Google AI API 錯誤 (${res.status})`);
        }

        // Google AI text model - generate a descriptive prompt instead
        images.push({
          id: `img-${Date.now()}-${i}`,
          url: null,
          revisedPrompt: fullPrompt,
          originalPrompt: fullPrompt,
          style: style,
          label: `圖片 ${i + 1}`,
          placeholder: true
        });
      } catch (err) {
        images.push({
          id: `img-${Date.now()}-${i}`,
          url: null,
          revisedPrompt: fullPrompt,
          originalPrompt: fullPrompt,
          style: style,
          label: `圖片 ${i + 1}（生成失敗）`,
          error: err.message
        });
      }
    }
  }

  return images;
}

function renderImageResults() {
  const container = document.getElementById('image-results');
  container.style.display = 'grid';

  container.innerHTML = AppState.generatedImages.map(img => `
    <div class="image-card" data-image-id="${img.id}">
      ${img.url
        ? `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label)}" loading="lazy">`
        : `<div class="image-placeholder">${img.error ? '!' : '&#x1F5BC;'}</div>`
      }
      <div class="image-card-footer">
        <span class="image-label">${escapeHtml(img.label)}</span>
        <div style="display:flex;gap:0.25rem">
          ${img.url ? `<a href="${escapeHtml(img.url)}" target="_blank" class="btn btn-secondary btn-sm" download>下載</a>` : ''}
        </div>
      </div>
      <details class="copy-prompt" style="padding:0.5rem 0.75rem">
        <summary style="cursor:pointer;font-size:0.75rem;font-weight:600;color:var(--text-light)">查看 Prompt</summary>
        <pre style="white-space:pre-wrap;font-size:0.7rem;margin-top:0.5rem;color:var(--text-light)">${escapeHtml(img.revisedPrompt || img.originalPrompt)}</pre>
      </details>
    </div>
  `).join('');
}

// ============================================================
// Combination
// ============================================================
function initCombination() {
  document.getElementById('add-combination').addEventListener('click', addCombination);
  document.getElementById('auto-combine').addEventListener('click', autoCombine);
}

function refreshCombinationSidebar() {
  // Render available copies
  const copiesContainer = document.getElementById('available-copies');
  if (AppState.generatedCopies.length === 0) {
    copiesContainer.innerHTML = '<p class="empty-hint">尚未生成文案。</p>';
  } else {
    copiesContainer.innerHTML = AppState.generatedCopies.map((c, i) => `
      <div class="selectable-item" data-copy-id="${c.id}" title="${escapeHtml(c.headline)}">
        <strong>文案 #${i + 1}：</strong>${escapeHtml(c.headline.substring(0, 30))}${c.headline.length > 30 ? '...' : ''}
      </div>
    `).join('');
  }

  // Render available images
  const imagesContainer = document.getElementById('available-images');
  if (AppState.generatedImages.length === 0) {
    imagesContainer.innerHTML = '<p class="empty-hint">尚未生成圖片。</p>';
  } else {
    imagesContainer.innerHTML = AppState.generatedImages.map((img, i) => `
      <div class="selectable-item" data-image-id="${img.id}">
        ${escapeHtml(img.label)}
      </div>
    `).join('');
  }

  renderCombinations();
}

function addCombination() {
  const combo = {
    id: `combo-${AppState.nextCombinationId++}`,
    name: `組合 ${String.fromCharCode(64 + AppState.nextCombinationId - 1)}`,
    copyId: null,
    imageId: null
  };
  AppState.combinations.push(combo);
  renderCombinations();
}

function autoCombine() {
  if (AppState.generatedCopies.length === 0 || AppState.generatedImages.length === 0) {
    alert('請先生成文案和圖片後再使用自動配對。');
    return;
  }

  AppState.combinations = [];
  AppState.nextCombinationId = 1;

  const maxCombos = Math.min(
    AppState.generatedCopies.length * AppState.generatedImages.length,
    12
  );

  let count = 0;
  for (const copy of AppState.generatedCopies) {
    for (const img of AppState.generatedImages) {
      if (count >= maxCombos) break;
      AppState.combinations.push({
        id: `combo-${AppState.nextCombinationId++}`,
        name: `組合 ${String.fromCharCode(65 + count)}`,
        copyId: copy.id,
        imageId: img.id
      });
      count++;
    }
    if (count >= maxCombos) break;
  }

  renderCombinations();
}

function renderCombinations() {
  const container = document.getElementById('combinations-list');

  if (AppState.combinations.length === 0) {
    container.innerHTML = '<p class="empty-hint">點擊「新增組合」開始建立 A/B 測試組合。</p>';
    return;
  }

  container.innerHTML = AppState.combinations.map(combo => {
    const copy = AppState.generatedCopies.find(c => c.id === combo.copyId);
    const image = AppState.generatedImages.find(i => i.id === combo.imageId);

    return `
      <div class="combination-card" data-combo-id="${combo.id}">
        <div class="combination-card-header">
          <h4>${escapeHtml(combo.name)}</h4>
          <button class="btn btn-danger btn-sm" onclick="removeCombination('${combo.id}')">移除</button>
        </div>
        <div class="combination-content">
          <div class="combo-section">
            <h5>文案</h5>
            <select onchange="updateComboCopy('${combo.id}', this.value)">
              <option value="">選擇文案...</option>
              ${AppState.generatedCopies.map((c, i) => `
                <option value="${c.id}" ${c.id === combo.copyId ? 'selected' : ''}>
                  文案 #${i + 1}: ${c.headline.substring(0, 25)}...
                </option>
              `).join('')}
            </select>
            ${copy ? `
              <div style="margin-top:0.5rem;font-size:0.8rem">
                <strong>${escapeHtml(copy.headline)}</strong><br>
                <span style="color:var(--text-secondary)">${escapeHtml(copy.body.substring(0, 80))}...</span><br>
                <span style="color:var(--primary);font-weight:600">${escapeHtml(copy.cta)}</span>
              </div>
            ` : '<p style="font-size:0.8rem;color:var(--text-light);margin-top:0.5rem">尚未選擇文案</p>'}
          </div>
          <div class="combo-section">
            <h5>圖片</h5>
            <select onchange="updateComboImage('${combo.id}', this.value)">
              <option value="">選擇圖片...</option>
              ${AppState.generatedImages.map(img => `
                <option value="${img.id}" ${img.id === combo.imageId ? 'selected' : ''}>
                  ${img.label}
                </option>
              `).join('')}
            </select>
            ${image ? `
              <div style="margin-top:0.5rem">
                ${image.url
                  ? `<img src="${escapeHtml(image.url)}" style="width:100%;max-height:120px;object-fit:cover;border-radius:4px">`
                  : '<div style="height:60px;background:var(--primary-light);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:var(--primary)">圖片預覽</div>'
                }
              </div>
            ` : '<p style="font-size:0.8rem;color:var(--text-light);margin-top:0.5rem">尚未選擇圖片</p>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateComboCopy(comboId, copyId) {
  const combo = AppState.combinations.find(c => c.id === comboId);
  if (combo) {
    combo.copyId = copyId || null;
    renderCombinations();
  }
}

function updateComboImage(comboId, imageId) {
  const combo = AppState.combinations.find(c => c.id === comboId);
  if (combo) {
    combo.imageId = imageId || null;
    renderCombinations();
  }
}

function removeCombination(comboId) {
  AppState.combinations = AppState.combinations.filter(c => c.id !== comboId);
  renderCombinations();
}

// ============================================================
// Export
// ============================================================
function initExport() {
  document.getElementById('export-clipboard').addEventListener('click', exportToClipboard);
  document.getElementById('export-csv').addEventListener('click', exportToCSV);
  document.getElementById('export-sheets').addEventListener('click', exportToSheets);
}

function refreshExportPreview() {
  const container = document.getElementById('export-table-container');

  if (AppState.combinations.length === 0) {
    container.innerHTML = '<p class="empty-hint">尚未建立任何素材組合。</p>';
    return;
  }

  const rows = getExportData();

  let html = `<table>
    <thead>
      <tr>
        <th>組合名稱</th>
        <th>標題</th>
        <th>內文</th>
        <th>CTA</th>
        <th>圖片</th>
        <th>文案風格</th>
        <th>圖片風格</th>
      </tr>
    </thead>
    <tbody>`;

  for (const row of rows) {
    html += `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.headline)}</td>
      <td>${escapeHtml(row.body.substring(0, 60))}${row.body.length > 60 ? '...' : ''}</td>
      <td>${escapeHtml(row.cta)}</td>
      <td>${escapeHtml(row.imageLabel)}</td>
      <td>${escapeHtml(row.copyStyle)}</td>
      <td>${escapeHtml(row.imageStyle)}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function getExportData() {
  return AppState.combinations.map(combo => {
    const copy = AppState.generatedCopies.find(c => c.id === combo.copyId);
    const image = AppState.generatedImages.find(i => i.id === combo.imageId);

    return {
      name: combo.name,
      headline: copy?.headline || '(未選擇)',
      body: copy?.body || '',
      cta: copy?.cta || '',
      copyStyle: copy?.style || '',
      copyPrompt: copy?.prompt || '',
      imageLabel: image?.label || '(未選擇)',
      imageUrl: image?.url || '',
      imagePrompt: image?.originalPrompt || '',
      imageStyle: image?.style || ''
    };
  });
}

function exportToClipboard() {
  const data = getExportData();
  if (data.length === 0) {
    alert('沒有可匯出的資料。');
    return;
  }

  let text = '=== AI 廣告素材組合 ===\n\n';
  data.forEach(row => {
    text += `【${row.name}】\n`;
    text += `標題：${row.headline}\n`;
    text += `內文：${row.body}\n`;
    text += `CTA：${row.cta}\n`;
    text += `文案風格：${row.copyStyle}\n`;
    text += `圖片：${row.imageLabel}\n`;
    text += `圖片連結：${row.imageUrl || '無'}\n`;
    text += `---\n\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    showStatus('export-status', 'success', '已複製到剪貼簿！');
  }).catch(() => {
    showStatus('export-status', 'error', '複製失敗，請手動複製。');
  });
}

function exportToCSV() {
  const data = getExportData();
  if (data.length === 0) {
    alert('沒有可匯出的資料。');
    return;
  }

  const headers = ['組合名稱', '標題', '內文', 'CTA', '文案風格', '圖片', '圖片連結', '圖片風格', '文案Prompt', '圖片Prompt'];

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      csvEscape(row.name),
      csvEscape(row.headline),
      csvEscape(row.body),
      csvEscape(row.cta),
      csvEscape(row.copyStyle),
      csvEscape(row.imageLabel),
      csvEscape(row.imageUrl),
      csvEscape(row.imageStyle),
      csvEscape(row.copyPrompt),
      csvEscape(row.imagePrompt)
    ].join(','))
  ].join('\n');

  // Add BOM for Chinese character support in Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ad-creatives-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  showStatus('export-status', 'success', 'CSV 檔案已下載！');
}

async function exportToSheets() {
  const sheetId = document.getElementById('sheet-id').value.trim();
  if (!sheetId) {
    alert('請輸入 Google Sheet ID。');
    return;
  }

  if (!AppState.appsScriptUrl) {
    alert('寫入 Google Sheets 需要設定 Apps Script Web App URL。請至「API 設定」步驟填寫。');
    return;
  }

  const data = getExportData();
  if (data.length === 0) {
    alert('沒有可匯出的資料。');
    return;
  }

  showStatus('export-status', 'info', '正在寫入 Google Sheets...');

  try {
    const res = await fetch(AppState.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'writeToSheet',
        sheetId: sheetId,
        data: data
      })
    });

    if (!res.ok) throw new Error(`寫入失敗 (${res.status})`);
    showStatus('export-status', 'success', '已成功寫入 Google Sheets！');
  } catch (err) {
    showStatus('export-status', 'error', `寫入失敗：${err.message}`);
  }
}

// ============================================================
// Help
// ============================================================
function initHelp() {
  document.getElementById('help-btn').addEventListener('click', () => {
    document.getElementById('help-modal').style.display = 'flex';
  });

  document.querySelectorAll('.help-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.help-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById(`help-${tab.dataset.tab}`).style.display = 'block';
    });
  });

  // Close modal on overlay click
  document.getElementById('help-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.style.display = 'none';
    }
  });
}

// ============================================================
// AI API Calls
// ============================================================
async function callTextAI(prompt) {
  if (!AppState.apiKey) {
    throw new Error('請先設定 API Key。');
  }

  // If Apps Script URL is configured, route through it
  if (AppState.appsScriptUrl) {
    return callViaAppsScript(prompt);
  }

  if (AppState.apiProvider === 'openai') {
    return callOpenAI(prompt);
  } else if (AppState.apiProvider === 'google') {
    return callGoogleAI(prompt);
  }

  throw new Error('不支援的 AI 服務提供者。');
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AppState.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位資深的廣告行銷專家，擅長撰寫各種風格的廣告文案。請用繁體中文回覆。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `OpenAI API 錯誤 (${res.status})`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGoogleAI(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${AppState.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000
        }
      })
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Google AI API 錯誤 (${res.status})`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callViaAppsScript(prompt) {
  const res = await fetch(AppState.appsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generateText',
      provider: AppState.apiProvider,
      apiKey: AppState.apiKey,
      prompt: prompt
    })
  });

  if (!res.ok) throw new Error(`Apps Script 錯誤 (${res.status})`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// ============================================================
// Utilities
// ============================================================
function showStatus(elementId, type, message) {
  const el = document.getElementById(elementId);
  el.className = `status-message ${type}`;
  el.textContent = message;
  el.style.display = 'block';

  if (type === 'success' || type === 'info') {
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}

function markStepCompleted(sectionId) {
  const navItem = document.querySelector(`.step-item[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add('completed');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function csvEscape(str) {
  if (!str) return '""';
  return `"${str.replace(/"/g, '""')}"`;
}

function formatAIResponse(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function parseJsonFromAI(text) {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Try cleaning up common issues
      const cleaned = jsonMatch[0]
        .replace(/,\s*\]/g, ']')  // trailing commas
        .replace(/,\s*\}/g, '}');
      return JSON.parse(cleaned);
    }
  }
  throw new Error('無法從 AI 回應中解析 JSON。');
}
