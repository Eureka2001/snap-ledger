// schema.js — 快照数据结构定义与校验

const SnapshotSchema = {
  fields: [
    { key: 'id', type: 'string', required: true, computed: false },
    { key: 'record_date', type: 'string', required: true, computed: false },
    { key: 'income', type: 'number', required: true, computed: false },
    { key: 'income_note', type: 'string', required: false, computed: false, default: '' },
    { key: 'cash_pool', type: 'number', required: true, computed: false },
    { key: 'accounts_receivable', type: 'number', required: true, computed: false },
    { key: 'receivable_note', type: 'string', required: false, computed: false, default: '' },
    { key: 'investment_inflow', type: 'number', required: true, computed: false },
    { key: 'investment_inflow_note', type: 'string', required: false, computed: false, default: '' },
    { key: 'investment_market_value', type: 'number', required: true, computed: false },
    { key: 'investment_note', type: 'string', required: false, computed: false, default: '' },
    { key: 'expense_note', type: 'string', required: false, computed: false, default: '' },
    { key: 'net_asset', type: 'number', required: true, computed: true },
    { key: 'derived_expense', type: 'number', required: true, computed: true },
    { key: 'period_roi', type: 'number', required: true, computed: true },
  ],

  userFields() {
    return this.fields.filter(f => !f.computed);
  },

  computedFields() {
    return this.fields.filter(f => f.computed);
  },

  create(raw) {
    const snapshot = {};
    for (const f of this.fields) {
      if (f.computed) {
        snapshot[f.key] = 0;
      } else if (raw[f.key] !== undefined) {
        snapshot[f.key] = raw[f.key];
      } else if (f.default !== undefined) {
        snapshot[f.key] = f.default;
      } else if (f.required) {
        throw new Error(`Missing required field: ${f.key}`);
      }
    }
    if (!snapshot.id) {
      snapshot.id = crypto.randomUUID();
    }
    return snapshot;
  },

  validate(snapshot) {
    const errors = [];
    for (const f of this.fields) {
      if (f.computed) continue;
      if (f.required && (snapshot[f.key] === undefined || snapshot[f.key] === null)) {
        errors.push(`Missing required field: ${f.key}`);
      }
      if (snapshot[f.key] !== undefined && f.type === 'number' && typeof snapshot[f.key] !== 'number') {
        errors.push(`Field ${f.key} must be a number`);
      }
      if (snapshot[f.key] !== undefined && f.type === 'string' && typeof snapshot[f.key] !== 'string') {
        errors.push(`Field ${f.key} must be a string`);
      }
    }
    if (snapshot.record_date && !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.record_date)) {
      errors.push('record_date must be YYYY-MM-DD format');
    }
    return errors;
  },
};
