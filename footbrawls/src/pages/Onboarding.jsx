// src/pages/Onboarding.jsx
// 3-step onboarding: Nickname → Home Country → Support Team

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUser } from '../lib/user';
import { COUNTRIES, WC_2026_TEAMS } from '../lib/countries';

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
              background: step > i + 1 ? '#00ff87' : step === i + 1 ? '#fff' : '#333',
              color: step === i + 1 ? '#000' : step > i + 1 ? '#000' : '#666',
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
                  background: supportTeam?.code === c.code ? '#00ff8722' : 'transparent',
                  borderColor: supportTeam?.code === c.code ? '#00ff87' : '#222',
                }}
                onClick={() => handleSupportSelect(c)}
              >
                <span style={styles.flag}>{c.flag}</span>
                <span style={styles.countryName}>{c.name}</span>
                {supportTeam?.code === c.code && (
                  <span style={{ marginLeft: 'auto', color: '#00ff87' }}>✓</span>
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
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: "'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px 40px',
  },
  progressBar: {
    width: '100%',
    maxWidth: 480,
    height: 4,
    background: '#1a1a1a',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#00ff87',
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
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0.5,
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
    fontWeight: 800,
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    margin: 0,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#00ff87',
    margin: 0,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: '#111',
    border: '1px solid #222',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: 8,
  },
  btn: {
    width: '100%',
    padding: '16px',
    background: '#00ff87',
    color: '#000',
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
    color: '#555',
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
    border: '1px solid #222',
    borderRadius: 10,
    color: '#fff',
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
    color: '#ff4444',
    fontSize: 13,
    margin: 0,
  },
  noResults: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
};