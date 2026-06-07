// calc.js — 纯函数：净资产、倒推开销、收益率计算

const Calc = {
  netAsset(s) {
    return s.cash_pool + s.accounts_receivable + s.investment_market_value;
  },

  derivedExpense(current, prev) {
    if (!prev) return 0;
    const currentLiquid = current.cash_pool + current.accounts_receivable;
    const prevLiquid = prev.cash_pool + prev.accounts_receivable;
    return current.income - (currentLiquid - prevLiquid) - current.investment_inflow;
  },

  periodROI(current, prev) {
    if (!prev) return 0;
    const denominator = prev.investment_market_value + current.investment_inflow;
    if (denominator === 0) return 0;
    return (current.investment_market_value - prev.investment_market_value - current.investment_inflow) / denominator;
  },

  annualizedROI(periodROI, days) {
    if (days <= 0 || !isFinite(periodROI)) return null;
    const result = Math.pow(1 + periodROI, 365 / days) - 1;
    return isFinite(result) ? result : null;
  },

  timeWeightedReturn(snapshots) {
    if (snapshots.length < 2) return 0;
    let twr = 1;
    for (let i = 1; i < snapshots.length; i++) {
      twr *= (1 + snapshots[i].period_roi);
    }
    return twr - 1;
  },

  enrichAll(snapshots) {
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    for (let i = 0; i < sorted.length; i++) {
      const prev = i > 0 ? sorted[i - 1] : null;
      sorted[i].net_asset = this.netAsset(sorted[i]);
      sorted[i].derived_expense = this.derivedExpense(sorted[i], prev);
      sorted[i].period_roi = this.periodROI(sorted[i], prev);
    }
    return sorted;
  },
};
