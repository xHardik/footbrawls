// src/pages/Onboarding.jsx
// 3-step onboarding: Nickname → Home Country → Support Team

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUser } from '../lib/user';
import { COUNTRIES, WC_2026_TEAMS } from '../lib/countries';

const C = {
  bg:      "#060810",
  bg2:     "#0c0f1a",
  surface: "rgba(255,255,255,0.04)",
  surface2:"rgba(255,255,255,0.07)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent:  "#F7C344",
  accentDim: "rgba(247,195,68,0.12)",
  green:   "#3DD68C",
  red:     "#E84040",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id="fb-fonts"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

const WC_COUNTRIES = COUNTRIES.filter((c) => WC_2026_TEAMS.includes(c.code));

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [homeCountry, setHomeCountry] = useState(null);
  const [supportTeam, setSupportTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { injectFonts(); }, []);

  // If user already exists skip onboarding
  if (getUser()) {
    navigate('/');
    return null;
  }

  // ─── Filtered country list for search ──────────────────────────────────────
  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWC = WC_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleNicknameNext() {
    const trimmed = nickname.trim();
    if (!trimmed) return setError('Enter a nickname');
    if (trimmed.length < 2) return setError('Too short — at least 2 characters');
    if (trimmed.length > 20) return setError('Too long — max 20 characters');
    setError('');
    setSearch('');
    setStep(2);
  }

  function handleCountrySelect(country) {
    setHomeCountry(country);
    setSearch('');
    setStep(3);
  }

  function handleSupportSelect(team) {
    setSupportTeam(team);
  }

  async function handleFinish() {
    if (!supportTeam) return setError('Pick a support team');
    setLoading(true);
    try {
      await createUser({
        nickname: nickname.trim(),
        homeCountry: homeCountry.code,
        supportTeam: supportTeam.code,
          flag: homeCountry.flag,
      });
      navigate('/');
    } catch (err) {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${(step / 3) * 100}%` }} />
      </div>

      {/* Step indicators */}
      <div style={styles.steps}>
        {['Nickname', 'Country', 'Team'].map((label, i) => (
          <div key={label} style={styles.stepItem}>
            <div style={{
              ...styles.stepDot,
              background: step > i + 1 ? C.green : step === i + 1 ? C.accent : C.surface2,
              color: step === i + 1 ? C.bg : step > i + 1 ? C.bg : C.muted,
              border: `2px solid ${step > i + 1 ? C.green : step === i + 1 ? C.accent : C.border2}`
            }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span style={{ ...styles.stepLabel, color: step === i + 1 ? '#fff' : '#555' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Nickname ── */}
      {step === 1 && (
        <div style={styles.card}>
          <div style={styles.emoji}>⚽</div>
          <h1 style={styles.title}>What's your name?</h1>
          <p style={styles.subtitle}>This is how other fans will see you</p>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. GoalMachine99"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleNicknameNext()}
            maxLength={20}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} onClick={handleNicknameNext}>
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Home Country ── */}
      {step === 2 && (
        <div style={styles.card}>
          <div style={styles.emoji}>🌍</div>
          <h1 style={styles.title}>Where are you from?</h1>
          <p style={styles.subtitle}>Your home country's castle gets 80% of your XP</p>
          <input
            style={styles.input}
            type="text"
            placeholder="Search country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div style={styles.countryList}>
            {filteredCountries.slice(0, 300).map((c) => (
              <button
                key={c.code}
                style={styles.countryItem}
                onClick={() => handleCountrySelect(c)}
              >
                <span style={styles.flag}>{c.flag}</span>
                <span style={styles.countryName}>{c.name}</span>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <p style={styles.noResults}>No countries found</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Support Team ── */}
      {step === 3 && (
        <div style={styles.card}>
          <div style={styles.emoji}>🏆</div>
          <h1 style={styles.title}>Who do you support?</h1>
          <p style={styles.subtitle}>
            Pick any WC 2026 team — 20% of your XP goes to their castle
          </p>
          {homeCountry && (
            <p style={styles.hint}>
              Home: {homeCountry.flag} {homeCountry.name}
            </p>
          )}
          <input
            style={styles.input}
            type="text"
            placeholder="Search WC team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div style={styles.countryList}>
            {filteredWC.map((c) => (
              <button
                key={c.code}
                style={{
                  ...styles.countryItem,
                  background: supportTeam?.code === c.code ? C.accentDim : 'transparent',
                  borderColor: supportTeam?.code === c.code ? C.accent : C.border2,
                }}
                onClick={() => handleSupportSelect(c)}
              >
                <span style={styles.flag}>{c.flag}</span>
                <span style={styles.countryName}>{c.name}</span>
                {supportTeam?.code === c.code && (
                  <span style={{ marginLeft: 'auto', color: C.accent }}>✓</span>
                )}
              </button>
            ))}
            {filteredWC.length === 0 && (
              <p style={styles.noResults}>No teams found</p>
            )}
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={{
              ...styles.btn,
              opacity: supportTeam ? 1 : 0.4,
              cursor: supportTeam ? 'pointer' : 'not-allowed',
            }}
            onClick={handleFinish}
            disabled={!supportTeam || loading}
          >
            {loading ? 'Setting up...' : "Let's Go! 🚀"}
          </button>
          <button style={styles.backBtn} onClick={() => { setStep(2); setSearch(''); }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    fontFamily: "'Syne', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px 40px',
  },
  progressBar: {
    width: '100%',
    maxWidth: 480,
    height: 4,
    background: C.surface,
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: C.accent,
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  steps: {
    display: 'flex',
    gap: 32,
    marginBottom: 32,
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    transition: 'all 0.3s ease',
  },
  stepLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    margin: 0,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 1.6,
  },
  hint: {
    fontSize: 13,
    color: C.accent,
    margin: 0,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: C.surface2,
    border: `1px solid ${C.border2}`,
    borderRadius: 12,
    color: C.text,
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: 8,
  },
  btn: {
    width: '100%',
    padding: '16px',
    background: C.accent,
    color: C.bg,
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'transform 0.1s',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: C.muted,
    fontSize: 14,
    cursor: 'pointer',
    padding: 8,
  },
  countryList: {
    width: '100%',
    maxHeight: 320,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 4,
  },
  countryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'transparent',
    border: `1px solid ${C.border2}`,
    borderRadius: 10,
    color: C.text,
    cursor: 'pointer',
    fontSize: 15,
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  flag: {
    fontSize: 22,
  },
  countryName: {
    fontSize: 15,
  },
  error: {
    color: C.red,
    fontSize: 13,
    margin: 0,
  },
  noResults: {
    color: C.muted,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
};