/**
 * 北京大学中文考研真题研习系统 - 身份认证模块
 * 文件路径: auth.js
 *
 * 本文件独立负责账号密码登录/登出与登录态检查，不涉及任何刷题、搜索、
 * 收藏、错题本等业务逻辑（业务逻辑仍在 script.js 中）。
 *
 * 采用腾讯云开发 CloudBase Web SDK v3 官方身份认证能力：
 *   - app.auth.getSession()          检查当前登录状态
 *   - app.auth.signInWithPassword()  账号密码登录（管理员在 CloudBase 控制台创建账号）
 *   - app.auth.signOut()             退出登录
 *   - app.auth.onAuthStateChange()   监听登录状态变化
 *
 * 安全说明：
 *   - 本文件不包含任何第三方 API Key（如 DeepSeek），也不包含任何账号密码。
 *   - CloudBase 环境 ID 不是密钥，可以安全地出现在前端代码中。
 *   - 账号密码由用户在登录表单中输入，直接提交给腾讯云开发官方鉴权接口校验，
 *     本文件不做任何自定义的"假登录"校验，也不在本地保存账号密码。
 */

(function () {
  "use strict";

  // ------------------------------------------------------------------
  // 1. 基础配置
  // ------------------------------------------------------------------
  // CloudBase 环境 ID（非密钥，可安全公开）
  var CLOUDBASE_ENV_ID = "pku-exam-d7g1e0ne7916519ad";

  // 如果 CloudBase 控制台开启了 Publishable Key（可安全暴露在浏览器中），
  // 可以在此处填入以获得更完整的公开资源访问能力；不影响账号密码登录本身，
  // 留空也可以正常使用账号密码登录。
  var CLOUDBASE_ACCESS_KEY = "";

  var els = {};
  var app = null;
  var auth = null;
  var submitting = false;

  // ------------------------------------------------------------------
  // 2. 小工具
  // ------------------------------------------------------------------
  function $(selector) {
    return document.querySelector(selector);
  }

  function show(el) {
    if (el) el.style.display = "";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  function setLoginError(msg) {
    if (!els.loginError) return;
    els.loginError.textContent = msg || "";
    els.loginError.style.display = msg ? "block" : "none";
  }

  function setSubmitting(isSubmitting) {
    submitting = isSubmitting;
    if (els.loginBtn) {
      els.loginBtn.disabled = isSubmitting;
      els.loginBtn.textContent = isSubmitting ? "登录中..." : "登 录";
    }
    if (els.usernameInput) els.usernameInput.disabled = isSubmitting;
    if (els.passwordInput) els.passwordInput.disabled = isSubmitting;
  }
  async function handleCopyWechat() {
    var wechatId = "Xiao3297651464";

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(wechatId);
      } else {
        var textarea = document.createElement("textarea");
        textarea.value = wechatId;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();

        var copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("复制失败");
        }
      }

      if (els.copyWechatBtn) {
        els.copyWechatBtn.textContent = "已复制";
      }

      if (els.copyWechatMessage) {
        els.copyWechatMessage.textContent = "微信号已复制";
      }

      window.setTimeout(function () {
        if (els.copyWechatBtn) {
          els.copyWechatBtn.textContent = "复制";
        }
        if (els.copyWechatMessage) {
          els.copyWechatMessage.textContent = "";
        }
      }, 2000);
    } catch (err) {
      if (els.copyWechatMessage) {
        els.copyWechatMessage.textContent = "复制失败，请手动复制：" + wechatId;
      }
    }
  }

  // ------------------------------------------------------------------
  // 3. 视图切换：验证中 / 登录页 / 应用主体
  // ------------------------------------------------------------------
  function showCheckingScreen() {
    show(els.authChecking);
    hide(els.loginPage);
    hide(els.appRoot);
  }

  function showLoginScreen() {
    hide(els.authChecking);
    show(els.loginPage);
    hide(els.appRoot);
  }

  function showAppScreen(user) {
    hide(els.authChecking);
    hide(els.loginPage);
    show(els.appRoot);
    if (els.currentAccountName) {
      var name =
        (user && (user.username || user.email || user.phone || user.uid)) ||
        "已登录用户";
      els.currentAccountName.textContent = name;
    }
    window.dispatchEvent(
      new CustomEvent("pku:auth-ready", { detail: { user: user || null } }),
    );
  }

  // ------------------------------------------------------------------
  // 4. CloudBase 初始化
  // ------------------------------------------------------------------
  function initCloudbase() {
    if (typeof window.cloudbase === "undefined") {
      throw new Error("CloudBase SDK 未加载");
    }
    var initConfig = {
      env: CLOUDBASE_ENV_ID,
      region: "ap-shanghai",
    };
    if (CLOUDBASE_ACCESS_KEY) {
      initConfig.accessKey = CLOUDBASE_ACCESS_KEY;
    }
    app = window.cloudbase.init(initConfig);
    auth = app.auth;
    if (!auth) {
      throw new Error("CloudBase auth 模块未就绪");
    }
  }

  // ------------------------------------------------------------------
  // 5. 登录状态检查
  // ------------------------------------------------------------------
  async function checkLoginState() {
    var res = await auth.getSession();
    if (res && res.error) {
      // 未登录或 Session 失效，视为未登录，不视为致命错误
      return null;
    }
    var session = res && res.data && res.data.session;
    return session && session.user ? session.user : null;
  }

  // ------------------------------------------------------------------
  // 6. 登录 / 退出
  // ------------------------------------------------------------------
  async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    if (submitting) return;

    var username = (
      (els.usernameInput && els.usernameInput.value) ||
      ""
    ).trim();
    var password = (els.passwordInput && els.passwordInput.value) || "";

    setLoginError("");

    if (!username || !password) {
      setLoginError("请输入账号和密码");
      return;
    }

    setSubmitting(true);
    try {
      var res = await auth.signInWithPassword({
        username: username,
        password: password,
      });

      if (res && res.error) {
        // 出于安全考虑，不区分"用户不存在""密码错误""账号被禁用"等具体原因，
        // 统一提示通用错误信息，避免泄露账户是否存在。
        setLoginError("账号或密码错误，请重新输入或联系管理员");
        return;
      }

      var user = res && res.data && res.data.user;
      showAppScreen(user);
      if (els.passwordInput) els.passwordInput.value = "";
    } catch (err) {
      setLoginError("登录请求失败，请检查网络后重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    if (!auth) return;
    try {
      await auth.signOut();
    } catch (err) {
      // 忽略退出登录时的网络异常，仍然回到登录页
    }
    if (els.usernameInput) els.usernameInput.value = "";
    if (els.passwordInput) els.passwordInput.value = "";
    setLoginError("");
    showLoginScreen();
  }

  // ------------------------------------------------------------------
  // 7. 事件绑定
  // ------------------------------------------------------------------
  function bindEvents() {
    if (els.loginForm) {
      els.loginForm.addEventListener("submit", handleLoginSubmit);
    }
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", handleLogout);
    }
    if (els.copyWechatBtn) {
      els.copyWechatBtn.addEventListener("click", handleCopyWechat);
    }
    // 表单内的账号/密码输入框按 Enter 键会被浏览器原生触发 <form> 的 submit 事件，
    // 已由上面的 submit 监听处理，此处无需额外绑定 keydown，避免重复提交。
  }

  // 仅向业务脚本暴露必要能力。账号密码和 CloudBase 内部对象均不外泄。
  async function getAccessToken() {
    if (!auth) return null;
    var res = await auth.getSession();
    var session = res && res.data && res.data.session;
    return (session && session.access_token) || null;
  }

  async function callCloudFunction(name, data) {
    if (!app) throw new Error("CloudBase 尚未初始化");
    return app.callFunction({ name: name, data: data || {} });
  }

  async function handleUnauthorized() {
    if (auth) {
      try {
        await auth.signOut();
      } catch (err) {
        // 即使网络异常也回到登录页，避免继续展示受保护内容。
      }
    }
    showLoginScreen();
  }

  window.cloudbaseServices = {
    getAccessToken: getAccessToken,
    callFunction: callCloudFunction,
    handleUnauthorized: handleUnauthorized,
  };

  // ------------------------------------------------------------------
  // 8. 初始化入口
  // ------------------------------------------------------------------
  async function initAuth() {
    els.authChecking = $("#auth-checking");
    els.loginPage = $("#login-page");
    els.appRoot = $("#app-root");
    els.loginForm = $("#login-form");
    els.usernameInput = $("#login-username");
    els.passwordInput = $("#login-password");
    els.loginBtn = $("#login-submit-btn");
    els.loginError = $("#login-error");
    els.logoutBtn = $("#btn-logout");
    els.currentAccountName = $("#current-account-name");
    els.copyWechatBtn = $("#copy-wechat-btn");
    els.copyWechatMessage = $("#copy-wechat-message");

    bindEvents();
    showCheckingScreen();

    try {
      initCloudbase();
    } catch (err) {
      // 关键安全原则：SDK 加载/初始化失败时默认拒绝访问，停留在登录页，
      // 绝不能因为 SDK 加载失败而直接展示网站主体内容。
      console.error("CloudBase SDK 初始化失败：", err);
      setLoginError("登录服务初始化失败，请刷新页面重试");
      showLoginScreen();
      return;
    }

    try {
      var user = await checkLoginState();
      if (user) {
        showAppScreen(user);
      } else {
        showLoginScreen();
      }
    } catch (err) {
      // 登录状态检查失败（如网络异常）时同样默认拒绝访问，回到登录页。
      console.error("登录状态检查失败：", err);
      showLoginScreen();
    }

    // 监听登录状态变化（例如多标签页退出登录后同步）
    if (auth && typeof auth.onAuthStateChange === "function") {
      auth.onAuthStateChange(function (event, session) {
        if (event === "SIGNED_OUT") {
          showLoginScreen();
        } else if (event === "SIGNED_IN" && session && session.user) {
          showAppScreen(session.user);
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
