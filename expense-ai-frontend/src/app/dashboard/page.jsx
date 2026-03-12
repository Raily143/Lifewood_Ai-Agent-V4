'use client';

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import SpendSummaryCards from '../../components/analytics/SpendSummaryCards';
import CategoryChart     from '../../components/analytics/CategoryChart';
import TrendsChart       from '../../components/analytics/TrendsChart';
import RecentReceipts    from '../../components/analytics/RecentReceipts';
import ComplianceAlerts  from '../../components/analytics/ComplianceAlerts';
import ChatPanel         from '../../components/chat/ChatPanel';
import {
  fetchSummary, fetchCategories, fetchTrends, fetchReceipts,
} from '../../lib/api';

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png?width=1519&height=429';

const PAGE = {
  minHeight: '100vh',
  background: 'var(--lw-paper)',
  backgroundImage: `
    radial-gradient(ellipse 60% 40% at 15% -5%, rgba(255,179,71,0.16) 0%, transparent 65%),
    radial-gradient(ellipse 70% 45% at 85% 110%, rgba(4,98,65,0.12) 0%, transparent 60%)
  `,
  fontFamily: "'Manrope', sans-serif",
  color: 'var(--lw-text)',
};

const NAVBAR = {
  borderBottom: '1px solid var(--lw-border)',
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(10px)',
  padding: 'var(--lw-navbar-padding)',
  minHeight: 'var(--lw-navbar-height)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const CONTENT = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: 'var(--lw-content-padding)',
};

const PERIODS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: 'quarter' },
  { label: 'This Year', value: 'year' },
];

export default function Dashboard() {
  const [summary,    setSummary]    = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends,     setTrends]     = useState(null);
  const [receipts,   setReceipts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [period,     setPeriod]     = useState('month');
  const [convId,     setConvId]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, t, r] = await Promise.all([
        fetchSummary(),
        fetchCategories(),
        fetchTrends(),
        fetchReceipts({ limit: 50 }),
      ]);
      setSummary(s);
      setCategories(c.by_category || []);
      setTrends(t);
      setReceipts(r.receipts || r || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <Head>
        <title>Lifewood - Expense Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={PAGE}>
        <nav style={NAVBAR} className="lw-navbar">
          <div className="lw-navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img alt="Lifewood" src={LOGO_URL} style={{ height: '36px', width: 'auto' }} />
          </div>

          <div style={{
            position: 'var(--lw-center-pos)',
            left: 'var(--lw-center-left)',
            transform: 'var(--lw-center-transform)',
            background: 'var(--lw-dark)',
            color: 'var(--lw-paper)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '6px 14px',
            borderRadius: '999px',
          }} className="lw-navbar-center">
            Expense AI
          </div>

          <div className="lw-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--lw-surface)',
              borderRadius: '999px',
              padding: '4px',
              border: '1px solid var(--lw-border)',
            }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    background: period === p.value ? 'var(--lw-accent)' : 'transparent',
                    color: period === p.value ? 'var(--lw-dark)' : 'var(--lw-muted)',
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '12px',
                    fontWeight: period === p.value ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={load}
              disabled={loading}
              title={lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
              style={{
                background: loading ? 'var(--lw-surface)' : 'var(--lw-white)',
                border: '1px solid var(--lw-border)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: 'var(--lw-text)',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = 'var(--lw-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--lw-border)')}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: loading ? 'var(--lw-accent)' : 'var(--lw-green)',
                animation: loading ? 'pulse 1s ease-in-out infinite' : 'none',
              }} />
              Refresh
            </button>
          </div>
        </nav>

        <main style={CONTENT}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--lw-text)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Expense Dashboard
            </h1>
            <p style={{ color: 'var(--lw-muted)', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}>
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading data...'
              }
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(193,113,16,0.12)',
              border: '1px solid rgba(193,113,16,0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '13px',
              color: 'var(--lw-text)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>Could not load data: {error}</span>
              <button
                onClick={load}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--lw-text)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '12px',
                }}
              >
                Retry
              </button>
            </div>
          )}

          <section style={{ marginBottom: '20px' }}>
            <SpendSummaryCards summary={summary} loading={loading} />
          </section>

          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--lw-card-min), 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <CategoryChart categories={categories} loading={loading} />
            <TrendsChart   trends={trends}         loading={loading} />
          </section>

          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--lw-card-min), 1fr))',
            gap: '16px',
          }}>
            <ComplianceAlerts receipts={receipts} loading={loading} />
            <RecentReceipts   receipts={receipts} loading={loading} />
          </section>
        </main>
      </div>

      <ChatPanel
        conversationId={convId}
        onConversationCreate={setConvId}
      />

      <style>{`
        :root {
          --lw-paper: #f5eedb;
          --lw-white: #ffffff;
          --lw-sea-salt: #F9F7F7;
          --lw-dark: #133020;
          --lw-green: #046241;
          --lw-accent: #FFB347;
          --lw-accent-deep: #C17110;
          --lw-earth: #FFC370;
          --lw-border: #e6dfcf;
          --lw-muted: #708E7C;
          --lw-text: #133020;
          --lw-surface: #ffffff;
          --lw-surface-alt: #F9F7F7;
          --lw-shadow-soft: 0 18px 40px rgba(19,48,32,0.12);
          --lw-navbar-padding: 0 32px;
          --lw-navbar-height: 64px;
          --lw-content-padding: 32px 32px 120px;
          --lw-center-pos: absolute;
          --lw-center-left: 50%;
          --lw-center-transform: translateX(-50%);
          --lw-card-min: 340px;
          --lw-chat-width: 380px;
          --lw-chat-height: 580px;
          --lw-chat-right: 28px;
          --lw-chat-bottom: 96px;
          --lw-fab-right: 28px;
          --lw-fab-bottom: 28px;
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--lw-paper); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(4,98,65,0.2); border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        @media (max-width: 900px) {
          :root {
            --lw-navbar-padding: 12px 16px;
            --lw-navbar-height: 72px;
            --lw-content-padding: 20px 16px 96px;
            --lw-center-pos: static;
            --lw-center-left: auto;
            --lw-center-transform: none;
            --lw-card-min: 280px;
            --lw-chat-width: 320px;
            --lw-chat-height: 520px;
            --lw-chat-right: 16px;
            --lw-chat-bottom: 84px;
            --lw-fab-right: 16px;
            --lw-fab-bottom: 16px;
          }
          .lw-navbar {
            flex-wrap: wrap;
            gap: 10px;
            align-items: flex-start;
          }
          .lw-navbar-left {
            width: 100%;
            justify-content: center;
          }
          .lw-navbar-center {
            order: 3;
            width: 100%;
            text-align: center;
            margin-top: 4px;
          }
          .lw-navbar-actions {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
          }
        }

        @media (max-width: 600px) {
          .lw-navbar-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .lw-navbar-actions > div {
            width: 100%;
            justify-content: center;
          }
          :root {
            --lw-card-min: 240px;
            --lw-chat-width: calc(100vw - 32px);
            --lw-chat-height: 70vh;
            --lw-chat-right: 16px;
            --lw-chat-bottom: 84px;
          }
        }
      `}</style>
    </>
  );
}
