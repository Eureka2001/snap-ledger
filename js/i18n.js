const i18n = {
  zh: {
    app: {
      title: 'SnapLedger',
      slogan: '告别流水，看见变化。'
    },
    features: {
      snapshot: '资产快照 · 非流水账',
      local: '本地运行 · 零依赖',
      privacy: '加密存储 · 隐私优先'
    },
    lockScreen: {
      newLedger: '+ 新建账本',
      existingLedgers: '已有账本',
      importTip: '导入已有数据：请先创建新账本并设置密码，进入主界面后使用"导入"功能恢复数据。'
    },
    createModal: {
      title: '新建账本',
      close: '关闭',
      ledgerName: '账本名称',
      ledgerNamePlaceholder: '例如：我的账本',
      password: '密码',
      passwordPlaceholder: '至少4位',
      confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '再次输入',
      passwordHint: '密码提示',
      passwordHintPlaceholder: '防止忘记密码',
      create: '创建',
      cancel: '取消'
    },
    header: {
      refresh: '刷新',
      import: '导入',
      exportCSV: '导出 CSV',
      exportJSON: '导出 JSON',
      lock: '锁定'
    },
    main: {
      addSnapshot: '+ 新增快照'
    },
    table: {
      date: '日期',
      income: '收入',
      cash: '现金池',
      investInflow: '投资转入',
      investValue: '持仓市值',
      receivable: '应收账款',
      netAssets: '净资产',
      expense: '倒推开销',
      actions: '操作'
    },
    dashboard: {
      title: '数据看板',
      range3m: '3个月',
      range6m: '6个月',
      range1y: '1年',
      rangeAll: '全部',
      assetTrend: '资产走势',
      pnl: '收入 vs 开销',
      composition: '资产构成',
      netAssets: '净资产',
      cashPool: '现金池',
      investValue: '持仓市值',
      receivable: '应收账款',
      income: '收入',
      expense: '开销',
      wan: '万'
    },
    backupModal: {
      title: '数据安全提醒',
      close: '关闭',
      warning1: '您的所有数据仅存储在当前浏览器的 IndexedDB 中。',
      warning2: '如果您清理浏览器数据、更换浏览器或重装系统，且未提前导出备份，数据将永久丢失且无法恢复。',
      warning3: '强烈建议您定期使用"导出 JSON"或"导出 CSV"功能备份数据。',
      muteReminder: '一个月内不再提醒',
      gotIt: '我知道了'
    },
    detailModal: {
      title: '快照详情',
      close: '关闭'
    },
    formModal: {
      addTitle: '新增快照',
      editTitle: '编辑快照',
      close: '关闭',
      date: '快照日期',
      cash: '现金池总额',
      income: '本期总收入',
      incomeNote: '收入说明',
      receivable: '应收账款',
      receivableNote: '应收账款说明',
      investInflow: '投资净转入',
      investInflowNote: '投资净转入说明',
      investValue: '持仓市值',
      investNote: '持仓说明',
      expense: '倒推实际开销',
      expenseNote: '开销说明',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      expenseWarning: '开销为负值，请检查数据是否正确'
    }
  },
  en: {
    app: {
      title: 'SnapLedger',
      slogan: 'Skip the details. See the difference.'
    },
    features: {
      snapshot: 'Asset Snapshots · Not Transaction Logs',
      local: 'Local Execution · Zero Dependencies',
      privacy: 'Encrypted Storage · Privacy First'
    },
    lockScreen: {
      newLedger: '+ New Ledger',
      existingLedgers: 'Existing Ledgers',
      importTip: 'To import existing data: First create a new ledger and set a password, then use the "Import" function on the main interface to restore your data.'
    },
    createModal: {
      title: 'Create Ledger',
      close: 'Close',
      ledgerName: 'Ledger Name',
      ledgerNamePlaceholder: 'e.g., My Ledger',
      password: 'Password',
      passwordPlaceholder: 'At least 4 characters',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Enter again',
      passwordHint: 'Password Hint',
      passwordHintPlaceholder: 'To prevent forgetting',
      create: 'Create',
      cancel: 'Cancel'
    },
    header: {
      refresh: 'Refresh',
      import: 'Import',
      exportCSV: 'Export CSV',
      exportJSON: 'Export JSON',
      lock: 'Lock'
    },
    main: {
      addSnapshot: '+ Add Snapshot'
    },
    table: {
      date: 'Date',
      income: 'Income',
      cash: 'Cash Pool',
      investInflow: 'Invest Inflow',
      investValue: 'Holdings Value',
      receivable: 'Receivables',
      netAssets: 'Net Assets',
      expense: 'Expense',
      actions: 'Actions'
    },
    dashboard: {
      title: 'Dashboard',
      range3m: '3 Months',
      range6m: '6 Months',
      range1y: '1 Year',
      rangeAll: 'All',
      assetTrend: 'Asset Trend',
      pnl: 'Income vs Expense',
      composition: 'Asset Composition',
      netAssets: 'Net Assets',
      cashPool: 'Cash Pool',
      investValue: 'Holdings Value',
      receivable: 'Receivables',
      income: 'Income',
      expense: 'Expense',
      wan: '0k'
    },
    backupModal: {
      title: 'Data Security Reminder',
      close: 'Close',
      warning1: 'All your data is stored only in the current browser\'s IndexedDB.',
      warning2: 'If you clear browser data, switch browsers, or reinstall your system without exporting a backup in advance, your data will be permanently lost and cannot be recovered.',
      warning3: 'Strongly recommend regularly using "Export JSON" or "Export CSV" to backup your data.',
      muteReminder: 'Don\'t remind for a month',
      gotIt: 'Got it'
    },
    detailModal: {
      title: 'Snapshot Details',
      close: 'Close'
    },
    formModal: {
      addTitle: 'Add Snapshot',
      editTitle: 'Edit Snapshot',
      close: 'Close',
      date: 'Snapshot Date',
      cash: 'Cash Pool Total',
      income: 'Period Income',
      incomeNote: 'Income Note',
      receivable: 'Receivables',
      receivableNote: 'Receivables Note',
      investInflow: 'Net Invest Inflow',
      investInflowNote: 'Invest Inflow Note',
      investValue: 'Holdings Value',
      investNote: 'Holdings Note',
      expense: 'Actual Expense',
      expenseNote: 'Expense Note',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      expenseWarning: 'Expense is negative, please check your data'
    }
  }
};

let currentLang = 'zh';

function t(key) {
  const keys = key.split('.');
  let value = i18n[currentLang];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('snapledger-lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  updateUIText();
  const langBtn = document.getElementById('lang-btn');
  if (langBtn) langBtn.textContent = lang === 'zh' ? 'EN' : '中文';
  const lockLangBtn = document.getElementById('lock-lang-btn');
  if (lockLangBtn) lockLangBtn.textContent = lang === 'zh' ? 'EN' : '中文';
  // Re-render dynamic content
  if (UI._renderLastExportTime) UI._renderLastExportTime();
  if (UI.renderLockScreen && !document.getElementById('view-lock').classList.contains('hidden')) {
    UI.renderLockScreen();
  }
  if (UI.refreshData && !document.getElementById('view-main').classList.contains('hidden')) {
    UI.refreshData();
  }
}

function updateUIText() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

function initLang() {
  const savedLang = localStorage.getItem('snapledger-lang');
  if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
    setLang(savedLang);
  } else {
    const browserLang = navigator.language;
    setLang(browserLang.startsWith('zh') ? 'zh' : 'en');
  }
}
