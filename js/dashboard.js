// dashboard.js — ECharts 图表渲染

const Dashboard = {
  _charts: {},

  init() {
    this._ensureDisposed('asset');
    this._ensureDisposed('pnl');
    this._ensureDisposed('composition');
  },

  _ensureDisposed(name) {
    if (this._charts[name]) {
      this._charts[name].dispose();
      this._charts[name] = null;
    }
  },

  _getChart(name, containerId) {
    if (!this._charts[name]) {
      const el = document.getElementById(containerId);
      if (!el) return null;
      this._charts[name] = echarts.init(el);
    }
    return this._charts[name];
  },

  renderAssetTrend(snapshots, range) {
    const chart = this._getChart('asset', 'chart-asset');
    if (!chart) return;

    const filtered = this._filterByRange(snapshots, range);
    const dates = filtered.map(s => s.record_date);
    const netAssets = filtered.map(s => s.net_asset);
    const cashPool = filtered.map(s => s.cash_pool);
    const invest = filtered.map(s => s.investment_market_value);
    const receivable = filtered.map(s => s.accounts_receivable);

    chart.setOption({
      title: { text: t('dashboard.assetTrend'), left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          let html = `<b>${params[0].axisValue}</b><br/>`;
          for (const p of params) {
            html += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`;
          }
          return html;
        }
      },
      legend: { bottom: 0, data: [t('dashboard.netAssets'), t('dashboard.cashPool'), t('dashboard.investValue'), t('dashboard.receivable')] },
      grid: { left: '12%', right: '5%', top: '15%', bottom: '15%' },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11,
          formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + t('dashboard.wan') : v.toFixed(0)
        }
      },
      series: [
        { name: t('dashboard.netAssets'), type: 'line', data: netAssets, smooth: true, lineStyle: { width: 2.5 } },
        { name: t('dashboard.cashPool'), type: 'line', data: cashPool, smooth: true, lineStyle: { width: 1.5, type: 'dashed' } },
        { name: t('dashboard.investValue'), type: 'line', data: invest, smooth: true, lineStyle: { width: 1.5, type: 'dashed' } },
        { name: t('dashboard.receivable'), type: 'line', data: receivable, smooth: true, lineStyle: { width: 1.5, type: 'dashed' } },
      ]
    }, true);
  },

  renderPNL(snapshots, range) {
    const chart = this._getChart('pnl', 'chart-pnl');
    if (!chart) return;

    const filtered = this._filterByRange(snapshots, range);
    const dates = filtered.map(s => s.record_date);
    const expenses = filtered.map(s => s.derived_expense);
    const incomes = filtered.map(s => s.income);

    chart.setOption({
      title: { text: t('dashboard.pnl'), left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          let html = `<b>${params[0].axisValue}</b><br/>`;
          for (const p of params) {
            html += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`;
          }
          return html;
        }
      },
      legend: { bottom: 0, data: [t('dashboard.income'), t('dashboard.expense')] },
      grid: { left: '12%', right: '5%', top: '15%', bottom: '15%' },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11,
          formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + t('dashboard.wan') : v.toFixed(0)
        }
      },
      series: [
        { name: t('dashboard.income'), type: 'bar', data: incomes, itemStyle: { color: '#67C23A' } },
        { name: t('dashboard.expense'), type: 'bar', data: expenses, itemStyle: { color: '#F56C6C' } },
      ]
    }, true);
  },

  renderComposition(snapshots) {
    const chart = this._getChart('composition', 'chart-composition');
    if (!chart) return;

    const latest = snapshots[snapshots.length - 1];
    if (!latest) return;

    chart.setOption({
      title: { text: t('dashboard.composition'), left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        formatter: '{b}: ¥{c} ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '55%'],
        data: [
          { value: latest.cash_pool, name: t('dashboard.cashPool'), itemStyle: { color: '#409EFF' } },
          { value: latest.investment_market_value, name: t('dashboard.investValue'), itemStyle: { color: '#E6A23C' } },
          { value: latest.accounts_receivable, name: t('dashboard.receivable'), itemStyle: { color: '#67C23A' } },
        ].filter(d => d.value > 0),
        label: { fontSize: 12 },
      }]
    }, true);
  },

  _filterByRange(snapshots, range) {
    if (!range || range === 'all') return snapshots;
    const sorted = [...snapshots].sort((a, b) => a.record_date.localeCompare(b.record_date));
    if (sorted.length === 0) return sorted;
    const latest = new Date(sorted[sorted.length - 1].record_date);
    let cutoff;
    if (range === '3m') cutoff = new Date(latest.getFullYear(), latest.getMonth() - 3, latest.getDate());
    else if (range === '6m') cutoff = new Date(latest.getFullYear(), latest.getMonth() - 6, latest.getDate());
    else if (range === '1y') cutoff = new Date(latest.getFullYear() - 1, latest.getMonth(), latest.getDate());
    else return sorted;
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return sorted.filter(s => s.record_date >= cutoffStr);
  },

  resize() {
    for (const chart of Object.values(this._charts)) {
      if (chart) chart.resize();
    }
  },
};
