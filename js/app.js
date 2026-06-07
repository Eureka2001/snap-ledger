// app.js — 入口，初始化

(async function init() {
  try {
    initLang();
    UI._initGlobalListeners();
    await Store._open();
    await UI.renderLockScreen();
    UI.showView('view-lock');
  } catch (e) {
    console.error('Init failed:', e);
  }
})();
