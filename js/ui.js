// ui.js — DOM 操作与事件绑定

const UI = {
  _editingId: null,
  _currentRange: 'all',
  _prevSnapshot: null,
  _allDates: [],
  _formFields: ['f-income', 'f-cash', 'f-receivable', 'f-invest-inflow', 'f-invest-value'],

  $(sel) { return document.querySelector(sel); },
  $$(sel) { return document.querySelectorAll(sel); },

  toggleLanguage() {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
  },

  showView(viewId) {
    this.$$('.view').forEach(v => v.classList.add('hidden'));
    const el = document.getElementById(viewId);
    if (el) el.classList.remove('hidden');
  },

  // ─── Lock Screen ───

  async renderLockScreen() {
    const ledgers = await Store.listLedgers();
    const list = this.$('#ledger-list');
    list.innerHTML = '';

    const heading = document.createElement('div');
    heading.className = 'ledger-list-heading';
    heading.textContent = t('lockScreen.existingLedgers');
    list.appendChild(heading);

    const tip = document.createElement('div');
    tip.className = 'ledger-list-tip';
    tip.textContent = t('lockScreen.importTip');
    list.appendChild(tip);

    if (ledgers.length === 0) return;

    for (const l of ledgers) {
      const row = document.createElement('div');
      row.className = 'ledger-row';
      const hintLabel = currentLang === 'zh' ? '提示' : 'Hint';
      const hintNone = currentLang === 'zh' ? '无' : 'None';
      const passPlaceholder = currentLang === 'zh' ? '密码' : 'Password';
      const unlockBtn = currentLang === 'zh' ? '解锁' : 'Unlock';
      const deleteBtn = currentLang === 'zh' ? '删除' : 'Delete';
      row.innerHTML = `
        <div class="ledger-row-info">
          <div class="ledger-row-name">${this._esc(l.name)}</div>
          <div class="ledger-row-hint">${hintLabel}: ${this._esc(l.hint || hintNone)}</div>
        </div>
        <div class="ledger-row-actions">
          <input type="password" class="ledger-password" placeholder="${passPlaceholder}" data-id="${l.id}" />
          <button class="btn btn-primary btn-sm" onclick="UI.handleUnlock('${l.id}')">${unlockBtn}</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); UI.handleDeleteLedger('${l.id}', '${this._esc(l.name)}')">${deleteBtn}</button>
        </div>
      `;
      list.appendChild(row);
    }
  },

  toggleCreateCard() {},

  showCreateModal() {
    this.$('#new-ledger-name').value = '';
    this.$('#new-ledger-password').value = '';
    this.$('#new-ledger-password-confirm').value = '';
    this.$('#new-ledger-hint').value = '';
    this.$('#create-modal').classList.remove('hidden');
  },

  hideCreateModal() {
    this.$('#create-modal').classList.add('hidden');
  },

  closeCreateModal(e) {
    if (e.target.id === 'create-modal') this.hideCreateModal();
  },

  async handleUnlock(ledgerId) {
    const input = this.$(`input[data-id="${ledgerId}"]`);
    const password = input ? input.value : '';
    if (!password) { alert(currentLang === 'zh' ? '请输入密码' : 'Please enter password'); return; }
    try {
      await Store.unlockLedger(ledgerId, password);
      await this.enterMainView();
      this._showBackupReminderIfNeeded();
    } catch (e) {
      if (e.message === 'Invalid password') {
        alert(currentLang === 'zh' ? '密码错误' : 'Incorrect password');
      } else {
        alert(currentLang === 'zh' ? '解锁失败: ' : 'Unlock failed: ' + e.message);
      }
    }
  },

  async handleCreateLedger() {
    const name = this.$('#new-ledger-name').value.trim();
    const password = this.$('#new-ledger-password').value;
    const confirm = this.$('#new-ledger-password-confirm').value;
    const hint = this.$('#new-ledger-hint').value.trim();
    if (!name) { alert(currentLang === 'zh' ? '请输入账本名称' : 'Please enter ledger name'); return; }
    if (!password || password.length < 4) { alert(currentLang === 'zh' ? '密码至少4位' : 'Password must be at least 4 characters'); return; }
    if (password !== confirm) { alert(currentLang === 'zh' ? '两次密码输入不一致' : 'Passwords do not match'); return; }
    try {
      await Store.createLedger(name, password, hint);
      this.hideCreateModal();
      await this.enterMainView();
      this._showBackupReminderIfNeeded();
    } catch (e) {
      alert(currentLang === 'zh' ? '创建失败: ' : 'Creation failed: ' + e.message);
    }
  },

  async handleDeleteLedger(ledgerId, name) {
    const confirm1 = currentLang === 'zh'
      ? `确定要删除账本「${name}」吗？此操作不可恢复！`
      : `Are you sure you want to delete ledger "${name}"? This action cannot be undone!`;
    const confirm2 = currentLang === 'zh'
      ? '再次确认：删除后数据不可恢复，是否继续？'
      : 'Confirm again: Data cannot be recovered after deletion, continue?';
    const confirm3 = currentLang === 'zh'
      ? '最后确认：真的要删除吗？'
      : 'Final confirmation: Really delete?';
    if (!confirm(confirm1)) return;
    if (!confirm(confirm2)) return;
    if (!confirm(confirm3)) return;
    try {
      await Store.deleteLedger(ledgerId);
      await this.renderLockScreen();
    } catch (e) {
      alert(currentLang === 'zh' ? '删除失败: ' : 'Deletion failed: ' + e.message);
    }
  },

  // ─── Main View ───

  async handleRefresh() {
    await this.refreshData();
  },

  async enterMainView() {
    const meta = (await Store.listLedgers()).find(l => l.id === Store.currentLedgerId);
    this.$('#current-ledger-name').textContent = meta ? meta.name : '';
    this._renderLastExportTime();
    this.showView('view-main');
    await this.refreshData();
    window.addEventListener('resize', () => Dashboard.resize());
  },

  async refreshData() {
    const snapshots = await Store.getAllSnapshots();
    this.renderTable(snapshots);
    Dashboard.renderAssetTrend(snapshots, this._currentRange);
    Dashboard.renderPNL(snapshots, this._currentRange);
    Dashboard.renderComposition(snapshots);
  },

  renderTable(snapshots) {
    const tbody = this.$('#ledger-tbody');
    const sorted = [...snapshots].sort((a, b) => b.record_date.localeCompare(a.record_date));
    tbody.innerHTML = '';

    if (sorted.length === 0) {
      const emptyMsg = currentLang === 'zh' ? '暂无数据，请录入第一条快照' : 'No data yet, please add your first snapshot';
      tbody.innerHTML = `<tr><td colspan="12" class="empty-state">${emptyMsg}</td></tr>`;
      return;
    }

    for (const s of sorted) {
      const tr = document.createElement('tr');
      const viewBtn = currentLang === 'zh' ? '查看' : 'View';
      const editBtn = currentLang === 'zh' ? '编辑' : 'Edit';
      tr.innerHTML = `
        <td>${s.record_date}</td>
        <td class="num">${IO.formatMoney(s.income)}</td>
        <td class="num">${IO.formatMoney(s.cash_pool)}</td>
        <td class="num">${IO.formatMoney(s.investment_inflow)}</td>
        <td class="num">${IO.formatMoney(s.investment_market_value)}</td>
        <td class="num">${IO.formatMoney(s.accounts_receivable)}</td>
        <td class="num highlight">${IO.formatMoney(s.net_asset)}</td>
        <td class="num ${s.derived_expense > 0 ? 'negative' : ''}">${IO.formatMoney(s.derived_expense)}</td>
        <td class="actions">
          <button class="btn btn-sm" onclick="UI.showDetail('${s.id}')">${viewBtn}</button>
          <button class="btn btn-sm" onclick="UI.editSnapshot('${s.id}')">${editBtn}</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  },

  // ─── Form ───

  _initFormListeners() {
    for (const id of this._formFields) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this._updateExpensePreview());
    }
    const dateEl = document.getElementById('f-date');
    if (dateEl) dateEl.addEventListener('change', () => this._checkDateDuplicate());
  },

  _checkDateDuplicate() {
    const warning = this.$('#f-date-warning');
    if (!warning) return;
    const dateVal = this.$('#f-date').value;
    if (!dateVal) { warning.classList.add('hidden'); return; }
    const editingDate = this._editingId
      ? this._allDates.find((_, i, arr) => arr[i] === dateVal)
      : null;
    const exists = this._allDates.includes(dateVal);
    if (exists && !this._editingId) {
      const msg = currentLang === 'zh'
        ? `日期 ${dateVal} 已存在记录，无法重复录入。如需修改请使用表格中的"编辑"按钮。`
        : `Date ${dateVal} already exists. Cannot enter duplicate. Use the "Edit" button in the table to modify.`;
      warning.textContent = msg;
      warning.classList.remove('hidden');
    } else {
      warning.classList.add('hidden');
    }
  },

  _updateExpensePreview() {
    const el = this.$('#f-expense-preview');
    if (!el) return;
    const cashInput = this.$('#f-cash').value;
    if (!cashInput && cashInput !== '0' && cashInput !== 0) {
      el.textContent = currentLang === 'zh' ? '请先填写现金池总额' : 'Please enter cash pool total first';
      el.classList.remove('negative');
      const warning = this.$('#f-expense-warning');
      if (warning) warning.classList.add('hidden');
      return;
    }
    const income = parseFloat(this.$('#f-income').value) || 0;
    const cash = parseFloat(cashInput) || 0;
    const receivable = parseFloat(this.$('#f-receivable').value) || 0;
    const investInflow = parseFloat(this.$('#f-invest-inflow').value) || 0;

    let expense = 0;
    if (this._prevSnapshot) {
      const prevLiquid = this._prevSnapshot.cash_pool + this._prevSnapshot.accounts_receivable;
      expense = income - ((cash + receivable) - prevLiquid) - investInflow;
    }
    el.textContent = IO.formatMoney(expense);
    el.classList.toggle('negative', expense > 0);
    const warning = this.$('#f-expense-warning');
    if (warning) warning.classList.toggle('hidden', expense >= 0);
  },

  async showForm(snapshot) {
    this._editingId = snapshot ? snapshot.id : null;
    this.$('#form-modal').classList.remove('hidden');

    // Load snapshots for defaults and date check
    const snapshots = await Store.getAllSnapshots();
    this._allDates = snapshots.map(s => s.record_date);
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    if (this._editingId) {
      const idx = sorted.findIndex(s => s.id === this._editingId);
      this._prevSnapshot = idx > 0 ? sorted[idx - 1] : null;
    } else {
      this._prevSnapshot = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    }

    if (snapshot) {
      this.$('#f-date').value = snapshot.record_date || '';
      this.$('#f-income').value = snapshot.income || 0;
      this.$('#f-income-note').value = snapshot.income_note || '';
      this.$('#f-cash').value = snapshot.cash_pool || 0;
      this.$('#f-receivable').value = snapshot.accounts_receivable || 0;
      this.$('#f-receivable-note').value = snapshot.receivable_note || '';
      this.$('#f-invest-inflow').value = snapshot.investment_inflow || 0;
      this.$('#f-invest-inflow-note').value = snapshot.investment_inflow_note || '';
      this.$('#f-invest-value').value = snapshot.investment_market_value || 0;
      this.$('#f-invest-note').value = snapshot.investment_note || '';
      this.$('#f-expense-note').value = snapshot.expense_note || '';
      this.$('#form-title').textContent = currentLang === 'zh' ? '编辑快照' : 'Edit Snapshot';
      this.$('#form-delete-btn').style.display = '';
    } else {
      const today = new Date().toISOString().slice(0, 10);
      this.$('#f-date').value = today;
      this.$('#f-income').value = 0;
      this.$('#f-income-note').value = '';
      this.$('#f-cash').value = '';
      this.$('#f-invest-inflow').value = 0;
      this.$('#f-invest-inflow-note').value = '';
      this.$('#f-expense-note').value = '';
      if (this._prevSnapshot) {
        this.$('#f-receivable').value = this._prevSnapshot.accounts_receivable ?? 0;
        this.$('#f-invest-value').value = this._prevSnapshot.investment_market_value ?? 0;
        this.$('#f-invest-note').value = this._prevSnapshot.investment_note ?? '';
        this.$('#f-receivable-note').value = this._prevSnapshot.receivable_note ?? '';
        this.$('#f-invest-inflow-note').value = this._prevSnapshot.investment_inflow_note ?? '';
      } else {
        this.$('#f-receivable').value = 0;
        this.$('#f-invest-value').value = 0;
        this.$('#f-invest-note').value = '';
        this.$('#f-receivable-note').value = '';
        this.$('#f-invest-inflow-note').value = '';
      }
      this.$('#form-title').textContent = currentLang === 'zh' ? '新增快照' : 'Add Snapshot';
      this.$('#form-delete-btn').style.display = 'none';
    }

    this._updateExpensePreview();
    this._checkDateDuplicate();
    if (!this._formListenerReady) {
      this._initFormListeners();
      this._formListenerReady = true;
    }
  },

  hideForm() {
    this.$('#form-modal').classList.add('hidden');
    this._editingId = null;
    this._prevSnapshot = null;
  },

  closeFormModal(e) {
    if (e.target.id === 'form-modal') this.hideForm();
  },

  async handleSave() {
    let dateVal = this.$('#f-date').value;
    if (!dateVal) dateVal = new Date().toISOString().slice(0, 10);
    const cashVal = this.$('#f-cash').value;
    if (!cashVal && cashVal !== '0' && cashVal !== 0) { alert(currentLang === 'zh' ? '请填写现金池总额' : 'Please enter cash pool total'); return; }

    const raw = {
      id: this._editingId || crypto.randomUUID(),
      record_date: dateVal,
      income: parseFloat(this.$('#f-income').value) || 0,
      income_note: this.$('#f-income-note').value.trim(),
      cash_pool: parseFloat(this.$('#f-cash').value) || 0,
      accounts_receivable: parseFloat(this.$('#f-receivable').value) || 0,
      receivable_note: this.$('#f-receivable-note').value.trim(),
      investment_inflow: parseFloat(this.$('#f-invest-inflow').value) || 0,
      investment_inflow_note: this.$('#f-invest-inflow-note').value.trim(),
      investment_market_value: parseFloat(this.$('#f-invest-value').value) || 0,
      investment_note: this.$('#f-invest-note').value.trim(),
      expense_note: this.$('#f-expense-note').value.trim(),
    };

    try {
      await Store.updateSnapshot(raw);
      this.hideForm();
      await this.refreshData();
    } catch (e) {
      if (e.message && e.message.includes('uniqueness')) {
        const msg = currentLang === 'zh'
          ? `日期 ${dateVal} 已存在快照记录。\n\n不建议同一天多次录入，您可以在表格中点击该日期快照的"编辑"按钮来修改已有数据。`
          : `Date ${dateVal} already exists.\n\nMultiple entries on the same day is not recommended. You can click the "Edit" button for that date in the table to modify existing data.`;
        alert(msg);
      } else {
        alert(currentLang === 'zh' ? '保存失败: ' : 'Save failed: ' + e.message);
      }
    }
  },

  async editSnapshot(id) {
    const snapshots = await Store.getAllSnapshots();
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const s = sorted.find(x => x.id === id);
    if (!s) return;
    if (sorted.length > 1 && s.record_date !== sorted[sorted.length - 1].record_date) {
      const msg = currentLang === 'zh'
        ? '提示：您正在编辑非最新一期的历史数据，保存后该日期之后的所有快照的衍生数据（开销、收益率等）将重新计算。'
        : 'Notice: You are editing historical data that is not the latest period. After saving, the derived data (expenses, returns, etc.) of all snapshots after this date will be recalculated.';
      alert(msg);
    }
    this.showForm(s);
  },

  async handleDelete(id) {
    const confirm1 = currentLang === 'zh' ? '确定要删除这条快照吗？' : 'Are you sure you want to delete this snapshot?';
    const confirm2 = currentLang === 'zh' ? '再次确认：删除后数据不可恢复，是否继续？' : 'Confirm again: Data cannot be recovered after deletion, continue?';
    const confirm3 = currentLang === 'zh' ? '最后确认：真的要删除吗？' : 'Final confirmation: Really delete?';
    if (!confirm(confirm1)) return;
    if (!confirm(confirm2)) return;
    if (!confirm(confirm3)) return;
    try {
      await Store.deleteSnapshot(id);
      await this.refreshData();
    } catch (e) {
      alert(currentLang === 'zh' ? '删除失败: ' : 'Deletion failed: ' + e.message);
    }
  },

  async handleDeleteFromForm() {
    if (!this._editingId) return;
    const confirm1 = currentLang === 'zh' ? '确定要删除这条快照吗？' : 'Are you sure you want to delete this snapshot?';
    const confirm2 = currentLang === 'zh' ? '再次确认：删除后数据不可恢复，是否继续？' : 'Confirm again: Data cannot be recovered after deletion, continue?';
    const confirm3 = currentLang === 'zh' ? '最后确认：真的要删除吗？' : 'Final confirmation: Really delete?';
    if (!confirm(confirm1)) return;
    if (!confirm(confirm2)) return;
    if (!confirm(confirm3)) return;
    try {
      await Store.deleteSnapshot(this._editingId);
      this.hideForm();
      await this.refreshData();
    } catch (e) {
      alert(currentLang === 'zh' ? '删除失败: ' : 'Deletion failed: ' + e.message);
    }
  },

  // ─── Import / Export ───

  _exportTimestamp() {
    return new Date().toISOString().replace(/[T:]/g, '-').slice(0, 19);
  },

  async _currentLedgerName() {
    const ledgers = await Store.listLedgers();
    const meta = ledgers.find(l => l.id === Store.currentLedgerId);
    return meta ? meta.name : 'snapledger';
  },

  async handleExportCSV() {
    const msg = currentLang === 'zh'
      ? '导出文件为明文，未进行加密。请注意妥善保管导出文件，避免泄露个人财务数据。\n\n确认导出？'
      : 'Exported files are unencrypted. Please keep exported files safe to avoid leaking personal financial data.\n\nConfirm export?';
    if (!confirm(msg)) return;
    const snapshots = await Store.getAllSnapshots();
    const csv = IO.exportCSV(snapshots);
    const name = await this._currentLedgerName();
    IO.downloadFile(csv, `${name}_${this._exportTimestamp()}.csv`, 'text/csv;charset=utf-8');
    this._saveExportTime();
  },

  async handleExportJSON() {
    const msg = currentLang === 'zh'
      ? '导出文件为明文，未进行加密。请注意妥善保管导出文件，避免泄露个人财务数据。\n\n确认导出？'
      : 'Exported files are unencrypted. Please keep exported files safe to avoid leaking personal financial data.\n\nConfirm export?';
    if (!confirm(msg)) return;
    const snapshots = await Store.getAllSnapshots();
    const json = IO.exportJSON(snapshots);
    const name = await this._currentLedgerName();
    IO.downloadFile(json, `${name}_${this._exportTimestamp()}.json`, 'application/json');
    this._saveExportTime();
  },

  _saveExportTime() {
    if (!Store.currentLedgerId) return;
    const key = `snapledger_last_export_${Store.currentLedgerId}`;
    localStorage.setItem(key, new Date().toISOString());
    this._renderLastExportTime();
  },

  _renderLastExportTime() {
    const el = this.$('#last-export-time');
    if (!el || !Store.currentLedgerId) return;
    const iso = localStorage.getItem(`snapledger_last_export_${Store.currentLedgerId}`);
    el.classList.remove('export-badge-normal', 'export-badge-warn');
    if (!iso) {
      el.textContent = currentLang === 'zh' ? '尚未导出备份' : 'No backup exported yet';
      el.classList.add('export-badge-warn');
      return;
    }
    const d = new Date(iso);
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const daysSince = Math.floor((Date.now() - d.getTime()) / (86400000));
    if (daysSince > 30) {
      const msg = currentLang === 'zh'
        ? `上次导出: ${formatted}（已超过30天）`
        : `Last export: ${formatted} (over 30 days ago)`;
      el.textContent = msg;
      el.classList.add('export-badge-warn');
    } else {
      el.textContent = currentLang === 'zh' ? `上次导出: ${formatted}` : `Last export: ${formatted}`;
      el.classList.add('export-badge-normal');
    }
  },

  async handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await IO.readFile(file);
        const snapshots = file.name.endsWith('.json') ? IO.parseJSON(text) : IO.parseCSV(text);
        if (snapshots.length === 0) { alert(currentLang === 'zh' ? '没有有效数据' : 'No valid data'); return; }

        const modeMsg = currentLang === 'zh'
          ? '点击"确定"覆盖现有数据，点击"取消"合并数据'
          : 'Click "OK" to overwrite existing data, click "Cancel" to merge data';
        const successMsg = currentLang === 'zh' ? `成功导入 ${snapshots.length} 条记录` : `Successfully imported ${snapshots.length} records`;
        const failMsg = currentLang === 'zh' ? '导入失败: ' : 'Import failed: ';

        const mode = confirm(modeMsg) ? 'overwrite' : 'merge';
        await Store.importSnapshots(snapshots, mode);
        await this.refreshData();
        alert(successMsg);
      } catch (e) {
        alert(currentLang === 'zh' ? '导入失败: ' : 'Import failed: ' + e.message);
      }
    };
    input.click();
  },

  setRange(range) {
    this._currentRange = range;
    this.$$('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === range));
    this.refreshData();
  },

  handleLock() {
    Store.lock();
    this.showView('view-lock');
    this.renderLockScreen();
  },

  _showBackupReminderIfNeeded() {
    const mutedUntil = localStorage.getItem('snapledger_backup_mute_until');
    if (mutedUntil && Date.now() < parseInt(mutedUntil, 10)) return;
    const lastExport = Store.currentLedgerId
      ? localStorage.getItem(`snapledger_last_export_${Store.currentLedgerId}`)
      : null;
    if (lastExport) {
      const daysSince = Math.floor((Date.now() - new Date(lastExport).getTime()) / 86400000);
      if (daysSince <= 30) return;
    }
    const checkbox = this.$('#backup-mute-checkbox');
    if (checkbox) checkbox.checked = false;
    this.$('#backup-modal').classList.remove('hidden');
  },

  hideBackupModal() {
    this.$('#backup-modal').classList.add('hidden');
  },

  confirmBackupReminder() {
    const checkbox = this.$('#backup-mute-checkbox');
    if (checkbox && checkbox.checked) {
      const muteUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('snapledger_backup_mute_until', muteUntil.toString());
    }
    this.hideBackupModal();
  },

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  // ─── Detail Modal ───

  async showDetail(id) {
    const snapshots = await Store.getAllSnapshots();
    const s = snapshots.find(x => x.id === id);
    if (!s) return;

    const labels = currentLang === 'zh' ? {
      detailTitle: '快照详情',
      date: '快照日期',
      income: '收入',
      incomeTotal: '本期总收入',
      incomeNote: '收入说明',
      cashReceivable: '现金与应收',
      cashTotal: '现金池总额',
      receivable: '应收账款',
      receivableNote: '应收账款说明',
      invest: '投资',
      investInflow: '投资净转入',
      inflowNote: '转入说明',
      investValue: '持仓市值',
      investNote: '持仓说明',
      autoCalc: '自动计算',
      netAssets: '当前总净资产',
      expense: '倒推实际开销',
      expenseNote: '开销说明',
      none: '—'
    } : {
      detailTitle: 'Snapshot Details',
      date: 'Snapshot Date',
      income: 'Income',
      incomeTotal: 'Period Income',
      incomeNote: 'Income Note',
      cashReceivable: 'Cash & Receivables',
      cashTotal: 'Cash Pool Total',
      receivable: 'Receivables',
      receivableNote: 'Receivables Note',
      invest: 'Investment',
      investInflow: 'Net Invest Inflow',
      inflowNote: 'Inflow Note',
      investValue: 'Holdings Value',
      investNote: 'Holdings Note',
      autoCalc: 'Auto Calculated',
      netAssets: 'Current Net Assets',
      expense: 'Actual Expense',
      expenseNote: 'Expense Note',
      none: '—'
    };

    this.$('#detail-title').textContent = `${s.record_date} ${labels.detailTitle}`;
    this.$('#detail-content').innerHTML = `
      <div class="detail-section">
        <div class="detail-row"><span class="detail-label">${labels.date}</span><span class="detail-value">${s.record_date}</span></div>
      </div>
      <div class="detail-section">
        <h4>${labels.income}</h4>
        <div class="detail-row"><span class="detail-label">${labels.incomeTotal}</span><span class="detail-value">${IO.formatMoney(s.income)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.incomeNote}</span><span class="detail-value">${this._esc(s.income_note) || labels.none}</span></div>
      </div>
      <div class="detail-section">
        <h4>${labels.cashReceivable}</h4>
        <div class="detail-row"><span class="detail-label">${labels.cashTotal}</span><span class="detail-value">${IO.formatMoney(s.cash_pool)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.receivable}</span><span class="detail-value">${IO.formatMoney(s.accounts_receivable)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.receivableNote}</span><span class="detail-value">${this._esc(s.receivable_note) || labels.none}</span></div>
      </div>
      <div class="detail-section">
        <h4>${labels.invest}</h4>
        <div class="detail-row"><span class="detail-label">${labels.investInflow}</span><span class="detail-value">${IO.formatMoney(s.investment_inflow)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.inflowNote}</span><span class="detail-value">${this._esc(s.investment_inflow_note) || labels.none}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.investValue}</span><span class="detail-value">${IO.formatMoney(s.investment_market_value)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.investNote}</span><span class="detail-value">${this._esc(s.investment_note) || labels.none}</span></div>
      </div>
      <div class="detail-section">
        <h4>${labels.autoCalc}</h4>
        <div class="detail-row"><span class="detail-label">${labels.netAssets}</span><span class="detail-value highlight">${IO.formatMoney(s.net_asset)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.expense}</span><span class="detail-value ${s.derived_expense > 0 ? 'negative' : ''}">${IO.formatMoney(s.derived_expense)}</span></div>
        <div class="detail-row"><span class="detail-label">${labels.expenseNote}</span><span class="detail-value">${this._esc(s.expense_note) || labels.none}</span></div>
      </div>
    `;
    this.$('#detail-modal').classList.remove('hidden');
  },

  hideDetailModal() {
    this.$('#detail-modal').classList.add('hidden');
  },

  closeDetailModal(e) {
    if (e.target.id === 'detail-modal') this.hideDetailModal();
  },

  _initGlobalListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this.$('#backup-modal').classList.contains('hidden')) this.hideBackupModal();
      else if (!this.$('#detail-modal').classList.contains('hidden')) this.hideDetailModal();
      else if (!this.$('#form-modal').classList.contains('hidden')) this.hideForm();
      else if (!this.$('#create-modal').classList.contains('hidden')) this.hideCreateModal();
    });
  },
};
