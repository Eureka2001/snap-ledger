// ui.js — DOM 操作与事件绑定

const UI = {
  _editingId: null,
  _currentRange: 'all',
  _prevSnapshot: null,
  _allDates: [],
  _formFields: ['f-income', 'f-cash', 'f-receivable', 'f-invest-inflow', 'f-invest-value'],

  $(sel) { return document.querySelector(sel); },
  $$(sel) { return document.querySelectorAll(sel); },

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
    heading.textContent = '已有账本';
    list.appendChild(heading);

    const tip = document.createElement('div');
    tip.className = 'ledger-list-tip';
    tip.textContent = '导入已有数据：请先创建新账本并设置密码，进入主界面后使用"导入"功能恢复数据。';
    list.appendChild(tip);

    if (ledgers.length === 0) return;

    for (const l of ledgers) {
      const row = document.createElement('div');
      row.className = 'ledger-row';
      row.innerHTML = `
        <div class="ledger-row-info">
          <div class="ledger-row-name">${this._esc(l.name)}</div>
          <div class="ledger-row-hint">提示: ${this._esc(l.hint || '无')}</div>
        </div>
        <div class="ledger-row-actions">
          <input type="password" class="ledger-password" placeholder="密码" data-id="${l.id}" />
          <button class="btn btn-primary btn-sm" onclick="UI.handleUnlock('${l.id}')">解锁</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); UI.handleDeleteLedger('${l.id}', '${this._esc(l.name)}')">删除</button>
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
    if (!password) { alert('请输入密码'); return; }
    try {
      await Store.unlockLedger(ledgerId, password);
      await this.enterMainView();
      this._showBackupReminderIfNeeded();
    } catch (e) {
      if (e.message === 'Invalid password') {
        alert('密码错误');
      } else {
        alert('解锁失败: ' + e.message);
      }
    }
  },

  async handleCreateLedger() {
    const name = this.$('#new-ledger-name').value.trim();
    const password = this.$('#new-ledger-password').value;
    const confirm = this.$('#new-ledger-password-confirm').value;
    const hint = this.$('#new-ledger-hint').value.trim();
    if (!name) { alert('请输入账本名称'); return; }
    if (!password || password.length < 4) { alert('密码至少4位'); return; }
    if (password !== confirm) { alert('两次密码输入不一致'); return; }
    try {
      await Store.createLedger(name, password, hint);
      this.hideCreateModal();
      await this.enterMainView();
      this._showBackupReminderIfNeeded();
    } catch (e) {
      alert('创建失败: ' + e.message);
    }
  },

  async handleDeleteLedger(ledgerId, name) {
    if (!confirm(`确定要删除账本「${name}」吗？此操作不可恢复！`)) return;
    try {
      await Store.deleteLedger(ledgerId);
      await this.renderLockScreen();
    } catch (e) {
      alert('删除失败: ' + e.message);
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
      tbody.innerHTML = '<tr><td colspan="12" class="empty-state">暂无数据，请录入第一条快照</td></tr>';
      return;
    }

    for (const s of sorted) {
      const tr = document.createElement('tr');
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
          <button class="btn btn-sm" onclick="UI.showDetail('${s.id}')">查看</button>
          <button class="btn btn-sm" onclick="UI.editSnapshot('${s.id}')">编辑</button>
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
      ? this._allDates.find((_, i, arr) => arr[i] === dateVal)  // always allow editing own date
      : null;
    const exists = this._allDates.includes(dateVal);
    if (exists && !this._editingId) {
      warning.textContent = `日期 ${dateVal} 已存在记录，无法重复录入。如需修改请使用表格中的"编辑"按钮。`;
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
      el.textContent = '请先填写现金池总额';
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
      this.$('#form-title').textContent = '编辑快照';
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
      this.$('#form-title').textContent = '新增快照';
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
    if (!cashVal && cashVal !== '0' && cashVal !== 0) { alert('请填写现金池总额'); return; }

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
        alert(`日期 ${dateVal} 已存在快照记录。\n\n不建议同一天多次录入，您可以在表格中点击该日期快照的"编辑"按钮来修改已有数据。`);
      } else {
        alert('保存失败: ' + e.message);
      }
    }
  },

  async editSnapshot(id) {
    const snapshots = await Store.getAllSnapshots();
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const s = sorted.find(x => x.id === id);
    if (!s) return;
    if (sorted.length > 1 && s.record_date !== sorted[sorted.length - 1].record_date) {
      alert('提示：您正在编辑非最新一期的历史数据，保存后该日期之后的所有快照的衍生数据（开销、收益率等）将重新计算。');
    }
    this.showForm(s);
  },

  async handleDelete(id) {
    if (!confirm('确定要删除这条快照吗？')) return;
    if (!confirm('再次确认：删除后数据不可恢复，是否继续？')) return;
    if (!confirm('最后确认：真的要删除吗？')) return;
    try {
      await Store.deleteSnapshot(id);
      await this.refreshData();
    } catch (e) {
      alert('删除失败: ' + e.message);
    }
  },

  async handleDeleteFromForm() {
    if (!this._editingId) return;
    if (!confirm('确定要删除这条快照吗？')) return;
    if (!confirm('再次确认：删除后数据不可恢复，是否继续？')) return;
    if (!confirm('最后确认：真的要删除吗？')) return;
    try {
      await Store.deleteSnapshot(this._editingId);
      this.hideForm();
      await this.refreshData();
    } catch (e) {
      alert('删除失败: ' + e.message);
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
    if (!confirm('导出文件为明文，未进行加密。请注意妥善保管导出文件，避免泄露个人财务数据。\n\n确认导出？')) return;
    const snapshots = await Store.getAllSnapshots();
    const csv = IO.exportCSV(snapshots);
    const name = await this._currentLedgerName();
    IO.downloadFile(csv, `${name}_${this._exportTimestamp()}.csv`, 'text/csv;charset=utf-8');
    this._saveExportTime();
  },

  async handleExportJSON() {
    if (!confirm('导出文件为明文，未进行加密。请注意妥善保管导出文件，避免泄露个人财务数据。\n\n确认导出？')) return;
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
      el.textContent = '尚未导出备份';
      el.classList.add('export-badge-warn');
      return;
    }
    const d = new Date(iso);
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const daysSince = Math.floor((Date.now() - d.getTime()) / (86400000));
    if (daysSince > 30) {
      el.textContent = `上次导出: ${formatted}（已超过30天）`;
      el.classList.add('export-badge-warn');
    } else {
      el.textContent = `上次导出: ${formatted}`;
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
        if (snapshots.length === 0) { alert('没有有效数据'); return; }

        const mode = confirm('点击"确定"覆盖现有数据，点击"取消"合并数据') ? 'overwrite' : 'merge';
        await Store.importSnapshots(snapshots, mode);
        await this.refreshData();
        alert(`成功导入 ${snapshots.length} 条记录`);
      } catch (e) {
        alert('导入失败: ' + e.message);
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

    this.$('#detail-title').textContent = `${s.record_date} 快照详情`;
    this.$('#detail-content').innerHTML = `
      <div class="detail-section">
        <div class="detail-row"><span class="detail-label">快照日期</span><span class="detail-value">${s.record_date}</span></div>
      </div>
      <div class="detail-section">
        <h4>收入</h4>
        <div class="detail-row"><span class="detail-label">本期总收入</span><span class="detail-value">${IO.formatMoney(s.income)}</span></div>
        <div class="detail-row"><span class="detail-label">收入说明</span><span class="detail-value">${this._esc(s.income_note) || '—'}</span></div>
      </div>
      <div class="detail-section">
        <h4>现金与应收</h4>
        <div class="detail-row"><span class="detail-label">现金池总额</span><span class="detail-value">${IO.formatMoney(s.cash_pool)}</span></div>
        <div class="detail-row"><span class="detail-label">应收账款</span><span class="detail-value">${IO.formatMoney(s.accounts_receivable)}</span></div>
        <div class="detail-row"><span class="detail-label">应收账款说明</span><span class="detail-value">${this._esc(s.receivable_note) || '—'}</span></div>
      </div>
      <div class="detail-section">
        <h4>投资</h4>
        <div class="detail-row"><span class="detail-label">投资净转入</span><span class="detail-value">${IO.formatMoney(s.investment_inflow)}</span></div>
        <div class="detail-row"><span class="detail-label">转入说明</span><span class="detail-value">${this._esc(s.investment_inflow_note) || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">持仓市值</span><span class="detail-value">${IO.formatMoney(s.investment_market_value)}</span></div>
        <div class="detail-row"><span class="detail-label">持仓说明</span><span class="detail-value">${this._esc(s.investment_note) || '—'}</span></div>
      </div>
      <div class="detail-section">
        <h4>自动计算</h4>
        <div class="detail-row"><span class="detail-label">当前总净资产</span><span class="detail-value highlight">${IO.formatMoney(s.net_asset)}</span></div>
        <div class="detail-row"><span class="detail-label">倒推实际开销</span><span class="detail-value ${s.derived_expense > 0 ? 'negative' : ''}">${IO.formatMoney(s.derived_expense)}</span></div>
        <div class="detail-row"><span class="detail-label">开销说明</span><span class="detail-value">${this._esc(s.expense_note) || '—'}</span></div>
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
