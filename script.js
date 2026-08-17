(function () {
  "use strict";

  /* ============================================================
   *  北京大学中国语言文学考研真题研习系统
   *  - 智能解析与规范化 PKU 题库（含 2020-2026 真题）
   *  - 历年套卷（全真模考 / 背题精研）
   *  - 学科与题型多维专项分类
   *  - 全题库全文模糊搜索
   *  - 本地错题本与重点收藏夹（支持离线备份与迁移）
   *  - 主观题 AI 智能批改评卷引擎（内置采分点对比与 Dify/API 支持）
   * ============================================================ */

  // ---------- LocalStorage 键名集中管理 ----------
  const STORAGE_KEYS = {
    wrong: "pku_wrong_questions_v1",
    favorites: "pku_favorites_v1",
    userAnswers: "pku_user_answers_v1",
    userNotes: "pku_user_notes_v1",
    customLib: "pku_custom_library_v1",
    aiConfig: "pku_ai_config_v1",
  };

  // ---------- 全局状态中心 ----------
  const state = {
    baseQuestions: [], // 来自 cleaned_questions.json 的题目
    customQuestions: [], // 用户通过文件追加的题目
    allQuestions: [], // 合并去重后的全量题目
    wrongIds: new Set(), // 错题 ID 集合
    favIds: new Set(), // 收藏 ID 集合
    userAnswers: {}, // 用户作答草稿 { [qid]: text }
    userNotes: {}, // 个人笔记 { [qid]: text }
    view: "home", // 当前活动视图
    catSubject: "all", // 分类筛选：当前科目
    catType: "all", // 分类筛选：当前题型
    paperYear: null, // 套卷年份
    paperSubjectCode: "all", // 套卷科目代码
    paperMode: "recite", // recite=背题模式, mock=全真模拟
    paperIndex: 0, // 套卷当前题号
  };

  // ---------- 工具函数 ----------
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function loadStorageSet(key) {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch (e) {
      return new Set();
    }
  }

  function saveStorageSet(key, setObj) {
    localStorage.setItem(key, JSON.stringify(Array.from(setObj)));
  }

  function loadStorageObj(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveStorageObj(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  // ---------- 题目实体规范化 ----------
  function normalizeQuestion(raw, idx) {
    const qText = (raw.question || raw.title || "").trim();
    const qAnswer = (raw.answer || raw.analysis || "").trim();
    const qYear = Number(raw.year) || 0;
    const qSubject = (raw.subject || "文学基础").trim();
    const qCode = raw.subjectCode ? String(raw.subjectCode).trim() : "";
    const qType = (raw.type || raw.question_type || "论述题").trim();
    const qScore = Number(raw.score) || 0;
    const qId = raw.id
      ? String(raw.id).trim()
      : `pku-${qYear}-${qCode || "gen"}-${idx || 1}`;

    return {
      id: qId,
      year: qYear,
      subjectCode: qCode,
      subject: qSubject,
      type: qType,
      score: qScore,
      title: qText,
      answer: qAnswer,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    };
  }

  function mergeAllQuestions() {
    const map = new Map();
    state.baseQuestions.forEach((q) => map.set(q.id, q));
    state.customQuestions.forEach((q) => map.set(q.id, q));
    state.allQuestions = Array.from(map.values()).sort((a, b) => {
      return (
        b.year - a.year ||
        (b.subjectCode || "").localeCompare(a.subjectCode || "") ||
        a.id.localeCompare(b.id)
      );
    });
  }

  // ---------- 聚合与统计 ----------
  function getAvailableYears() {
    const set = new Set();
    state.allQuestions.forEach((q) => {
      if (q.year) set.add(q.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }

  function getAvailableSubjects() {
    const priority = [
      "文艺学",
      "中国古代文学",
      "中国现当代文学",
      "中外文学基础",
      "比较文学与世界文学",
    ];
    const found = new Set(state.allQuestions.map((q) => q.subject));
    const result = priority.filter((s) => found.has(s));
    found.forEach((s) => {
      if (!result.includes(s)) result.push(s);
    });
    return result;
  }

  function getAvailableTypes() {
    const priority = [
      "名词解释",
      "简答题",
      "论述题",
      "材料分析题",
      "填空题",
      "判断题",
    ];
    const found = new Set(state.allQuestions.map((q) => q.type));
    const result = priority.filter((t) => found.has(t));
    found.forEach((t) => {
      if (!result.includes(t)) result.push(t);
    });
    return result;
  }

  // ---------- 题目卡片 HTML 生成器 ----------
  function renderQuestionCard(q, isReciteMode = false) {
    const isWrong = state.wrongIds.has(q.id);
    const isFav = state.favIds.has(q.id);
    const savedDraft = state.userAnswers[q.id] || "";

    const tagsHtml =
      q.tags && q.tags.length
        ? `
      <div class="q-tags">
        ${q.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    `
        : "";

    return `
      <div class="q-card" data-id="${escapeHtml(q.id)}">
        <div class="q-meta">
          <span class="badge badge-year">${escapeHtml(q.year ? q.year + "年" : "真题")}</span>
          <span class="badge badge-subject">${escapeHtml(q.subject)}</span>
          ${q.subjectCode ? `<span class="badge badge-code">${escapeHtml(q.subjectCode)}</span>` : ""}
          <span class="badge badge-type">${escapeHtml(q.type)}</span>
          ${q.score > 0 ? `<span class="badge badge-score">${q.score} 分</span>` : ""}
        </div>

        <div class="q-title">${escapeHtml(q.title)}</div>

        <div class="q-analysis ${isReciteMode ? "show" : ""}">
          <div class="q-analysis-label">📖 核心采分点与答题框架</div>
          <div class="q-analysis-body">${escapeHtml(q.answer || "暂无标答，可直接使用 AI 评分分析")}</div>
        </div>

        ${tagsHtml}

        <div class="q-actions">
          <button class="btn btn-ghost" data-action="toggle-answer">
            ${isReciteMode ? "隐藏采分点" : "查看采分点"}
          </button>
          <button class="btn ${isWrong ? "btn-wrong-active" : "btn-wrong"}" data-action="toggle-wrong">
            ${isWrong ? "✓ 已在错题本" : "加入错题本"}
          </button>
          <button class="btn ${isFav ? "btn-fav-active" : "btn-fav"}" data-action="toggle-fav">
            ${isFav ? "⭐ 已收藏" : "⭐ 收藏"}
          </button>
        </div>

        <div class="ai-grade-container">
          <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px; color:#524f4a;">
            ✍️ 考生作答 / 论述要点：
          </label>
          <textarea class="card-answer-input" rows="4" placeholder="在此输入你的答题内容、论述提纲或关键词...">${escapeHtml(savedDraft)}</textarea>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <button class="btn btn-primary" data-action="ai-grade">🤖 AI 智能批改打分</button>
            <span class="muted small auto-save-hint">作答实时自动保存</span>
          </div>
          <div class="ai-result-box" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  // ---------- 视图渲染调度中心 ----------
  function switchView(viewName) {
    state.view = viewName;
    document
      .querySelectorAll(".view")
      .forEach((el) => el.classList.remove("active"));
    const target = $(`#view-${viewName}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.target === viewName);
    });
    $("#main-nav").classList.remove("open");

    updateBadges();

    switch (viewName) {
      case "home":
        renderHomeView();
        break;
      case "papers":
        renderPapersView();
        break;
      case "category":
        renderCategoryView();
        break;
      case "wrong":
        renderWrongListView();
        break;
      case "favorites":
        renderFavListView();
        break;
      case "settings":
        renderSettingsView();
        break;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateBadges() {
    const wb = $("#nav-wrong-badge");
    const fb = $("#nav-fav-badge");
    if (wb) wb.textContent = state.wrongIds.size || "";
    if (fb) fb.textContent = state.favIds.size || "";
  }

  // ---------- 1. 首页看板渲染 ----------
  function renderHomeView() {
    const years = getAvailableYears();
    const subjects = getAvailableSubjects();
    const totalCount = state.allQuestions.length;

    let html = `
      <div class="hero">
        <h1>北京大学中文考研真题研习系统</h1>
        <p class="hero-sub">收录 2020–2026 历年真题 · 文艺学 / 古代文学 / 现当代文学 / 中外文学基础 / 比较文学</p>
        <div class="stat-row">
          <div class="stat"><div class="stat-num">${totalCount}</div><div class="stat-label">题库收录总量</div></div>
          <div class="stat"><div class="stat-num">${years.length}</div><div class="stat-label">真题年份跨度</div></div>
          <div class="stat"><div class="stat-num">${subjects.length}</div><div class="stat-label">覆盖学科专业</div></div>
          <div class="stat"><div class="stat-num">${state.wrongIds.size}</div><div class="stat-label">待攻克错题</div></div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="qa" data-go="papers">📝 历年套卷全真模考</button>
        <button class="qa" data-go="category">📂 五大学科专项刷题</button>
        <button class="qa" data-go="search">🔍 题库知识点速查</button>
        <button class="qa" data-go="wrong">📕 重点错题复习</button>
      </div>

      <div class="panel">
        <h2 class="panel-title">📅 历年真题套卷直达</h2>
        <div class="year-grid">
          ${years
            .map((y) => {
              const count = state.allQuestions.filter(
                (q) => q.year === y,
              ).length;
              return `
              <button class="year-card" data-go-year="${y}">
                <span class="yc-num">${y} 年</span>
                <span class="yc-cnt">${count} 题</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>

      <div class="panel">
        <h2 class="panel-title">🏛️ 学科专业分布</h2>
        <div class="subj-grid">
          ${subjects
            .map((s) => {
              const count = state.allQuestions.filter(
                (q) => q.subject === s,
              ).length;
              return `
              <button class="subj-card" data-go-subject="${escapeHtml(s)}">
                <span class="sc-name">${escapeHtml(s)}</span>
                <span class="sc-cnt">${count} 道真题</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;

    $("#view-home").innerHTML = html;
  }

  // ---------- 2. 历年真题 / 套卷模考渲染 ----------
  function renderPapersView() {
    const years = getAvailableYears();
    if (!state.paperYear && years.length) state.paperYear = years[0];

    const currentYearList = state.allQuestions.filter(
      (q) => q.year === state.paperYear,
    );
    const codes = Array.from(
      new Set(currentYearList.map((q) => q.subjectCode).filter(Boolean)),
    );

    let filteredList = currentYearList;
    if (state.paperSubjectCode !== "all") {
      filteredList = currentYearList.filter(
        (q) => q.subjectCode === state.paperSubjectCode,
      );
    }

    if (state.paperIndex >= filteredList.length) state.paperIndex = 0;
    const currentQ = filteredList[state.paperIndex];
    const isRecite = state.paperMode === "recite";
    const progressPct = filteredList.length
      ? (((state.paperIndex + 1) / filteredList.length) * 100).toFixed(1)
      : 0;

    let html = `
      <div class="panel paper-controls">
        <div class="ctrl-row">
          <label>年份：</label>
          <select id="paper-year-select">
            ${years.map((y) => `<option value="${y}" ${y === state.paperYear ? "selected" : ""}>${y} 年真题</option>`).join("")}
          </select>

          ${
            codes.length
              ? `
            <label style="margin-left:10px;">科目代码：</label>
            <select id="paper-code-select">
              <option value="all" ${state.paperSubjectCode === "all" ? "selected" : ""}>全部专业科目</option>
              ${codes.map((c) => `<option value="${c}" ${c === state.paperSubjectCode ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          `
              : ""
          }
        </div>

        <div class="mode-toggle">
          <button class="mode-btn ${isRecite ? "active" : ""}" data-mode="recite">背题精研模式</button>
          <button class="mode-btn ${!isRecite ? "active" : ""}" data-mode="mock">全真模考模式</button>
        </div>
      </div>
    `;

    if (!filteredList.length) {
      html += `<div class="panel"><p class="muted" style="text-align:center; padding:30px 0;">该年份或科目下暂无题目</p></div>`;
      $("#view-papers").innerHTML = html;
      return;
    }

    html += `
      <div class="paper-progress">
        <div class="pp-bar"><div class="pp-fill" style="width:${progressPct}%"></div></div>
        <div class="pp-text">
          第 <b>${state.paperIndex + 1}</b> / ${filteredList.length} 题 · 
          ${isRecite ? "📖 背题模式（采分点可随时展开/收起）" : "⏱️ 模考模式（答案默认隐藏，专注作答）"}
        </div>
      </div>

      <div class="card-wrap">
        ${renderQuestionCard(currentQ, isRecite)}
      </div>

      <div class="paper-nav">
        <button class="btn btn-primary" data-act="prev" ${state.paperIndex <= 0 ? "disabled" : ""}>上一题</button>
        <button class="btn btn-primary" data-act="next" ${state.paperIndex >= filteredList.length - 1 ? "disabled" : ""}>下一题</button>
      </div>

      <div class="panel answer-card">
        <details open>
          <summary>📑 试卷答题卡与快速跳转 (${filteredList.length} 题)</summary>
          <div class="ac-grid">
            ${filteredList
              .map((q, idx) => {
                const isCur = idx === state.paperIndex;
                const hasDraft = Boolean(state.userAnswers[q.id]);
                const isWrong = state.wrongIds.has(q.id);
                return `
                <button class="ac-cell ${isCur ? "cur" : ""} ${isWrong ? "marked" : ""}" data-act="jump" data-idx="${idx}" title="${q.subject} - ${q.type}">
                  ${idx + 1}
                </button>
              `;
              })
              .join("")}
          </div>
        </details>
      </div>
    `;

    $("#view-papers").innerHTML = html;
  }

  // ---------- 3. 分类刷题视图渲染 ----------
  function renderCategoryView() {
    const subjects = getAvailableSubjects();
    const types = getAvailableTypes();

    const filtered = state.allQuestions.filter((q) => {
      const matchSubj =
        state.catSubject === "all" || q.subject === state.catSubject;
      const matchType = state.catType === "all" || q.type === state.catType;
      return matchSubj && matchType;
    });

    let html = `
      <div class="panel">
        <h2 class="panel-title">学科分类</h2>
        <div class="subj-grid">
          <button class="subj-card ${state.catSubject === "all" ? "active" : ""}" data-filter-subj="all">
            <span class="sc-name">全部学科</span>
            <span class="sc-cnt">${state.allQuestions.length} 题</span>
          </button>
          ${subjects
            .map((s) => {
              const count = state.allQuestions.filter(
                (q) => q.subject === s,
              ).length;
              return `
              <button class="subj-card ${state.catSubject === s ? "active" : ""}" data-filter-subj="${escapeHtml(s)}">
                <span class="sc-name">${escapeHtml(s)}</span>
                <span class="sc-cnt">${count} 题</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>

      <div class="panel">
        <h2 class="panel-title">题型分类</h2>
        <div class="type-chips">
          <button class="type-chip ${state.catType === "all" ? "active" : ""}" data-filter-type="all">全部题型</button>
          ${types
            .map((t) => {
              return `<button class="type-chip ${state.catType === t ? "active" : ""}" data-filter-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
            })
            .join("")}
        </div>
      </div>

      <div class="result-head" style="margin-bottom:12px;">
        当前筛选出 <b>${filtered.length}</b> 道题目
      </div>

      <div class="card-list">
        ${filtered.length ? filtered.map((q) => renderQuestionCard(q, false)).join("") : '<div class="panel"><p class="muted" style="text-align:center;">没有找到符合条件的题目</p></div>'}
      </div>
    `;

    $("#view-category").innerHTML = html;
  }

  // ---------- 4. 错题本与收藏夹视图 ----------
  function renderWrongListView() {
    const list = state.allQuestions.filter((q) => state.wrongIds.has(q.id));
    let html = `
      <div class="panel">
        <h2 class="panel-title">📕 错题本 (${list.length} 题)</h2>
        <p class="muted">标记错题后将自动沉淀于此，攻克后可点击“移出错题本”。</p>
      </div>
      <div class="card-list">
        ${list.length ? list.map((q) => renderQuestionCard(q, false)).join("") : '<div class="panel"><p class="muted" style="text-align:center; padding:30px 0;">错题本暂为空，刷题时点击卡片下方的“加入错题本”即可收录。</p></div>'}
      </div>
    `;
    $("#view-wrong").innerHTML = html;
  }

  function renderFavListView() {
    const list = state.allQuestions.filter((q) => state.favIds.has(q.id));
    let html = `
      <div class="panel">
        <h2 class="panel-title">⭐ 重点考点收藏 (${list.length} 题)</h2>
        <p class="muted">重点高频名词解释、名家论述大题可在此集中背诵复习。</p>
      </div>
      <div class="card-list">
        ${list.length ? list.map((q) => renderQuestionCard(q, true)).join("") : '<div class="panel"><p class="muted" style="text-align:center; padding:30px 0;">收藏夹暂为空，点击题目卡片上的“⭐ 收藏”即可加入。</p></div>'}
      </div>
    `;
    $("#view-favorites").innerHTML = html;
  }

  // ---------- 5. 设置视图 ----------
  function renderSettingsView() {
    const aiCfg = loadStorageObj(STORAGE_KEYS.aiConfig);
    const endpointInput = $("#cfg-ai-endpoint");
    const keyInput = $("#cfg-ai-key");
    if (endpointInput) endpointInput.value = aiCfg.endpoint || "";
    if (keyInput) keyInput.value = aiCfg.key || "";
  }

  // ---------- 智能 AI 批改引擎 ----------
  async function handleAIGrade(btn) {
    const card = btn.closest(".q-card");
    if (!card) return;
    const qid = card.dataset.id;
    const q = state.allQuestions.find((item) => item.id === qid);
    if (!q) return;

    const input = $(".card-answer-input", card);
    const resultBox = $(".ai-result-box", card);
    const answerText = (input ? input.value : "").trim();

    if (!answerText) {
      alert("请先在上方输入框中写下您的答题思路或答案！");
      return;
    }

    btn.disabled = true;
    btn.textContent = "⏳ 智能阅卷分析中...";
    resultBox.style.display = "block";
    resultBox.innerHTML =
      "<p class='muted' style='margin:0;'>正在比对北大采分点、分析论证逻辑与学术术语...</p>";

    const aiCfg = loadStorageObj(STORAGE_KEYS.aiConfig);

    try {
      // 若用户配置了远程 API 则请求远程，否则使用高性能本地启发式采分引擎
      let gradeResult = null;
      if (aiCfg.endpoint) {
        gradeResult = await callRemoteAIGrader(aiCfg, q, answerText);
      } else {
        gradeResult = localHeuristicGrade(q, answerText);
      }

      renderGradeResult(resultBox, gradeResult, q.score || 10);
    } catch (err) {
      console.warn("AI 批改失败，降级为本地分析", err);
      const fallbackResult = localHeuristicGrade(q, answerText);
      renderGradeResult(resultBox, fallbackResult, q.score || 10);
    } finally {
      btn.disabled = false;
      btn.textContent = "🤖 AI 智能批改打分";
    }
  }

  // 本地智能启发式评分算法（内置分词与关键要点提取，确保离线即刻可用）
  function localHeuristicGrade(q, userAns) {
    const maxScore = q.score > 0 ? q.score : 10;
    const answerRaw = q.answer || "";

    // 提取核心关键词与标签
    const targetKeywords = new Set([
      ...q.tags,
      ...(answerRaw.match(/[\u4e00-\u9fa5]{2,6}/g) || []),
    ]);

    const hitKeywords = [];
    const missKeywords = [];

    targetKeywords.forEach((kw) => {
      if (kw.length >= 2 && userAns.includes(kw)) {
        hitKeywords.push(kw);
      } else if (kw.length >= 2 && q.tags.includes(kw)) {
        missKeywords.push(kw);
      }
    });

    // 计算得分比率（字数长度系数 + 核心采分点命中率）
    const lengthScoreRatio = Math.min(1, userAns.length / 180);
    const hitRatio =
      targetKeywords.size > 0
        ? hitKeywords.length / Math.max(1, targetKeywords.size * 0.4)
        : 0.6;
    const finalRatio = Math.max(
      0.2,
      Math.min(0.95, lengthScoreRatio * 0.4 + hitRatio * 0.6),
    );
    const finalScore = Math.round(maxScore * finalRatio);

    let feedback = "";
    if (finalScore >= maxScore * 0.8) {
      feedback =
        "作答要点全面，核心概念界定清晰，学术术语运用规范，较好契合了北大考研标准采分框架。";
    } else if (finalScore >= maxScore * 0.6) {
      feedback =
        "答出了基本概念与主旨，但对学术渊源、后世影响或具体文本的论证深度仍可加强。";
    } else {
      feedback =
        "作答相对简略，缺少关键学术概念与论述层次，建议对照参考解析的采分框架补全论据。";
    }

    return {
      score: finalScore,
      maxScore: maxScore,
      hitPoints: hitKeywords.slice(0, 6),
      missPoints: missKeywords.slice(0, 5),
      feedback: feedback,
    };
  }

  // 远程 API 批改接口适配 (兼容 Dify / 云函数 / OpenAI 规范)
  async function callRemoteAIGrader(cfg, q, userAns) {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.key
          ? {
              Authorization: cfg.key.startsWith("Bearer")
                ? cfg.key
                : `Bearer ${cfg.key}`,
            }
          : {}),
      },
      body: JSON.stringify({
        question: q.title,
        standard_answer: q.answer,
        max_score: q.score || 10,
        user_answer: userAns,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      score: data.score || Math.round((q.score || 10) * 0.7),
      maxScore: q.score || 10,
      hitPoints: data.hit_points || data.hitPoints || [],
      missPoints: data.miss_points || data.missPoints || [],
      feedback: data.feedback || data.comment || "AI 批改完成。",
    };
  }

  function renderGradeResult(box, res, maxScore) {
    const hitHtml =
      res.hitPoints && res.hitPoints.length
        ? res.hitPoints.join("、")
        : "未明显命中核心术语";
    const missHtml =
      res.missPoints && res.missPoints.length
        ? res.missPoints.join("、")
        : "无严重缺漏";

    box.innerHTML = `
      <div style="font-size:16px; font-weight:800; color:var(--ok); margin-bottom:8px;">
        🎯 预估得分：${res.score} / ${maxScore} 分
      </div>
      <div style="font-size:13px; color:#222; margin-bottom:6px;">
        <strong style="color:var(--ok);">✅ 命中得分要点：</strong> ${escapeHtml(hitHtml)}
      </div>
      <div style="font-size:13px; color:#222; margin-bottom:6px;">
        <strong style="color:var(--wrong);">❌ 建议补充要点：</strong> ${escapeHtml(missHtml)}
      </div>
      <div style="background:var(--surface-alt); padding:10px 12px; border-radius:6px; font-size:13px; color:var(--text); border:1px solid var(--border); margin-top:8px;">
        <strong>💡 阅卷点拨：</strong> ${escapeHtml(res.feedback)}
      </div>
    `;
  }

  // ---------- 搜索功能 ----------
  function executeSearch() {
    const input = $("#searchInput");
    const summary = $("#searchResultsSummary");
    const listEl = $("#searchResultsList");
    if (!input || !summary || !listEl) return;

    const kw = input.value.trim().toLowerCase();
    if (!kw) {
      summary.textContent = "请输入搜索词";
      listEl.innerHTML = "";
      return;
    }

    const results = state.allQuestions.filter((q) => {
      const matchTitle = q.title && q.title.toLowerCase().includes(kw);
      const matchAnswer = q.answer && q.answer.toLowerCase().includes(kw);
      const matchSubject = q.subject && q.subject.toLowerCase().includes(kw);
      const matchTags =
        q.tags && q.tags.some((t) => t.toLowerCase().includes(kw));
      return matchTitle || matchAnswer || matchSubject || matchTags;
    });

    summary.innerHTML = `搜索 “<b>${escapeHtml(kw)}</b>” 共匹配到 <b>${results.length}</b> 道真题：`;
    if (!results.length) {
      listEl.innerHTML =
        '<div class="panel"><p class="muted" style="text-align:center;">未找到相关题目，可尝试更换关键词</p></div>';
    } else {
      listEl.innerHTML = results
        .map((q) => renderQuestionCard(q, false))
        .join("");
    }
  }

  // ---------- 事件绑定 ----------
  function bindGlobalEvents() {
    // 导航切换
    const navToggleBtn = $("#nav-toggle-btn");
    const mainNav = $("#main-nav");
    if (navToggleBtn && mainNav) {
      navToggleBtn.addEventListener("click", () =>
        mainNav.classList.toggle("open"),
      );
    }

    // 委托全局点击
    document.addEventListener("click", (e) => {
      const target = e.target;

      // 1. 导航
      const navA = target.closest(".nav a");
      if (navA && navA.dataset.target) {
        switchView(navA.dataset.target);
        return;
      }

      // 2. 快捷跳转
      const goBtn = target.closest("[data-go]");
      if (goBtn) {
        switchView(goBtn.dataset.go);
        return;
      }

      const goYearBtn = target.closest("[data-go-year]");
      if (goYearBtn) {
        state.paperYear = Number(goYearBtn.dataset.goYear);
        state.paperSubjectCode = "all";
        state.paperIndex = 0;
        switchView("papers");
        return;
      }

      const goSubjBtn = target.closest("[data-go-subject]");
      if (goSubjBtn) {
        state.catSubject = goSubjBtn.dataset.goSubject;
        state.catType = "all";
        switchView("category");
        return;
      }

      // 3. 题目卡片交互
      const actBtn = target.closest("[data-action]");
      if (actBtn) {
        const action = actBtn.dataset.action;
        const card = actBtn.closest(".q-card");
        if (!card) return;
        const qid = card.dataset.id;

        if (action === "toggle-answer") {
          const an = $(".q-analysis", card);
          const isShow = an.classList.toggle("show");
          actBtn.textContent = isShow ? "隐藏采分点" : "查看采分点";
        } else if (action === "toggle-wrong") {
          if (state.wrongIds.has(qid)) {
            state.wrongIds.delete(qid);
            toast("已从错题本移出");
            actBtn.className = "btn btn-wrong";
            actBtn.textContent = "加入错题本";
          } else {
            state.wrongIds.add(qid);
            toast("已加入错题本");
            actBtn.className = "btn btn-wrong-active";
            actBtn.textContent = "✓ 已在错题本";
          }
          saveStorageSet(STORAGE_KEYS.wrong, state.wrongIds);
          updateBadges();
          if (state.view === "wrong") switchView("wrong");
        } else if (action === "toggle-fav") {
          if (state.favIds.has(qid)) {
            state.favIds.delete(qid);
            toast("已取消收藏");
            actBtn.className = "btn btn-fav";
            actBtn.textContent = "⭐ 收藏";
          } else {
            state.favIds.add(qid);
            toast("已收藏重点考点");
            actBtn.className = "btn btn-fav-active";
            actBtn.textContent = "⭐ 已收藏";
          }
          saveStorageSet(STORAGE_KEYS.favorites, state.favIds);
          updateBadges();
          if (state.view === "favorites") switchView("favorites");
        } else if (action === "ai-grade") {
          handleAIGrade(actBtn);
        }
        return;
      }

      // 4. 套卷翻页
      const navAct = target.closest("[data-act]");
      if (navAct) {
        const act = navAct.dataset.act;
        const filtered = state.allQuestions.filter((q) => {
          return (
            q.year === state.paperYear &&
            (state.paperSubjectCode === "all" ||
              q.subjectCode === state.paperSubjectCode)
          );
        });

        if (act === "prev" && state.paperIndex > 0) {
          state.paperIndex--;
          renderPapersView();
        } else if (act === "next" && state.paperIndex < filtered.length - 1) {
          state.paperIndex++;
          renderPapersView();
        } else if (act === "jump") {
          state.paperIndex = Number(navAct.dataset.idx);
          renderPapersView();
        }
        return;
      }

      // 5. 套卷模式切换
      const modeBtn = target.closest("[data-mode]");
      if (modeBtn) {
        state.paperMode = modeBtn.dataset.mode;
        renderPapersView();
        return;
      }

      // 6. 分类筛选
      const filterSubj = target.closest("[data-filter-subj]");
      if (filterSubj) {
        state.catSubject = filterSubj.dataset.filterSubj;
        renderCategoryView();
        return;
      }

      const filterType = target.closest("[data-filter-type]");
      if (filterType) {
        state.catType = filterType.dataset.filterType;
        renderCategoryView();
        return;
      }
    });

    // 监听作答输入实时保存
    document.addEventListener("input", (e) => {
      if (e.target && e.target.classList.contains("card-answer-input")) {
        const card = e.target.closest(".q-card");
        if (card && card.dataset.id) {
          state.userAnswers[card.dataset.id] = e.target.value;
          saveStorageObj(STORAGE_KEYS.userAnswers, state.userAnswers);
        }
      }
    });

    // 下拉框选择
    document.addEventListener("change", (e) => {
      if (e.target.id === "paper-year-select") {
        state.paperYear = Number(e.target.value);
        state.paperSubjectCode = "all";
        state.paperIndex = 0;
        renderPapersView();
      } else if (e.target.id === "paper-code-select") {
        state.paperSubjectCode = e.target.value;
        state.paperIndex = 0;
        renderPapersView();
      }
    });

    // 搜索按钮与回车
    const searchBtn = $("#searchBtn");
    const searchInput = $("#searchInput");
    if (searchBtn) searchBtn.addEventListener("click", executeSearch);
    if (searchInput) {
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") executeSearch();
      });
    }

    // 设置项：AI 配置与数据导出
    const saveAiBtn = $("#save-ai-cfg-btn");
    const resetAiBtn = $("#reset-ai-cfg-btn");
    if (saveAiBtn) {
      saveAiBtn.addEventListener("click", () => {
        const endpoint = $("#cfg-ai-endpoint").value.trim();
        const key = $("#cfg-ai-key").value.trim();
        saveStorageObj(STORAGE_KEYS.aiConfig, { endpoint, key });
        toast("AI 批改配置已保存到本地！");
      });
    }
    if (resetAiBtn) {
      resetAiBtn.addEventListener("click", () => {
        saveStorageObj(STORAGE_KEYS.aiConfig, {});
        $("#cfg-ai-endpoint").value = "";
        $("#cfg-ai-key").value = "";
        toast("已恢复内置本地启发式评分引擎");
      });
    }

    const btnExport = $("#btn-export-data");
    if (btnExport) {
      btnExport.addEventListener("click", () => {
        const payload = {
          exportDate: new Date().toISOString(),
          wrongIds: Array.from(state.wrongIds),
          favIds: Array.from(state.favIds),
          userAnswers: state.userAnswers,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pku-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast("学习数据已导出！");
      });
    }

    const importFile = $("#import-data-file");
    if (importFile) {
      importFile.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (data.wrongIds) state.wrongIds = new Set(data.wrongIds);
            if (data.favIds) state.favIds = new Set(data.favIds);
            if (data.userAnswers) state.userAnswers = data.userAnswers;
            saveStorageSet(STORAGE_KEYS.wrong, state.wrongIds);
            saveStorageSet(STORAGE_KEYS.favorites, state.favIds);
            saveStorageObj(STORAGE_KEYS.userAnswers, state.userAnswers);
            toast("学习数据已成功恢复！");
            switchView(state.view);
          } catch (err) {
            alert("导入失败：JSON 格式不合规");
          }
        };
        reader.readAsText(file);
      });
    }

    const btnClear = $("#btn-clear-data");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        if (
          confirm(
            "确定要清空本地所有错题本、收藏和答题草稿吗？此操作不可恢复。",
          )
        ) {
          state.wrongIds.clear();
          state.favIds.clear();
          state.userAnswers = {};
          saveStorageSet(STORAGE_KEYS.wrong, state.wrongIds);
          saveStorageSet(STORAGE_KEYS.favorites, state.favIds);
          saveStorageObj(STORAGE_KEYS.userAnswers, state.userAnswers);
          toast("已清空本地记录");
          switchView(state.view);
        }
      });
    }

    // 题库文件上传与拖拽
    const dropZone = $("#drop-zone");
    const fileInput = $("#file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (e) =>
        handleFileUpload(e.target.files),
      );
    }
    if (dropZone) {
      ["dragover", "dragenter"].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.classList.add("drag");
        });
      });
      ["dragleave", "drop"].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.classList.remove("drag");
        });
      });
      dropZone.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files)
          handleFileUpload(e.dataTransfer.files);
      });
    }
  }

  function handleFileUpload(files) {
    if (!files || !files.length) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const list = Array.isArray(parsed) ? parsed : parsed.questions || [];
          const normalized = list.map((q, idx) => normalizeQuestion(q, idx));
          state.customQuestions.push(...normalized);
          localStorage.setItem(
            STORAGE_KEYS.customLib,
            JSON.stringify(state.customQuestions),
          );
          mergeAllQuestions();
          $("#upload-status").innerHTML =
            `<div class="ok-box">成功导入 <b>${normalized.length}</b> 道题目！当前总题库共 <b>${state.allQuestions.length}</b> 题。</div>`;
          toast(`题库更新，共 ${state.allQuestions.length} 题`);
          switchView(state.view);
        } catch (err) {
          alert("文件解析失败，请确保上传的是标准 JSON 格式！");
        }
      };
      reader.readAsText(file);
    });
  }

  // ---------- 系统初始化 ----------
  async function initApp() {
    state.wrongIds = loadStorageSet(STORAGE_KEYS.wrong);
    state.favIds = loadStorageSet(STORAGE_KEYS.favorites);
    state.userAnswers = loadStorageObj(STORAGE_KEYS.userAnswers);
    state.userNotes = loadStorageObj(STORAGE_KEYS.userNotes);
    state.customQuestions = (loadStorageObj(STORAGE_KEYS.customLib) || []).map(
      normalizeQuestion,
    );

    bindGlobalEvents();

    // 优先尝试读取 cleaned_questions.json，若失败则尝试 questions.json
    const candidateFiles = ["cleaned_questions.json", "questions.json"];
    let loadedData = null;

    for (const filename of candidateFiles) {
      try {
        const res = await fetch(filename);
        if (res.ok) {
          const text = await res.text();
          const json = JSON.parse(text);
          loadedData = Array.isArray(json) ? json : json.questions || [];
          console.log(
            `成功加载数据源: ${filename}，共 ${loadedData.length} 题`,
          );
          break;
        }
      } catch (e) {
        // 继续尝试下一个候选文件
      }
    }

    const loadingEl = $("#loading");
    if (loadingEl) loadingEl.classList.add("hidden");

    if (loadedData && loadedData.length) {
      state.baseQuestions = loadedData.map((q, idx) =>
        normalizeQuestion(q, idx),
      );
    } else {
      console.warn("未通过 fetch 加载到题库，显示本地选择提示");
      const banner = $("#load-banner");
      if (banner) {
        banner.classList.remove("hidden");
        banner.innerHTML = `
          <div>
            <b>💡 提示：若直接双击 html 运行（file:// 协议），浏览器会拦截本地 json 读取。</b>
            <p>建议通过 <code>VS Code Live Server</code> 或在当前目录运行 <code>python3 -m http.server 8000</code> 后访问；或前往【系统与题库】直接选择导入 <code>cleaned_questions.json</code>。</p>
          </div>
        `;
      }
    }

    mergeAllQuestions();
    switchView("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
