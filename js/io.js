// io.js — CSV/JSON 导入导出

const IO = {
  CSV_COLUMNS: [
    'record_date', 'income', 'income_note', 'cash_pool', 'investment_inflow',
    'investment_inflow_note', 'investment_market_value', 'investment_note',
    'accounts_receivable', 'receivable_note', 'net_asset', 'derived_expense', 'expense_note'
  ],

  CSV_HEADERS_ZH: [
    '快照日期', '本期总收入', '收入说明', '现金池总额', '非现金持仓买入',
    '非现金持仓买入说明', '非现金持仓市值', '非现金持仓说明',
    '应收账款', '应收账款说明', '当前总净资产', '倒推实际开销', '开销说明'
  ],

  formatMoney(val) {
    if (val === 0 || val === undefined || val === null) return '¥0.00';
    return '¥' + val.toFixed(2);
  },

  exportCSV(snapshots) {
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const rows = [this.CSV_HEADERS_ZH.join(',')];
    for (const s of sorted) {
      const row = this.CSV_COLUMNS.map(col => {
        const val = s[col];
        if (val === undefined || val === null) return '';
        if (typeof val === 'string') {
          // Escape commas and quotes in strings
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }
        return val;
      });
      rows.push(row.join(','));
    }
    return rows.join('\n');
  },

  exportJSON(snapshots) {
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    return JSON.stringify(sorted, null, 2);
  },

  downloadFile(content, filename, mimeType) {
    const bom = mimeType.includes('csv') ? '﻿' : '';
    const blob = new Blob([bom + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV 文件至少需要表头和一行数据');

    const headerLine = lines[0];
    const headers = this._parseCSVLine(headerLine);

    // Map Chinese headers to field keys
    const headerMap = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim();
      const idx = this.CSV_HEADERS_ZH.indexOf(h);
      if (idx >= 0) {
        headerMap[i] = this.CSV_COLUMNS[idx];
      } else if (this.CSV_COLUMNS.includes(h)) {
        headerMap[i] = h;
      }
    }

    const snapshots = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = this._parseCSVLine(lines[i]);
      const obj = { id: crypto.randomUUID() };
      for (let j = 0; j < values.length; j++) {
        const key = headerMap[j];
        if (!key) continue;
        const val = values[j].trim();
        if (['income', 'cash_pool', 'accounts_receivable', 'investment_inflow',
             'investment_market_value', 'net_asset', 'derived_expense', 'period_roi'].includes(key)) {
          obj[key] = parseFloat(val) || 0;
        } else {
          obj[key] = val;
        }
      }
      // Defaults for missing fields
      if (!obj.income_note) obj.income_note = '';
      if (!obj.receivable_note) obj.receivable_note = '';
      if (!obj.investment_note) obj.investment_note = '';
      if (!obj.expense_note) obj.expense_note = '';
      if (!obj.record_date) throw new Error(`第 ${i + 1} 行缺少快照日期`);
      snapshots.push(obj);
    }
    return snapshots;
  },

  parseJSON(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('JSON 必须是数组');
    return data.map(item => {
      const obj = { id: item.id || crypto.randomUUID() };
      for (const f of SnapshotSchema.fields) {
        obj[f.key] = item[f.key] !== undefined ? item[f.key] : (f.default !== undefined ? f.default : (f.type === 'number' ? 0 : ''));
      }
      if (!obj.record_date) throw new Error('每条记录必须有 record_date');
      return obj;
    });
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },

  _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  },
};
