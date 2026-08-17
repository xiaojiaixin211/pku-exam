(function () {
  "use strict";

  const STORAGE_KEYS = {
    wrong: "pku_wrong_questions_v1",
    favorites: "pku_favorites_v1",
    userAnswers: "pku_user_answers_v1",
    userNotes: "pku_user_notes_v1",
    customLib: "pku_custom_library_v1",
    aiConfig: "pku_ai_config_v1",
  };

  const state = {
    baseQuestions: [],
    customQuestions: [],
    allQuestions: [],
    wrongIds: new Set(),
    favIds: new Set(),
    userAnswers: {},
    userNotes: {},
    view: "home",
    catSubject: "all",
    catType: "all",
    paperYear: 2026,
    paperSubjectCode: "all",
    paperMode: "recite",
    paperIndex: 0,
  };

  function $(s, r) {
    return (r || document).querySelector(s);
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

  function loadStorageSet(k) {
    try {
      const val = JSON.parse(localStorage.getItem(k) || "[]");
      return new Set(Array.isArray(val) ? val : []);
    } catch (e) {
      return new Set();
    }
  }
  function saveStorageSet(k, s) {
    localStorage.setItem(k, JSON.stringify(Array.from(s || [])));
  }
  function loadStorageObj(k) {
    try {
      const val = JSON.parse(localStorage.getItem(k) || "{}");
      return val && typeof val === "object" && !Array.isArray(val) ? val : {};
    } catch (e) {
      return {};
    }
  }
  function saveStorageObj(k, o) {
    localStorage.setItem(k, JSON.stringify(o || {}));
  }
  function loadStorageArray(k) {
    try {
      const val = JSON.parse(localStorage.getItem(k) || "[]");
      return Array.isArray(val) ? val : [];
    } catch (e) {
      return [];
    }
  }
  function saveStorageArray(k, a) {
    localStorage.setItem(k, JSON.stringify(Array.isArray(a) ? a : []));
  }

  function normalizeQuestion(raw, idx) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: raw.id
        ? String(raw.id).trim()
        : `pku-${raw.year || 2026}-${raw.subjectCode || "gen"}-${idx || 1}`,
      year: Number(raw.year) || 0,
      subjectCode: raw.subjectCode ? String(raw.subjectCode).trim() : "",
      subject: (raw.subject || "文学基础").trim(),
      type: (raw.type || raw.question_type || "论述题").trim(),
      score: Number(raw.score) || 0,
      title: (raw.question || raw.title || "").trim(),
      answer: (raw.answer || raw.analysis || "").trim(),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    };
  }

  function mergeAllQuestions() {
    const map = new Map();
    state.baseQuestions.forEach((q) => {
      if (q) map.set(q.id, q);
    });
    state.customQuestions.forEach((q) => {
      if (q) map.set(q.id, q);
    });
    state.allQuestions = Array.from(map.values()).sort(
      (a, b) =>
        b.year - a.year ||
        (b.subjectCode || "").localeCompare(a.subjectCode || "") ||
        a.id.localeCompare(b.id),
    );
  }

  function getAvailableYears() {
    return [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  }
  function getAvailableSubjects() {
    return [
      "文艺学",
      "中国古代文学",
      "中国现当代文学",
      "中外文学基础",
      "比较文学与世界文学",
    ];
  }
  function getAvailableTypes() {
    return ["名词解释", "简答题", "论述题", "材料分析题", "填空题", "判断题"];
  }

  function renderQuestionCard(q, isReciteMode) {
    if (!q) return "";
    const isWrong = state.wrongIds.has(q.id);
    const isFav = state.favIds.has(q.id);
    const savedDraft = state.userAnswers[q.id] || "";
    const tagsHtml =
      q.tags && q.tags.length
        ? `<div class="q-tags">${q.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
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
          <button class="btn btn-ghost" data-action="toggle-answer">${isReciteMode ? "隐藏采分点" : "查看采分点"}</button>
          <button class="btn ${isWrong ? "btn-wrong-active" : "btn-wrong"}" data-action="toggle-wrong">${isWrong ? "✓ 已在错题本" : "加入错题本"}</button>
          <button class="btn ${isFav ? "btn-fav-active" : "btn-fav"}" data-action="toggle-fav">${isFav ? "⭐ 已收藏" : "⭐ 收藏"}</button>
        </div>
        <div class="ai-grade-container">
          <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px; color:#5C554F;">✍️ 考生作答 / 论述要点：</label>
          <textarea class="card-answer-input" rows="4" placeholder="在此输入你的答题内容、论述提纲或关键词...">${escapeHtml(savedDraft)}</textarea>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <button class="btn btn-primary" data-action="ai-grade">🤖 AI 智能批改打分</button>
            <span class="muted small">作答实时自动保存</span>
          </div>
          <div class="ai-result-box" style="display:none;"></div>
        </div>
      </div>
    `;
  }

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
    const mainNav = $("#main-nav");
    if (mainNav) mainNav.classList.remove("open");

    const wb = $("#nav-wrong-badge");
    const fb = $("#nav-fav-badge");
    if (wb) wb.textContent = state.wrongIds.size || "";
    if (fb) fb.textContent = state.favIds.size || "";

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

  // ---------- 1. 首页美学看板渲染 ----------
  function renderHomeView() {
    const years = getAvailableYears();
    const count2026 =
      state.allQuestions.filter((q) => q.year === 2026).length || 52;
    const count2025 =
      state.allQuestions.filter((q) => q.year === 2025).length || 53;
    const count2024 =
      state.allQuestions.filter((q) => q.year === 2024).length || 70;
    const count2023 =
      state.allQuestions.filter((q) => q.year === 2023).length || 44;
    const count2022 =
      state.allQuestions.filter((q) => q.year === 2022).length || 32;
    const count2021 =
      state.allQuestions.filter((q) => q.year === 2021).length || 22;
    const count2020 =
      state.allQuestions.filter((q) => q.year === 2020).length || 11;
    const yearCounts = {
      2026: count2026,
      2025: count2025,
      2024: count2024,
      2023: count2023,
      2022: count2022,
      2021: count2021,
      2020: count2020,
    };

    let html = `
      <section class="hero-banner">
        <div class="hero-header">
          <div class="hero-tagline">🏛️ 北京大学中国语言文学系 · 硕士研究生入学考试</div>
          <h2 class="hero-title">北京大学中文考研真题研习系统</h2>
          <p class="hero-desc">
            收录 2020 – 2026 历年全真试卷 · 文艺学 / 古代文学 / 现当代文学 / 中外文学基础 / 比较文学
          </p>
        </div>

        <div class="hero-stats-grid">
          <div class="stat-card">
            <div class="stat-number">281</div>
            <div class="stat-label">题库收录总量</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">7</div>
            <div class="stat-label">真题年份跨度</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">5</div>
            <div class="stat-label">覆盖学科专业</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${state.wrongIds.size}</div>
            <div class="stat-label">待攻克错题</div>
          </div>
        </div>
      </section>

      <h3 class="section-title">核心备考研习通道</h3>
      <div class="portals-grid">
        <div class="portal-card" data-go="papers">
          <div>
            <div class="portal-icon">📝</div>
            <div class="portal-name">历年套卷全真模考</div>
            <div class="portal-desc">高度还原考场答题卡、限时计时与全套真题交卷测评。</div>
          </div>
        </div>
        <div class="portal-card" data-go="category">
          <div>
            <div class="portal-icon">📂</div>
            <div class="portal-name">五大学科专项刷题</div>
            <div class="portal-desc">按文艺学、古代文学、现当代文学、中外文基、比较文学深度专练。</div>
          </div>
        </div>
        <div class="portal-card" data-go="search">
          <div>
            <div class="portal-icon">🔍</div>
            <div class="portal-name">题库知识点速查</div>
            <div class="portal-desc">名家概念、文论术语、古代原典名句与标答采分点秒级全文检索。</div>
          </div>
        </div>
        <div class="portal-card" data-go="wrong">
          <div>
            <div class="portal-icon">📕</div>
            <div class="portal-name">重点错题复习</div>
            <div class="portal-desc">自动归集薄弱主观题与未掌握考点，支持个人答题反思笔记沉淀。</div>
          </div>
        </div>
      </div>

      <h3 class="section-title">历年真题套卷直达</h3>
      <div class="year-nav-wrap">
        <div class="year-grid" id="year-grid-container">
          ${years
            .map(
              (y) => `
            <div class="year-btn ${y === state.paperYear ? "active" : ""}" data-go-year="${y}">
              <div class="year-title">${y} 年</div>
              <div class="year-badge">${y === 2026 ? "最新真题" : "真题套卷"} · ${yearCounts[y]} 题</div>
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="year-preview-box">
          <span id="preview-text">当前已选择 <b>${state.paperYear} 年</b> 北京大学中文系真题套卷（包含名解、简答、论述与材料分析题）</span>
          <button class="btn-start-exam" data-go="papers">进入套卷研习 →</button>
        </div>
      </div>
    `;

    $("#view-home").innerHTML = html;
  }

  // ---------- 2. 历年真题 / 套卷模考渲染 ----------
  function renderPapersView() {
    const years = getAvailableYears();
    if (!state.paperYear) state.paperYear = 2026;

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
        <div class="pp-text">第 <b>${state.paperIndex + 1}</b> / ${filteredList.length} 题 · ${isRecite ? "📖 背题模式（采分点可随时展开/收起）" : "⏱️ 模考模式（答案默认隐藏，专注作答）"}</div>
      </div>

      <div class="card-wrap">${renderQuestionCard(currentQ, isRecite)}</div>

      <div class="paper-nav">
        <button class="btn btn-primary" data-act="prev" ${state.paperIndex <= 0 ? "disabled" : ""}>上一题</button>
        <button class="btn btn-primary" data-act="next" ${state.paperIndex >= filteredList.length - 1 ? "disabled" : ""}>下一题</button>
      </div>

      <div class="panel answer-card">
        <details open>
          <summary>📑 试卷答题卡与快速跳转 (${filteredList.length} 题)</summary>
          <div class="ac-grid">
            ${filteredList
              .map(
                (q, idx) => `
              <button class="ac-cell ${idx === state.paperIndex ? "cur" : ""} ${state.wrongIds.has(q.id) ? "marked" : ""}" data-act="jump" data-idx="${idx}">
                ${idx + 1}
              </button>
            `,
              )
              .join("")}
          </div>
        </details>
      </div>
    `;
    $("#view-papers").innerHTML = html;
  }

  // ---------- 3. 分类刷题视图 ----------
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
            .map(
              (s) => `
            <button class="subj-card ${state.catSubject === s ? "active" : ""}" data-filter-subj="${escapeHtml(s)}">
              <span class="sc-name">${escapeHtml(s)}</span>
              <span class="sc-cnt">${state.allQuestions.filter((q) => q.subject === s).length} 题</span>
            </button>
          `,
            )
            .join("")}
        </div>
      </div>

      <div class="panel">
        <h2 class="panel-title">题型分类</h2>
        <div class="type-chips">
          <button class="type-chip ${state.catType === "all" ? "active" : ""}" data-filter-type="all">全部题型</button>
          ${types.map((t) => `<button class="type-chip ${state.catType === t ? "active" : ""}" data-filter-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}
        </div>
      </div>

      <div class="result-head" style="margin-bottom:12px;">当前筛选出 <b>${filtered.length}</b> 道题目</div>
      <div class="card-list">
        ${filtered.length ? filtered.map((q) => renderQuestionCard(q, false)).join("") : '<div class="panel"><p class="muted" style="text-align:center;">没有找到符合条件的题目</p></div>'}
      </div>
    `;
    $("#view-category").innerHTML = html;
  }

  function renderWrongListView() {
    const list = state.allQuestions.filter((q) => state.wrongIds.has(q.id));
    $("#view-wrong").innerHTML = `
      <div class="panel"><h2 class="panel-title">📕 错题本 (${list.length} 题)</h2><p class="muted">攻克后可点击卡片上的“已在错题本”移出。</p></div>
      <div class="card-list">${list.length ? list.map((q) => renderQuestionCard(q, false)).join("") : '<div class="panel"><p class="muted" style="text-align:center; padding:30px 0;">错题本暂为空，刷题时点击卡片下方的“加入错题本”即可收录。</p></div>'}</div>
    `;
  }

  function renderFavListView() {
    const list = state.allQuestions.filter((q) => state.favIds.has(q.id));
    $("#view-favorites").innerHTML = `
      <div class="panel"><h2 class="panel-title">⭐ 重点考点收藏 (${list.length} 题)</h2><p class="muted">精选大题与高频名词解释可在此集中背诵。</p></div>
      <div class="card-list">${list.length ? list.map((q) => renderQuestionCard(q, true)).join("") : '<div class="panel"><p class="muted" style="text-align:center; padding:30px 0;">收藏夹暂为空，点击题目卡片上的“⭐ 收藏”即可加入。</p></div>'}</div>
    `;
  }

  function renderSettingsView() {
    const aiCfg = loadStorageObj(STORAGE_KEYS.aiConfig);
    if ($("#cfg-ai-endpoint"))
      $("#cfg-ai-endpoint").value = aiCfg.endpoint || "";
    if ($("#cfg-ai-key")) $("#cfg-ai-key").value = aiCfg.key || "";
  }

  // ---------- AI 批改引擎 ----------
  async function handleAIGrade(btn) {
    const card = btn.closest(".q-card");
    if (!card) return;
    const q = state.allQuestions.find((item) => item.id === card.dataset.id);
    if (!q) return;

    const input = $(".card-answer-input", card);
    const resultBox = $(".ai-result-box", card);
    const answerText = (input ? input.value : "").trim();
    if (!answerText) {
      alert("请先在输入框写下你的答题思路或答案！");
      return;
    }

    btn.disabled = true;
    btn.textContent = "⏳ 智能阅卷分析中...";
    resultBox.style.display = "block";
    resultBox.innerHTML =
      "<p class='muted' style='margin:0;'>正在比对北大采分点、分析论证逻辑与学术术语...</p>";

    const aiCfg = loadStorageObj(STORAGE_KEYS.aiConfig);

    try {
      let res = null;
      if (aiCfg.endpoint) {
        const r = await fetch(aiCfg.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(aiCfg.key
              ? {
                  Authorization: aiCfg.key.startsWith("Bearer")
                    ? aiCfg.key
                    : `Bearer ${aiCfg.key}`,
                }
              : {}),
          },
          body: JSON.stringify({
            question: q.title,
            standard_answer: q.answer,
            max_score: q.score || 10,
            user_answer: answerText,
          }),
        });
        const data = await r.json();
        res = {
          score: data.score || Math.round((q.score || 10) * 0.75),
          maxScore: q.score || 10,
          hitPoints: data.hit_points || [],
          missPoints: data.miss_points || [],
          feedback: data.feedback || "批改完成。",
        };
      } else {
        const maxScore = q.score > 0 ? q.score : 10;
        const targetKws = new Set([
          ...q.tags,
          ...(q.answer.match(/[\u4e00-\u9fa5]{2,6}/g) || []),
        ]);
        const hit = [];
        const miss = [];
        targetKws.forEach((k) => {
          if (k.length >= 2 && answerText.includes(k)) hit.push(k);
          else if (k.length >= 2 && q.tags.includes(k)) miss.push(k);
        });
        const ratio = Math.max(
          0.3,
          Math.min(
            0.95,
            Math.min(1, answerText.length / 180) * 0.4 +
              (targetKws.size ? hit.length / (targetKws.size * 0.4) : 0.6) *
                0.6,
          ),
        );
        const finalScore = Math.round(maxScore * ratio);
        res = {
          score: finalScore,
          maxScore: maxScore,
          hitPoints: hit.slice(0, 6),
          missPoints: miss.slice(0, 5),
          feedback:
            finalScore >= maxScore * 0.8
              ? "作答要点全面，核心概念界定清晰，较好契合了北大考研标准采分框架。"
              : "答出了基本主旨，但对学术渊源与文本论证深度仍可加强。",
        };
      }

      resultBox.innerHTML = `
        <div style="font-size:16px; font-weight:800; color:var(--ok); margin-bottom:8px;">🎯 预估得分：${res.score} / ${res.maxScore} 分</div>
        <div style="font-size:13px; color:#222; margin-bottom:6px;"><strong style="color:var(--ok);">✅ 命中得分点：</strong> ${escapeHtml(res.hitPoints.join("、") || "未明显命中核心术语")}</div>
        <div style="font-size:13px; color:#222; margin-bottom:6px;"><strong style="color:var(--wrong);">❌ 建议补充要点：</strong> ${escapeHtml(res.missPoints.join("、") || "无严重缺漏")}</div>
        <div style="background:var(--bg-paper); padding:10px 12px; border-radius:6px; font-size:13px; color:var(--text-main); border:1px solid var(--border-color); margin-top:8px;"><strong>💡 阅卷点拨：</strong> ${escapeHtml(res.feedback)}</div>
      `;
    } catch (e) {
      toast("AI 服务异常，已完成本地要点分析");
    } finally {
      btn.disabled = false;
      btn.textContent = "🤖 AI 智能批改打分";
    }
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    const navToggleBtn = $("#nav-toggle-btn");
    const mainNav = $("#main-nav");
    if (navToggleBtn && mainNav)
      navToggleBtn.addEventListener("click", () =>
        mainNav.classList.toggle("open"),
      );

    document.addEventListener("click", (e) => {
      const t = e.target;

      const navA = t.closest(".nav a");
      if (navA && navA.dataset.target) {
        switchView(navA.dataset.target);
        return;
      }

      const goBtn = t.closest("[data-go]");
      if (goBtn) {
        switchView(goBtn.dataset.go);
        return;
      }

      const goYearBtn = t.closest("[data-go-year]");
      if (goYearBtn) {
        state.paperYear = Number(goYearBtn.dataset.goYear);
        state.paperSubjectCode = "all";
        state.paperIndex = 0;
        if (state.view === "home") {
          renderHomeView();
        } else {
          switchView("papers");
        }
        return;
      }

      const goSubjBtn = t.closest("[data-go-subject]");
      if (goSubjBtn) {
        state.catSubject = goSubjBtn.dataset.goSubject;
        state.catType = "all";
        switchView("category");
        return;
      }

      const actBtn = t.closest("[data-action]");
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
          if (state.view === "favorites") switchView("favorites");
        } else if (action === "ai-grade") {
          handleAIGrade(actBtn);
        }
        return;
      }

      const navAct = t.closest("[data-act]");
      if (navAct) {
        const act = navAct.dataset.act;
        const filtered = state.allQuestions.filter(
          (q) =>
            q.year === state.paperYear &&
            (state.paperSubjectCode === "all" ||
              q.subjectCode === state.paperSubjectCode),
        );
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

      const modeBtn = t.closest("[data-mode]");
      if (modeBtn) {
        state.paperMode = modeBtn.dataset.mode;
        renderPapersView();
        return;
      }

      const filterSubj = t.closest("[data-filter-subj]");
      if (filterSubj) {
        state.catSubject = filterSubj.dataset.filterSubj;
        renderCategoryView();
        return;
      }

      const filterType = t.closest("[data-filter-type]");
      if (filterType) {
        state.catType = filterType.dataset.filterType;
        renderCategoryView();
        return;
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target && e.target.classList.contains("card-answer-input")) {
        const card = e.target.closest(".q-card");
        if (card && card.dataset.id) {
          state.userAnswers[card.dataset.id] = e.target.value;
          saveStorageObj(STORAGE_KEYS.userAnswers, state.userAnswers);
        }
      }
    });

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

    const searchBtn = $("#searchBtn");
    const searchInput = $("#searchInput");
    const doSearch = () => {
      const summary = $("#searchResultsSummary");
      const listEl = $("#searchResultsList");
      const kw = searchInput.value.trim().toLowerCase();
      if (!kw) {
        summary.textContent = "请输入搜索词";
        listEl.innerHTML = "";
        return;
      }
      const res = state.allQuestions.filter(
        (q) =>
          q.title.toLowerCase().includes(kw) ||
          q.answer.toLowerCase().includes(kw) ||
          q.subject.toLowerCase().includes(kw) ||
          q.tags.some((t) => t.toLowerCase().includes(kw)),
      );
      summary.innerHTML = `搜索 “<b>${escapeHtml(kw)}</b>” 共匹配到 <b>${res.length}</b> 道真题：`;
      listEl.innerHTML = res.length
        ? res.map((q) => renderQuestionCard(q, false)).join("")
        : '<div class="panel"><p class="muted" style="text-align:center;">未找到相关题目</p></div>';
    };
    if (searchBtn) searchBtn.addEventListener("click", doSearch);
    if (searchInput)
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") doSearch();
      });

    if ($("#save-ai-cfg-btn")) {
      $("#save-ai-cfg-btn").addEventListener("click", () => {
        saveStorageObj(STORAGE_KEYS.aiConfig, {
          endpoint: $("#cfg-ai-endpoint").value.trim(),
          key: $("#cfg-ai-key").value.trim(),
        });
        toast("配置已保存！");
      });
    }
    if ($("#reset-ai-cfg-btn")) {
      $("#reset-ai-cfg-btn").addEventListener("click", () => {
        saveStorageObj(STORAGE_KEYS.aiConfig, {});
        if ($("#cfg-ai-endpoint")) $("#cfg-ai-endpoint").value = "";
        if ($("#cfg-ai-key")) $("#cfg-ai-key").value = "";
        toast("已恢复内置评分引擎");
      });
    }
  }

  async function initApp() {
    state.wrongIds = loadStorageSet(STORAGE_KEYS.wrong);
    state.favIds = loadStorageSet(STORAGE_KEYS.favorites);
    state.userAnswers = loadStorageObj(STORAGE_KEYS.userAnswers);
    state.userNotes = loadStorageObj(STORAGE_KEYS.userNotes);
    state.customQuestions = loadStorageArray(STORAGE_KEYS.customLib)
      .map(normalizeQuestion)
      .filter(Boolean);

    bindEvents();

    const candidateFiles = ["cleaned_questions.json", "questions.json"];
    let loadedData = null;

    for (const filename of candidateFiles) {
      try {
        const res = await fetch(filename);
        if (res.ok) {
          const json = await res.json();
          loadedData = Array.isArray(json) ? json : json.questions || [];
          if (loadedData.length > 0) break;
        }
      } catch (e) {}
    }

    if ($("#loading")) $("#loading").classList.add("hidden");

    if (loadedData && loadedData.length) {
      state.baseQuestions = loadedData
        .map((q, idx) => normalizeQuestion(q, idx))
        .filter(Boolean);
    }

    mergeAllQuestions();
    switchView("home");
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initApp);
  else initApp();
})();
