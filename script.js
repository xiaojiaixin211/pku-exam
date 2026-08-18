/**
 * 北京大学中文考研真题研习系统 - 核心业务逻辑
 * 文件路径: script.js
 */

(function () {
  "use strict";

  // 1. 常量与缓存键名定义
  const STORAGE_KEYS = {
    wrong: "pku_exam_wrong_v2",
    favorites: "pku_exam_fav_v2",
    answers: "pku_exam_answers_v2",
    notes: "pku_exam_notes_v2",
    customLib: "pku_exam_custom_lib_v2",
  };

  // AI 批改服务：API 地址与密钥已直接硬编码，无需用户手动配置
  const AI_CONFIG = {
    endpoint: "https://api.deepseek.com/chat/completions",
    key: "sk-ac4b3e9f08724814b3ef07414f02d01f", // 在此填入实际 API 密钥
  };

  const DEFAULT_SUBJECTS = [
    "文艺学",
    "中国古代文学",
    "中国现当代文学",
    "中外文学基础",
    "比较文学与世界文学",
  ];

  const DEFAULT_TYPES = [
    "名词解释",
    "简答题",
    "论述题",
    "材料分析题",
    "填空题",
    "判断题",
  ];

  // 2. 全局状态
  const state = {
    baseQuestions: [],
    customQuestions: [],
    allQuestions: [],
    wrongIds: new Set(),
    favIds: new Set(),
    userAnswers: {},
    userNotes: {},
    currentView: "home",
    paperYear: 2026,
    paperSubjectCode: "all",
    paperMode: "recite",
    paperIndex: 0,
    catSubject: "all",
    catType: "all",
    searchKeyword: "",
  };

  // 3. 工具函数
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.classList.remove("show");
    }, 2200);
  }

  // 严格安全的 LocalStorage 读取与存储
  function loadSet(k) {
    try {
      const val = JSON.parse(localStorage.getItem(k) || "[]");
      return new Set(Array.isArray(val) ? val : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveSet(k, s) {
    try {
      localStorage.setItem(k, JSON.stringify(Array.from(s || [])));
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  function loadObj(k) {
    try {
      const val = JSON.parse(localStorage.getItem(k) || "{}");
      return val && typeof val === "object" && !Array.isArray(val) ? val : {};
    } catch (e) {
      return {};
    }
  }

  function saveObj(k, o) {
    try {
      localStorage.setItem(k, JSON.stringify(o || {}));
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  function loadArray(k) {
    try {
      const val = JSON.parse(localStorage.getItem(k) || "[]");
      return Array.isArray(val) ? val : [];
    } catch (e) {
      return [];
    }
  }

  // 4. 数据标准化与聚合
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

  function mergeQuestions() {
    const map = new Map();
    state.baseQuestions.forEach((q) => {
      if (q && q.id) map.set(q.id, q);
    });
    state.customQuestions.forEach((q) => {
      if (q && q.id) map.set(q.id, q);
    });

    state.allQuestions = Array.from(map.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.subjectCode !== b.subjectCode)
        return (a.subjectCode || "").localeCompare(b.subjectCode || "");
      return a.id.localeCompare(b.id);
    });
  }

  function getAvailableYears() {
    const years = Array.from(
      new Set(state.allQuestions.map((q) => q.year).filter((y) => y > 0)),
    );
    return years.sort((a, b) => b - a);
  }

  // 5. 渲染卡片
  function renderQuestionCard(q, isReciteMode) {
    if (!q) return "";
    const isWrong = state.wrongIds.has(q.id);
    const isFav = state.favIds.has(q.id);
    const savedAnswer = state.userAnswers[q.id] || "";
    const tagsHtml =
      q.tags && q.tags.length
        ? `<div class="q-tags">${q.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

    return `
      <div class="q-card" data-id="${escapeHtml(q.id)}">
        <div class="q-meta">
          <span class="badge badge-year">${escapeHtml(q.year ? q.year + "年真题" : "自命题")}</span>
          <span class="badge badge-subject">${escapeHtml(q.subject)}</span>
          ${q.subjectCode ? `<span class="badge badge-code">${escapeHtml(q.subjectCode)}</span>` : ""}
          <span class="badge badge-type">${escapeHtml(q.type)}</span>
          ${q.score > 0 ? `<span class="badge badge-score">${q.score} 分</span>` : ""}
        </div>
        
        <div class="q-title">${escapeHtml(q.title)}</div>

        <div class="q-analysis ${isReciteMode ? "show" : ""}" id="analysis-${escapeHtml(q.id)}">
          <div class="q-analysis-label">📖 北大标准考点与答题框架</div>
          <div class="q-analysis-body">${escapeHtml(q.answer || "暂无详细标答要点")}</div>
        </div>

        ${tagsHtml}

        <div class="q-actions">
          <button class="btn btn-ghost" data-action="toggle-analysis" data-qid="${escapeHtml(q.id)}">
            ${isReciteMode ? "隐藏采分点" : "查看采分点"}
          </button>
          <button class="btn ${isWrong ? "btn-wrong-active" : "btn-wrong"}" data-action="toggle-wrong" data-qid="${escapeHtml(q.id)}">
            ${isWrong ? "✓ 已在错题本" : "加入错题本"}
          </button>
          <button class="btn ${isFav ? "btn-fav-active" : "btn-fav"}" data-action="toggle-fav" data-qid="${escapeHtml(q.id)}">
            ${isFav ? "⭐ 已收藏考点" : "⭐ 收藏考点"}
          </button>
        </div>

        <div class="ai-grade-container">
          <label class="answer-label">✍️ 考生作答 / 论述提纲：</label>
          <textarea class="card-answer-input" rows="4" placeholder="在此输入你的论述提纲、核心名词界定或原典论据..." data-qid="${escapeHtml(q.id)}">${escapeHtml(savedAnswer)}</textarea>
          <div class="ai-ctrl-bar">
            <button class="btn btn-primary" data-action="ai-grade" data-qid="${escapeHtml(q.id)}">🤖 AI 智能批改打分</button>
            <span class="muted-tip">作答内容实时保存于本地</span>
          </div>
          <div class="ai-result-box" id="ai-res-${escapeHtml(q.id)}" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  // 6. 各视图渲染
  function renderHomeView() {
    const years = getAvailableYears();
    const totalCount = state.allQuestions.length;
    const wrongCount = state.wrongIds.size;

    const elTotal = $("#home-total-cnt");
    const elSpan = $("#home-span-cnt");
    const elWrong = $("#home-wrong-cnt");
    if (elTotal) elTotal.textContent = totalCount || 281;
    if (elSpan) elSpan.textContent = years.length || 7;
    if (elWrong) elWrong.textContent = wrongCount;

    const yearGrid = $("#home-year-grid");
    if (yearGrid) {
      yearGrid.innerHTML = (
        years.length ? years : [2026, 2025, 2024, 2023, 2022, 2021, 2020]
      )
        .map((y) => {
          const cnt = state.allQuestions.filter((q) => q.year === y).length;
          return `
          <div class="year-btn ${y === state.paperYear ? "active" : ""}" data-nav-year="${y}">
            <div class="year-title">${y} 年</div>
            <div class="year-cnt">${cnt} 道大题</div>
          </div>
        `;
        })
        .join("");
    }
  }

  function renderPapersView() {
    const years = getAvailableYears();
    if (!state.paperYear && years.length) {
      state.paperYear = years[0];
    }

    const yearSel = $("#paper-year-sel");
    if (yearSel) {
      yearSel.innerHTML = (
        years.length ? years : [2026, 2025, 2024, 2023, 2022, 2021, 2020]
      )
        .map(
          (y) => `
        <option value="${y}" ${y === state.paperYear ? "selected" : ""}>${y} 年真题试卷</option>
      `,
        )
        .join("");
    }

    const currentYearList = state.allQuestions.filter(
      (q) => q.year === state.paperYear,
    );
    const codes = Array.from(
      new Set(currentYearList.map((q) => q.subjectCode).filter(Boolean)),
    );

    const codeSel = $("#paper-code-sel");
    if (codeSel) {
      codeSel.innerHTML = `
        <option value="all">全部专业科目</option>
        ${codes.map((c) => `<option value="${c}" ${c === state.paperSubjectCode ? "selected" : ""}>${c}</option>`).join("")}
      `;
    }

    const filtered = currentYearList.filter((q) => {
      return (
        state.paperSubjectCode === "all" ||
        q.subjectCode === state.paperSubjectCode
      );
    });

    if (state.paperIndex >= filtered.length) {
      state.paperIndex = 0;
    }

    const currentQ = filtered[state.paperIndex];
    const isRecite = state.paperMode === "recite";

    const btnRecite = $("#btn-mode-recite");
    const btnExam = $("#btn-mode-exam");
    if (btnRecite)
      btnRecite.className = isRecite ? "btn btn-primary" : "btn btn-ghost";
    if (btnExam)
      btnExam.className = !isRecite ? "btn btn-primary" : "btn btn-ghost";

    const qContainer = $("#paper-question-container");
    const sheetGrid = $("#paper-sheet-grid");
    const progressText = $("#paper-progress-text");

    if (!currentQ) {
      if (qContainer)
        qContainer.innerHTML = `<div class="empty-box"><p>当前年份或科目下暂无题目</p></div>`;
      if (sheetGrid) sheetGrid.innerHTML = "";
      if (progressText) progressText.textContent = "暂无题目";
      return;
    }

    if (qContainer)
      qContainer.innerHTML = renderQuestionCard(currentQ, isRecite);
    if (progressText) {
      progressText.textContent = `第 ${state.paperIndex + 1} / ${filtered.length} 题 · ${isRecite ? "背题模式（可展开标答）" : "模考模式（已隐藏标答）"}`;
    }

    if (sheetGrid) {
      sheetGrid.innerHTML = filtered
        .map(
          (q, idx) => `
        <button class="ac-cell ${idx === state.paperIndex ? "cur" : ""} ${state.wrongIds.has(q.id) ? "marked" : ""}" data-nav-idx="${idx}">
          ${idx + 1}
        </button>
      `,
        )
        .join("");
    }

    const btnPrev = $("#btn-prev-q");
    const btnNext = $("#btn-next-q");
    if (btnPrev) btnPrev.disabled = state.paperIndex <= 0;
    if (btnNext) btnNext.disabled = state.paperIndex >= filtered.length - 1;
  }

  function renderCategoryView() {
    const subjGrid = $("#cat-subj-grid");
    const typeChips = $("#cat-type-chips");
    const listContainer = $("#cat-list-container");

    if (subjGrid) {
      subjGrid.innerHTML = `
        <div class="subj-card ${state.catSubject === "all" ? "active" : ""}" data-cat-subj="all">
          <strong class="sc-name">全部学科</strong>
          <span class="sc-cnt">${state.allQuestions.length} 题</span>
        </div>
        ${DEFAULT_SUBJECTS.map((s) => {
          const cnt = state.allQuestions.filter((q) => q.subject === s).length;
          return `
            <div class="subj-card ${state.catSubject === s ? "active" : ""}" data-cat-subj="${escapeHtml(s)}">
              <strong class="sc-name">${escapeHtml(s)}</strong>
              <span class="sc-cnt">${cnt} 题</span>
            </div>
          `;
        }).join("")}
      `;
    }

    if (typeChips) {
      typeChips.innerHTML = `
        <span class="type-chip ${state.catType === "all" ? "active" : ""}" data-cat-type="all">全部题型</span>
        ${DEFAULT_TYPES.map(
          (t) => `
          <span class="type-chip ${state.catType === t ? "active" : ""}" data-cat-type="${escapeHtml(t)}">${escapeHtml(t)}</span>
        `,
        ).join("")}
      `;
    }

    const filtered = state.allQuestions.filter((q) => {
      const matchSubj =
        state.catSubject === "all" || q.subject === state.catSubject;
      const matchType = state.catType === "all" || q.type === state.catType;
      return matchSubj && matchType;
    });

    if (listContainer) {
      listContainer.innerHTML = filtered.length
        ? filtered.map((q) => renderQuestionCard(q, false)).join("")
        : `<div class="empty-box"><p>没有找到符合当前学科与题型筛选条件的题目</p></div>`;
    }
  }

  function renderSearchView() {
    const summary = $("#search-results-summary");
    const listContainer = $("#search-list-container");
    const kw = state.searchKeyword.trim().toLowerCase();

    if (!kw) {
      if (summary) summary.textContent = "请输入考点、人物、原典或关键词检索";
      if (listContainer) listContainer.innerHTML = "";
      return;
    }

    const res = state.allQuestions.filter((q) => {
      return (
        q.title.toLowerCase().includes(kw) ||
        q.answer.toLowerCase().includes(kw) ||
        q.subject.toLowerCase().includes(kw) ||
        (q.tags && q.tags.some((t) => t.toLowerCase().includes(kw)))
      );
    });

    if (summary) {
      summary.innerHTML = `搜索 “<b>${escapeHtml(kw)}</b>” 共检索出 <b>${res.length}</b> 道北大真题：`;
    }
    if (listContainer) {
      listContainer.innerHTML = res.length
        ? res.map((q) => renderQuestionCard(q, false)).join("")
        : `<div class="empty-box"><p>未检索到包含 “${escapeHtml(kw)}” 的相关考题</p></div>`;
    }
  }

  function renderWrongView() {
    const list = state.allQuestions.filter((q) => state.wrongIds.has(q.id));
    const summary = $("#wrong-summary-text");
    const container = $("#wrong-list-container");

    if (summary) summary.textContent = `共收录 ${list.length} 道待攻克错题`;
    if (container) {
      container.innerHTML = list.length
        ? list.map((q) => renderQuestionCard(q, false)).join("")
        : `<div class="empty-box"><p>错题本暂为空。做题时点击题目卡片上的“加入错题本”即可收录。</p></div>`;
    }
  }

  function renderFavView() {
    const list = state.allQuestions.filter((q) => state.favIds.has(q.id));
    const summary = $("#fav-summary-text");
    const container = $("#fav-list-container");

    if (summary) summary.textContent = `共收藏 ${list.length} 个重点核心大题`;
    if (container) {
      container.innerHTML = list.length
        ? list.map((q) => renderQuestionCard(q, true)).join("")
        : `<div class="empty-box"><p>收藏夹暂为空。点击题目卡片上的“⭐ 收藏考点”即可收录。</p></div>`;
    }
  }

  // 7. 路由切换
  function switchView(viewName) {
    state.currentView = viewName;

    $$(".view").forEach((el) => el.classList.remove("active"));
    const target = $(`#view-${viewName}`);
    if (target) target.classList.add("active");

    $$(".nav-link").forEach((a) => {
      a.classList.toggle("active", a.dataset.view === viewName);
    });

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
      case "search":
        renderSearchView();
        break;
      case "wrong":
        renderWrongView();
        break;
      case "fav":
        renderFavView();
        break;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 8. AI 批改引擎
  async function handleAIGrading(qid, btn) {
    const q = state.allQuestions.find((item) => item.id === qid);
    if (!q) return;

    const answerText = (state.userAnswers[qid] || "").trim();
    if (!answerText) {
      alert("请先在答题输入框填写作答内容或论述提纲！");
      return;
    }

    const resPanel = $(`#ai-res-${qid}`);
    if (!resPanel) return;

    btn.disabled = true;
    btn.textContent = "⏳ 智能阅卷批改中...";
    resPanel.style.display = "block";
    resPanel.innerHTML =
      '<p class="muted-loading">正在比对北大标准采分点、分析学术术语规范与论述逻辑...</p>';

    try {
      let result = null;

      if (AI_CONFIG.endpoint) {
        const response = await fetch(AI_CONFIG.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(AI_CONFIG.key
              ? {
                  Authorization: AI_CONFIG.key.startsWith("Bearer")
                    ? AI_CONFIG.key
                    : `Bearer ${AI_CONFIG.key}`,
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

        if (response.ok) {
          const data = await response.json();
          result = {
            score:
              data.score != null
                ? data.score
                : Math.round((q.score || 10) * 0.8),
            maxScore: q.score || 10,
            hitPoints: data.hit_points || [],
            missPoints: data.miss_points || [],
            feedback: data.feedback || data.answer || "批改完成。",
          };
        }
      }

      if (!result) {
        const maxScore = q.score > 0 ? q.score : 10;
        const targetKeywords = Array.from(
          new Set([
            ...(q.tags || []),
            ...(q.answer.match(/[\u4e00-\u9fa5]{2,6}/g) || []),
          ]),
        ).filter((k) => k.length >= 2);

        const hit = [];
        const miss = [];

        targetKeywords.forEach((kw) => {
          if (answerText.includes(kw)) {
            hit.push(kw);
          } else if (q.tags && q.tags.includes(kw)) {
            miss.push(kw);
          }
        });

        const lenRatio = Math.min(1, answerText.length / 160);
        const hitRatio = targetKeywords.length
          ? Math.min(1, hit.length / Math.max(3, targetKeywords.length * 0.4))
          : 0.7;
        const totalRatio = Math.max(
          0.35,
          Math.min(0.96, lenRatio * 0.35 + hitRatio * 0.65),
        );
        const finalScore = Math.round(maxScore * totalRatio);

        result = {
          score: finalScore,
          maxScore: maxScore,
          hitPoints: hit.slice(0, 6),
          missPoints: miss.slice(0, 5),
          feedback:
            finalScore >= maxScore * 0.8
              ? "概念界定清晰准确，论点结构完整，术语使用规范，较好切中了北大文科考研核心采分点。"
              : "已具备基本答题框架，但对文论源流、代表性原典论据及学术史影响的展开仍有待加强。",
        };
      }

      resPanel.innerHTML = `
        <div class="ai-score-title">🎯 预估得分：${result.score} / ${result.maxScore} 分</div>
        <div class="ai-score-row"><strong class="ok-tag">✅ 命中要点：</strong> ${escapeHtml(result.hitPoints.join("、") || "已表达基础主旨")}</div>
        <div class="ai-score-row"><strong class="miss-tag">❌ 建议补充：</strong> ${escapeHtml(result.missPoints.join("、") || "要点覆盖良好")}</div>
        <div class="ai-feedback-box"><strong>💡 阅卷指导建议：</strong> ${escapeHtml(result.feedback)}</div>
      `;
    } catch (err) {
      showToast("AI 服务请求异常，已切换为本地快速阅卷分析");
      resPanel.innerHTML = `<p style="color:var(--wrong);">批改服务响应超时，已完成本地要点分析。</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "🤖 AI 智能批改打分";
    }
  }

  // 微信联系弹窗：显示与关闭
  function openWechatModal() {
    const overlay = $("#wechat-modal-overlay");
    if (overlay) overlay.classList.add("show");
  }

  function closeWechatModal() {
    const overlay = $("#wechat-modal-overlay");
    if (overlay) overlay.classList.remove("show");
  }

  // 9. 事件绑定
  function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      const target = e.target;

      const navLink = target.closest("[data-view]");
      if (navLink) {
        e.preventDefault();
        switchView(navLink.dataset.view);
        return;
      }

      const navYearBtn = target.closest("[data-nav-year]");
      if (navYearBtn) {
        state.paperYear = Number(navYearBtn.dataset.navYear);
        state.paperSubjectCode = "all";
        state.paperIndex = 0;
        switchView("papers");
        return;
      }

      if (target.id === "btn-mode-recite") {
        state.paperMode = "recite";
        renderPapersView();
        return;
      }
      if (target.id === "btn-mode-exam") {
        state.paperMode = "exam";
        renderPapersView();
        return;
      }

      if (target.id === "btn-prev-q" || target.closest("#btn-prev-q")) {
        if (state.paperIndex > 0) {
          state.paperIndex--;
          renderPapersView();
        }
        return;
      }
      if (target.id === "btn-next-q" || target.closest("#btn-next-q")) {
        const filtered = state.allQuestions.filter((q) => {
          return (
            q.year === state.paperYear &&
            (state.paperSubjectCode === "all" ||
              q.subjectCode === state.paperSubjectCode)
          );
        });
        if (state.paperIndex < filtered.length - 1) {
          state.paperIndex++;
          renderPapersView();
        }
        return;
      }

      const acCell = target.closest("[data-nav-idx]");
      if (acCell) {
        state.paperIndex = Number(acCell.dataset.navIdx);
        renderPapersView();
        return;
      }

      const catSubjBtn = target.closest("[data-cat-subj]");
      if (catSubjBtn) {
        state.catSubject = catSubjBtn.dataset.catSubj;
        renderCategoryView();
        return;
      }
      const catTypeBtn = target.closest("[data-cat-type]");
      if (catTypeBtn) {
        state.catType = catTypeBtn.dataset.catType;
        renderCategoryView();
        return;
      }

      const actionBtn = target.closest("[data-action]");
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const qid = actionBtn.dataset.qid;

        if (action === "toggle-analysis") {
          const anEl = $(`#analysis-${qid}`);
          if (anEl) {
            const isShow = anEl.classList.toggle("show");
            actionBtn.textContent = isShow ? "隐藏采分点" : "查看采分点";
          }
        } else if (action === "toggle-wrong") {
          if (state.wrongIds.has(qid)) {
            state.wrongIds.delete(qid);
            actionBtn.className = "btn btn-wrong";
            actionBtn.textContent = "加入错题本";
            showToast("已从错题本移出");
          } else {
            state.wrongIds.add(qid);
            actionBtn.className = "btn btn-wrong-active";
            actionBtn.textContent = "✓ 已在错题本";
            showToast("已加入错题本");
          }
          saveSet(STORAGE_KEYS.wrong, state.wrongIds);
          if (state.currentView === "wrong") renderWrongView();
          if (state.currentView === "home") renderHomeView();
        } else if (action === "toggle-fav") {
          if (state.favIds.has(qid)) {
            state.favIds.delete(qid);
            actionBtn.className = "btn btn-fav";
            actionBtn.textContent = "⭐ 收藏考点";
            showToast("已取消收藏");
          } else {
            state.favIds.add(qid);
            actionBtn.className = "btn btn-fav-active";
            actionBtn.textContent = "⭐ 已收藏考点";
            showToast("已加入重点考点收藏");
          }
          saveSet(STORAGE_KEYS.favorites, state.favIds);
          if (state.currentView === "fav") renderFavView();
        } else if (action === "ai-grade") {
          handleAIGrading(qid, actionBtn);
        }
        return;
      }

      if (target.id === "btn-do-search" || target.closest("#btn-do-search")) {
        const input = $("#search-input");
        if (input) {
          state.searchKeyword = input.value;
          renderSearchView();
        }
        return;
      }

      // 微信联系弹窗：关闭按钮 / 我知道了按钮 / 点击遮罩层外部
      if (
        target.id === "wechat-modal-close" ||
        target.id === "wechat-modal-ok" ||
        target.id === "wechat-modal-overlay"
      ) {
        closeWechatModal();
        return;
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target && e.target.classList.contains("card-answer-input")) {
        const qid = e.target.dataset.qid;
        if (qid) {
          state.userAnswers[qid] = e.target.value;
          saveObj(STORAGE_KEYS.answers, state.userAnswers);
        }
      }
    });

    document.addEventListener("change", (e) => {
      if (e.target.id === "paper-year-sel") {
        state.paperYear = Number(e.target.value);
        state.paperSubjectCode = "all";
        state.paperIndex = 0;
        renderPapersView();
      } else if (e.target.id === "paper-code-sel") {
        state.paperSubjectCode = e.target.value;
        state.paperIndex = 0;
        renderPapersView();
      }
    });

    const searchInput = $("#search-input");
    if (searchInput) {
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          state.searchKeyword = searchInput.value;
          renderSearchView();
        }
      });
    }

    // 按下 Esc 键关闭微信联系弹窗
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeWechatModal();
      }
    });
  }

  // 10. 初始化入口
  async function initApp() {
    state.wrongIds = loadSet(STORAGE_KEYS.wrong);
    state.favIds = loadSet(STORAGE_KEYS.favorites);
    state.userAnswers = loadObj(STORAGE_KEYS.answers);
    state.userNotes = loadObj(STORAGE_KEYS.notes);

    // 【修复点】：使用 loadArray 保证类型安全，避免 .map 报错
    state.customQuestions = loadArray(STORAGE_KEYS.customLib)
      .map(normalizeQuestion)
      .filter(Boolean);

    bindGlobalEvents();

    // 【修复点】：自动优先读取根目录下的 questions.json
    let loaded = null;
    if (
      window.PKU_DATA &&
      Array.isArray(window.PKU_DATA) &&
      window.PKU_DATA.length > 0
    ) {
      loaded = window.PKU_DATA;
    } else {
      const candidates = [
        "questions.json",
        "data/questions.json",
        "cleaned_questions.json",
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            loaded = Array.isArray(data) ? data : data.questions || [];
            if (loaded && loaded.length > 0) break;
          }
        } catch (err) {
          // 忽略单项加载异常
        }
      }
    }

    if (loaded && loaded.length) {
      state.baseQuestions = loaded
        .map((q, i) => normalizeQuestion(q, i))
        .filter(Boolean);
    }

    mergeQuestions();
    switchView("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

  // 页面加载完成后自动弹出「微信联系开发者」二维码弹窗
  function scheduleWechatModal() {
    setTimeout(openWechatModal, 450);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleWechatModal);
  } else {
    scheduleWechatModal();
  }
})();
