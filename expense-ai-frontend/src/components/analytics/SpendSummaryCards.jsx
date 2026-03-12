import { formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'var(--lw-surface)',
  border: '1px solid var(--lw-border)',
  borderRadius: '16px',
  padding: '22px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: 'var(--lw-shadow-soft)',
};

const accentLine = (color) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '3px',
  background: color,
  borderRadius: '16px 16px 0 0',
});

const labelStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--lw-muted)',
  marginBottom: '10px',
};

const valueStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '26px',
  fontWeight: 700,
  color: 'var(--lw-text)',
  lineHeight: 1.1,
};

const subStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '12px',
  marginTop: '8px',
  color: 'var(--lw-muted)',
};

export default function SpendSummaryCards({ summary, loading }) {
  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ ...cardStyle, animation: 'pulse 1.5s infinite' }}>
          <div style={{ height: '60px', background: 'var(--lw-sea-salt)', borderRadius: '8px' }} />
        </div>
      ))}
    </div>
  );

  const totalSpend      = parseFloat(summary?.total_spend || 0);
  const totalVat        = parseFloat(summary?.total_vat || 0);
  const txCount         = summary?.transaction_count || 0;
  const avgTx           = parseFloat(summary?.avg_transaction || 0);
  const pctChange = summary?.vs_previous_period?.change_pct ?? null;
  const changeColor = pctChange === null ? 'var(--lw-muted)' : pctChange <= 0 ? '#046241' : '#C17110';
  const changeLabel = pctChange === null ? 'n/a' : `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}% vs last month`;

  const cards = [
    {
      label: 'Total Spend',
      value: formatPeso(totalSpend),
      sub: <span style={{ color: changeColor }}>{changeLabel}</span>,
      accent: 'var(--lw-accent)',
    },
    {
      label: 'VAT Paid',
      value: formatPeso(totalVat),
      sub: <span style={{ color: 'var(--lw-muted)' }}>
        {totalSpend > 0 ? ((totalVat / totalSpend) * 100).toFixed(1) : '0'}% of total spend
      </span>,
      accent: 'var(--lw-green)',
    },
    {
      label: 'Transactions',
      value: txCount.toLocaleString(),
      sub: <span style={{ color: 'var(--lw-muted)' }}>receipts processed</span>,
      accent: 'var(--lw-earth)',
    },
    {
      label: 'Avg. Transaction',
      value: formatPeso(avgTx),
      sub: <span style={{ color: 'var(--lw-muted)' }}>
        {summary?.period_start ? `${summary.period_start} - ${summary.period_end}` : 'this period'}
      </span>,
      accent: 'var(--lw-dark)',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {cards.map((c) => (
        <div key={c.label} style={cardStyle}>
          <div style={accentLine(c.accent)} />
          <div style={labelStyle}>{c.label}</div>
          <div style={valueStyle}>{c.value}</div>
          <div style={subStyle}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

