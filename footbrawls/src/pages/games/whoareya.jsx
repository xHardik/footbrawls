// src/pages/games/WhoAreYa.jsx
// Football "Who Are Ya?" — guess the mystery WC 2026 player

import { useState, useEffect, useRef } from 'react';
import { getDailyPlayer } from '../../lib/dailySeed';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';

// ─── Player Database (WC 2026 players) ────────────────────────────────────────
const PLAYER_DB = [
  { name:'Lionel Messi',      country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Inter Miami',      age:36, foot:'Left',  flag:'🇦🇷' },
  { name:'Lautaro Martinez',  country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Inter Milan',      age:26, foot:'Right', flag:'🇦🇷' },
  { name:'Emiliano Martinez', country:'Argentina', countryCode:'ARG', position:'Goalkeeper', club:'Aston Villa',      age:31, foot:'Right', flag:'🇦🇷' },
  { name:'Kylian Mbappe',     country:'France',    countryCode:'FRA', position:'Forward',    club:'Real Madrid',      age:25, foot:'Right', flag:'🇫🇷' },
  { name:'Antoine Griezmann', country:'France',    countryCode:'FRA', position:'Forward',    club:'Atletico Madrid',  age:32, foot:'Left',  flag:'🇫🇷' },
  { name:'Aurelien Tchouameni',country:'France',   countryCode:'FRA', position:'Midfielder', club:'Real Madrid',      age:24, foot:'Right', flag:'🇫🇷' },
  { name:'Erling Haaland',    country:'Norway',    countryCode:'NOR', position:'Forward',    club:'Man City',         age:23, foot:'Left',  flag:'🇳🇴' },
  { name:'Vinicius Jr',       country:'Brazil',    countryCode:'BRA', position:'Forward',    club:'Real Madrid',      age:23, foot:'Right', flag:'🇧🇷' },
  { name:'Rodrygo',           country:'Brazil',    countryCode:'BRA', position:'Forward',    club:'Real Madrid',      age:23, foot:'Right', flag:'🇧🇷' },
  { name:'Alisson',           country:'Brazil',    countryCode:'BRA', position:'Goalkeeper', club:'Liverpool',        age:31, foot:'Right', flag:'🇧🇷' },
  { name:'Marquinhos',        country:'Brazil',    countryCode:'BRA', position:'Defender',   club:'PSG',              age:29, foot:'Right', flag:'🇧🇷' },
  { name:'Casemiro',          country:'Brazil',    countryCode:'BRA', position:'Midfielder', club:'Man United',       age:31, foot:'Right', flag:'🇧🇷' },
  { name:'Jude Bellingham',   country:'England',   countryCode:'ENG', position:'Midfielder', club:'Real Madrid',      age:20, foot:'Right', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Harry Kane',        country:'England',   countryCode:'ENG', position:'Forward',    club:'Bayern Munich',    age:30, foot:'Right', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Bukayo Saka',       country:'England',   countryCode:'ENG', position:'Forward',    club:'Arsenal',          age:22, foot:'Left',  flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Phil Foden',        country:'England',   countryCode:'ENG', position:'Midfielder', club:'Man City',         age:23, foot:'Left',  flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Declan Rice',       country:'England',   countryCode:'ENG', position:'Midfielder', club:'Arsenal',          age:25, foot:'Right', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Robert Lewandowski',country:'Poland',    countryCode:'POL', position:'Forward',    club:'Barcelona',        age:35, foot:'Right', flag:'🇵🇱' },
  { name:'Pedri',             country:'Spain',     countryCode:'ESP', position:'Midfielder', club:'Barcelona',        age:21, foot:'Right', flag:'🇪🇸' },
  { name:'Gavi',              country:'Spain',     countryCode:'ESP', position:'Midfielder', club:'Barcelona',        age:19, foot:'Left',  flag:'🇪🇸' },
  { name:'Lamine Yamal',      country:'Spain',     countryCode:'ESP', position:'Forward',    club:'Barcelona',        age:16, foot:'Right', flag:'🇪🇸' },
  { name:'Alvaro Morata',     country:'Spain',     countryCode:'ESP', position:'Forward',    club:'AC Milan',         age:31, foot:'Right', flag:'🇪🇸' },
  { name:'Rodri',             country:'Spain',     countryCode:'ESP', position:'Midfielder', club:'Man City',         age:27, foot:'Right', flag:'🇪🇸' },
  { name:'Jamal Musiala',     country:'Germany',   countryCode:'GER', position:'Midfielder', club:'Bayern Munich',    age:21, foot:'Right', flag:'🇩🇪' },
  { name:'Florian Wirtz',     country:'Germany',   countryCode:'GER', position:'Midfielder', club:'Bayer Leverkusen', age:20, foot:'Left',  flag:'🇩🇪' },
  { name:'Manuel Neuer',      country:'Germany',   countryCode:'GER', position:'Goalkeeper', club:'Bayern Munich',    age:37, foot:'Right', flag:'🇩🇪' },
  { name:'Leroy Sane',        country:'Germany',   countryCode:'GER', position:'Forward',    club:'Bayern Munich',    age:27, foot:'Right', flag:'🇩🇪' },
  { name:'Joao Felix',        country:'Portugal',  countryCode:'POR', position:'Forward',    club:'Chelsea',          age:24, foot:'Right', flag:'🇵🇹' },
  { name:'Bruno Fernandes',   country:'Portugal',  countryCode:'POR', position:'Midfielder', club:'Man United',       age:29, foot:'Right', flag:'🇵🇹' },
  { name:'Ruben Dias',        country:'Portugal',  countryCode:'POR', position:'Defender',   club:'Man City',         age:26, foot:'Right', flag:'🇵🇹' },
  { name:'Cristiano Ronaldo', country:'Portugal',  countryCode:'POR', position:'Forward',    club:'Al Nassr',         age:39, foot:'Right', flag:'🇵🇹' },
  { name:'Raphinha',          country:'Brazil',    countryCode:'BRA', position:'Forward',    club:'Barcelona',        age:27, foot:'Left',  flag:'🇧🇷' },
  { name:'Achraf Hakimi',     country:'Morocco',   countryCode:'MAR', position:'Defender',   club:'PSG',              age:25, foot:'Right', flag:'🇲🇦' },
  { name:'Hakim Ziyech',      country:'Morocco',   countryCode:'MAR', position:'Midfielder', club:'Galatasaray',      age:30, foot:'Left',  flag:'🇲🇦' },
  { name:'Yassine Bounou',    country:'Morocco',   countryCode:'MAR', position:'Goalkeeper', club:'Al Hilal',         age:32, foot:'Right', flag:'🇲🇦' },
  { name:'Victor Osimhen',    country:'Nigeria',   countryCode:'NGA', position:'Forward',    club:'Galatasaray',      age:25, foot:'Right', flag:'🇳🇬' },
  { name:'Sadio Mane',        country:'Senegal',   countryCode:'SEN', position:'Forward',    club:'Al Nassr',         age:32, foot:'Right', flag:'🇸🇳' },
  { name:'Mohamed Salah',     country:'Egypt',     countryCode:'EGY', position:'Forward',    club:'Liverpool',        age:31, foot:'Left',  flag:'🇪🇬' },
  { name:'Son Heung-min',     country:'South Korea',countryCode:'KOR',position:'Forward',    club:'Tottenham',        age:31, foot:'Left',  flag:'🇰🇷' },
  { name:'Takumi Minamino',   country:'Japan',     countryCode:'JPN', position:'Midfielder', club:'Monaco',           age:29, foot:'Right', flag:'🇯🇵' },
  { name:'Ritsu Doan',        country:'Japan',     countryCode:'JPN', position:'Forward',    club:'Freiburg',         age:25, foot:'Right', flag:'🇯🇵' },
  { name:'Ivan Perisic',      country:'Croatia',   countryCode:'CRO', position:'Midfielder', club:'Hajduk Split',     age:34, foot:'Left',  flag:'🇭🇷' },
  { name:'Luka Modric',       country:'Croatia',   countryCode:'CRO', position:'Midfielder', club:'Real Madrid',      age:38, foot:'Right', flag:'🇭🇷' },
  { name:'Dominik Livakovic', country:'Croatia',   countryCode:'CRO', position:'Goalkeeper', club:'Fenerbahce',       age:28, foot:'Right', flag:'🇭🇷' },
  { name:'Memphis Depay',     country:'Netherlands',countryCode:'NED',position:'Forward',    club:'Atletico Madrid',  age:29, foot:'Right', flag:'🇳🇱' },
  { name:'Virgil van Dijk',   country:'Netherlands',countryCode:'NED',position:'Defender',   club:'Liverpool',        age:32, foot:'Right', flag:'🇳🇱' },
  { name:'Cody Gakpo',        country:'Netherlands',countryCode:'NED',position:'Forward',    club:'Liverpool',        age:24, foot:'Right', flag:'🇳🇱' },
  { name:'Frenkie de Jong',   country:'Netherlands',countryCode:'NED',position:'Midfielder', club:'Barcelona',        age:26, foot:'Right', flag:'🇳🇱' },
  { name:'Christian Pulisic', country:'USA',       countryCode:'USA', position:'Forward',    club:'AC Milan',         age:25, foot:'Right', flag:'🇺🇸' },
  { name:'Alphonso Davies',   country:'Canada',    countryCode:'CAN', position:'Defender',   club:'Bayern Munich',    age:23, foot:'Left',  flag:'🇨🇦' },
  { name:'Jonathan David',    country:'Canada',    countryCode:'CAN', position:'Forward',    club:'Lille',            age:24, foot:'Right', flag:'🇨🇦' },
  { name:'Hirving Lozano',    country:'Mexico',    countryCode:'MEX', position:'Forward',    club:'PSV',              age:28, foot:'Right', flag:'🇲🇽' },
  { name:'Edson Alvarez',     country:'Mexico',    countryCode:'MEX', position:'Midfielder', club:'West Ham',         age:26, foot:'Right', flag:'🇲🇽' },
  { name:'Paulo Dybala',      country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Roma',             age:30, foot:'Left',  flag:'🇦🇷' },
  { name:'Julian Alvarez',    country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Atletico Madrid',  age:24, foot:'Right', flag:'🇦🇷' },
  { name:'Darwin Nunez',      country:'Uruguay',   countryCode:'URU', position:'Forward',    club:'Liverpool',        age:24, foot:'Right', flag:'🇺🇾' },
  { name:'Federico Valverde', country:'Uruguay',   countryCode:'URU', position:'Midfielder', club:'Real Madrid',      age:25, foot:'Right', flag:'🇺🇾' },
  { name:'Luis Diaz',         country:'Colombia',  countryCode:'COL', position:'Forward',    club:'Liverpool',        age:27, foot:'Right', flag:'🇨🇴' },
  { name:'James Rodriguez',   country:'Colombia',  countryCode:'COL', position:'Midfielder', club:'Rayo Vallecano',   age:32, foot:'Right', flag:'🇨🇴' },
  { name:'Alexis Mac Allister',country:'Argentina',countryCode:'ARG', position:'Midfielder', club:'Liverpool',        age:25, foot:'Right', flag:'🇦🇷' },
  { name:'Granit Xhaka',      country:'Switzerland',countryCode:'CHE',position:'Midfielder', club:'Bayer Leverkusen', age:31, foot:'Left',  flag:'🇨🇭' },
  { name:'Xherdan Shaqiri',   country:'Switzerland',countryCode:'CHE',position:'Midfielder', club:'Chicago Fire',     age:32, foot:'Right', flag:'🇨🇭' },
  { name:'Romelu Lukaku',     country:'Belgium',   countryCode:'BEL', position:'Forward',    club:'Roma',             age:30, foot:'Right', flag:'🇧🇪' },
  { name:'Kevin De Bruyne',   country:'Belgium',   countryCode:'BEL', position:'Midfielder', club:'Man City',         age:32, foot:'Right', flag:'🇧🇪' },
  { name:'Thibaut Courtois',  country:'Belgium',   countryCode:'BEL', position:'Goalkeeper', club:'Real Madrid',      age:31, foot:'Right', flag:'🇧🇪' },
];

const MAX_ATTEMPTS = 8;
const SCORES = [25, 23, 20, 17, 14, 11, 8, 5];

const REGIONS = {
  ARG:'SouthAmerica', BRA:'SouthAmerica', URU:'SouthAmerica', COL:'SouthAmerica',
  ECU:'SouthAmerica', PER:'SouthAmerica', VEN:'SouthAmerica', BOL:'SouthAmerica',
  FRA:'Europe', ESP:'Europe', GER:'Europe', ENG:'Europe', POR:'Europe',
  NED:'Europe', BEL:'Europe', CHE:'Europe', POL:'Europe', CRO:'Europe',
  SRB:'Europe', UKR:'Europe', TUR:'Europe', SVK:'Europe', WAL:'Europe',
  USA:'NorthAmerica', CAN:'NorthAmerica', MEX:'NorthAmerica',
  MAR:'Africa', NGA:'Africa', SEN:'Africa', GHA:'Africa', CMR:'Africa',
  CIV:'Africa', TUN:'Africa',
  JPN:'Asia', KOR:'Asia', IRN:'Asia', SAU:'Asia', QAT:'Asia', AUS:'Asia',
};

function getRegion(code) { return REGIONS[code] || 'Other'; }

const POS_STYLE = {
  Forward:    { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5' },
  Midfielder: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#93c5fd' },
  Defender:   { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#86efac' },
  Goalkeeper: { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fdba74' },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WhoAreYa() {
  const [target, setTarget]             = useState(null);
  const [guesses, setGuesses]           = useState([]);
  const [guessedNames, setGuessedNames] = useState([]);
  const [search, setSearch]             = useState('');
  const [dropdown, setDropdown]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [gameOver, setGameOver]         = useState(false);
  const [won, setWon]                   = useState(false);
  const [xpAwarded, setXpAwarded]       = useState(null);
  const [hints, setHints]               = useState({ position: false, country: false, club: false });
  const [animKey, setAnimKey]           = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    const player = getDailyPlayer(PLAYER_DB);
    setTarget(player);
    const today = new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('footbrawls_whoareya') || '{}');
    if (saved.date === today) {
      setGuesses(saved.guesses || []);
      setGuessedNames((saved.guesses || []).map(g => g.cells[0].name));
      setGameOver(true);
      setWon(saved.won);
    }
  }, []);

  useEffect(() => {
    if (!search.trim()) { setDropdown([]); return; }
    const q = search.toLowerCase();
    const matches = PLAYER_DB
      .filter(p => p.name.toLowerCase().includes(q) && !guessedNames.includes(p.name))
      .slice(0, 8);
    setDropdown(matches);
  }, [search, guessedNames]);

  useEffect(() => {
    const count = guesses.length;
    setHints({ position: count >= 2, country: count >= 5, club: count >= 7 });
  }, [guesses]);

  function evaluateGuess(guess) {
    const t = target;
    const sameCountry = guess.countryCode === t.countryCode;
    const sameRegion  = !sameCountry && getRegion(guess.countryCode) === getRegion(t.countryCode);
    return {
      cells: [
        { type:'name',     name:guess.name, flag:guess.flag,
          cls: guess.name === t.name ? 'correct' : 'wrong' },
        { type:'country',  val:`${guess.flag} ${guess.country}`,
          cls: sameCountry ? 'correct' : sameRegion ? 'partial' : 'wrong' },
        { type:'position', val:guess.position,
          cls: guess.position === t.position ? 'correct' : 'wrong' },
        { type:'club',     val:guess.club,
          cls: guess.club === t.club ? 'correct' : 'wrong' },
        { type:'age',      val:guess.age,
          cls: guess.age === t.age ? 'correct' : Math.abs(guess.age - t.age) <= 3 ? 'partial' : 'wrong',
          arrow: guess.age < t.age ? '↑' : guess.age > t.age ? '↓' : '' },
        { type:'foot',     val:guess.foot,
          cls: guess.foot === t.foot ? 'correct' : 'wrong' },
      ],
    };
  }

  async function submitGuess() {
    if (!selected || gameOver || !target) return;
    const result = evaluateGuess(selected);
    const newGuesses = [...guesses, result];
    const newNames   = [...guessedNames, selected.name];
    setAnimKey(k => k + 1);
    setGuesses(newGuesses);
    setGuessedNames(newNames);
    setSelected(null);
    setSearch('');
    setDropdown([]);
    const isWin  = selected.name === target.name;
    const isLoss = !isWin && newGuesses.length >= MAX_ATTEMPTS;
    if (isWin || isLoss) {
      setGameOver(true);
      setWon(isWin);
      const score = isWin ? SCORES[newGuesses.length - 1] : 0;
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('footbrawls_whoareya', JSON.stringify({
        date: today, guesses: newGuesses, won: isWin, score,
      }));
      if (isWin) {
        const user = getUser();
        if (user) {
          const r = await awardXP(user.userId, 'whoareya_correct', { rawXP: score });
          setXpAwarded(r?.xpAwarded || score);
        }
      }
    }
  }

  if (!target) return (
    <div style={s.loadingWrap}>
      <div style={s.spinner} className="wya-spin" />
    </div>
  );

  const attempts     = guesses.length;
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  return (
    <>
      <style>{INJECTED_CSS}</style>
      <div style={s.page}>

        {/* ── Header ── */}
        <header style={s.header}>
          <div>
            <div style={s.eyebrow}>
              <span style={s.eyebrowBadge}>⚽ WC 2026</span>
              <span style={s.eyebrowDivider}>·</span>
              <span style={s.eyebrowSub}>
                {gameOver
                  ? won ? `Solved in ${attempts} ${attempts === 1 ? 'guess' : 'guesses'}` : 'Better luck tomorrow'
                  : `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left`}
              </span>
            </div>
            <h1 style={s.title}>Who Are Ya?</h1>
          </div>

          {/* Attempt track */}
          <div style={s.track}>
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
              const filled    = i < attempts;
              const isWinLast = won && i === attempts - 1;
              return (
                <div key={i} style={{
                  ...s.trackDot,
                  background: filled
                    ? isWinLast ? 'var(--c-green)' : 'var(--c-red)'
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: filled
                    ? isWinLast ? '0 0 10px rgba(34,197,94,0.6)' : '0 0 6px rgba(239,68,68,0.35)'
                    : 'none',
                }} />
              );
            })}
          </div>
        </header>

        {/* ── Hint strip ── */}
        <div style={s.hintRow}>
          <HintCard icon="🎽" label="Position" value={target.position} revealed={hints.position} unlockAt={2} />
          <HintCard icon="🌍" label="Country"  value={`${target.flag} ${target.country}`} revealed={hints.country}  unlockAt={5} />
          <HintCard icon="🏟️" label="Club"     value={target.club}     revealed={hints.club}     unlockAt={7} />
        </div>

        {/* ── Search ── */}
        {!gameOver && (
          <div style={s.searchWrap}>
            <div style={s.searchInner} className="wya-search-box">
              <span style={s.searchGlyph}>⚽</span>
              <input
                ref={searchRef}
                style={s.searchInput}
                placeholder="Type a player name…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                onKeyDown={e => e.key === 'Enter' && selected && submitGuess()}
                autoComplete="off"
              />
              {search && (
                <button style={s.clearX} onClick={() => { setSearch(''); setSelected(null); setDropdown([]); }}>✕</button>
              )}
            </div>

            {dropdown.length > 0 && (
              <div style={s.dropdown} className="wya-dropdown">
                {dropdown.map((p, i) => (
                  <div
                    key={p.name}
                    style={{ ...s.dropRow, ...(i < dropdown.length - 1 ? s.dropBorder : {}) }}
                    className="wya-drop-row"
                    onClick={() => { setSelected(p); setSearch(p.name); setDropdown([]); }}
                  >
                    <span style={s.dropFlag}>{p.flag}</span>
                    <div style={s.dropInfo}>
                      <span style={s.dropName}>{p.name}</span>
                      <span style={s.dropMeta}>
                        <PosBadge pos={p.position} />
                        {p.country} · {p.club}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              style={s.guessBtn}
              className={selected ? 'wya-guess-active' : 'wya-guess-inactive'}
              disabled={!selected}
              onClick={submitGuess}
            >
              Confirm Guess →
            </button>
          </div>
        )}

        {/* ── Column labels ── */}
        {guesses.length > 0 && (
          <div style={s.colLabels}>
            {['Player','Country','Position','Club','Age','Foot'].map(h => (
              <div key={h} style={s.colLabel}>{h}</div>
            ))}
          </div>
        )}

        {/* ── Guess grid ── */}
        <div style={s.guessGrid}>
          {[...guesses].reverse().map((g, rowI) => (
            <div
              key={`${animKey}-${rowI}`}
              style={s.guessRow}
              className={rowI === 0 ? 'wya-row-enter' : ''}
            >
              {g.cells.map((cell, j) => (
                <Cell key={j} cell={cell} />
              ))}
            </div>
          ))}
        </div>

        {/* ── Legend ── */}
        {guesses.length > 0 && (
          <div style={s.legend}>
            {[
              ['#22c55e', 'Correct'],
              ['#f59e0b', 'Same region / ±3 yrs'],
              ['#334155', 'Wrong'],
            ].map(([color, label]) => (
              <span key={label} style={s.legendItem}>
                <span style={{ ...s.legendSwatch, background: color }} />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* ── Result ── */}
        {gameOver && (
          <div style={{ ...s.result, ...(won ? s.resultWin : s.resultLoss) }} className="wya-result-enter">
            <div style={s.resultEmoji}>{won ? '🏆' : '💔'}</div>
            <div style={s.resultHead}>{won ? 'Nailed it!' : 'Not this time'}</div>
            <div style={s.resultName}>{target.flag} {target.name}</div>
            <div style={s.resultInfo}>{target.country} · {target.position} · {target.club} · Age {target.age}</div>

            {won && (
              <div style={s.statsRow}>
                <StatChip value={attempts} label={attempts === 1 ? 'guess' : 'guesses'} />
                <div style={s.statsDivider} />
                <StatChip value={SCORES[attempts - 1]} label="points" />
                {xpAwarded != null && (
                  <>
                    <div style={s.statsDivider} />
                    <StatChip value={`+${xpAwarded}`} label="XP" accent />
                  </>
                )}
              </div>
            )}

            <p style={s.nextUp}>New puzzle tomorrow ⏳</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function HintCard({ icon, label, value, revealed, unlockAt }) {
  const posC = POS_STYLE[value];
  return (
    <div style={{
      ...s.hint,
      ...(revealed
        ? { ...s.hintRevealed, ...(posC ? { background: posC.bg, borderColor: posC.border } : {}) }
        : {}),
    }}>
      <span style={s.hintIcon}>{icon}</span>
      <div style={s.hintBody}>
        <div style={s.hintLabel}>{label}</div>
        {revealed
          ? <div style={{ ...s.hintVal, ...(posC ? { color: posC.text } : {}) }}>{value}</div>
          : <div style={s.hintLock}>Unlocks @ guess {unlockAt}</div>}
      </div>
    </div>
  );
}

function PosBadge({ pos }) {
  const c = POS_STYLE[pos] || {};
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 100,
      fontSize: 10, fontWeight: 700, marginRight: 4,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>{pos}</span>
  );
}

function Cell({ cell }) {
  const { cls, type, name, flag, val, arrow } = cell;
  const bg    = cls === 'correct' ? 'rgba(34,197,94,0.1)'   : cls === 'partial' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.025)';
  const brd   = cls === 'correct' ? 'rgba(34,197,94,0.35)'  : cls === 'partial' ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.06)';
  const topC  = cls === 'correct' ? '#22c55e'               : cls === 'partial' ? '#f59e0b' : 'transparent';
  const arrowC= cls === 'partial' ? '#f59e0b' : '#64748b';

  return (
    <div style={{ ...s.cell, background: bg, borderColor: brd }}>
      <div style={{ ...s.cellTop, background: topC }} />
      {type === 'name' ? (
        <>
          <span style={s.cellFlag}>{flag}</span>
          <span style={s.cellName}>{name}</span>
        </>
      ) : (
        <>
          <span style={s.cellVal}>{val}</span>
          {arrow && <span style={{ ...s.cellArrow, color: arrowC }}>{arrow}</span>}
        </>
      )}
    </div>
  );
}

function StatChip({ value, label, accent }) {
  return (
    <div style={s.statChip}>
      <span style={{ ...s.statVal, ...(accent ? { color: '#4ade80' } : {}) }}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#06090e',
    color: '#cbd5e1',
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    padding: '24px 16px 80px',
    maxWidth: '100%',
    margin: '0 auto',
  },
  loadingWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
  },
  spinner: {
    width: 24, height: 24, borderRadius: '50%',
    border: '2.5px solid #1e293b', borderTopColor: '#22c55e',
  },

  // Header
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 24, gap: 16,
  },
  eyebrow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  eyebrowBadge: {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 9px', borderRadius: 100,
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
    color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: 1,
  },
  eyebrowDivider: { color: '#1e293b', fontSize: 14 },
  eyebrowSub: { fontSize: 12, color: '#475569' },
  title: {
    fontSize: 32, fontWeight: 800, margin: 0,
    color: '#f8fafc', letterSpacing: '-0.6px',
    fontFamily: "'DM Sans', sans-serif",
  },
  track: { display: 'flex', gap: 5, alignItems: 'center', paddingTop: 6, flexShrink: 0 },
  trackDot: {
    width: 10, height: 10, borderRadius: '50%',
    transition: 'background 0.35s, box-shadow 0.35s',
  },

  // Hints
  hintRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 },
  hint: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '10px 12px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    transition: 'all 0.3s',
  },
  hintRevealed: {
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.25)',
  },
  hintIcon: { fontSize: 17, flexShrink: 0 },
  hintBody: { minWidth: 0 },
  hintLabel: {
    fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: 1.3, color: '#334155', marginBottom: 2,
  },
  hintVal: {
    fontSize: 12, fontWeight: 700, color: '#4ade80',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  hintLock: { fontSize: 11, color: '#1e293b' },

  // Search
  searchWrap: { position: 'relative', marginBottom: 22 },
  searchInner: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#0d1520', border: '1px solid #1a2332',
    borderRadius: 14, padding: '0 14px',
    marginBottom: 10, transition: 'border-color 0.2s',
  },
  searchGlyph: { fontSize: 15, opacity: 0.4, flexShrink: 0 },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none',
    color: '#f1f5f9', fontSize: 15, padding: '13px 0',
    outline: 'none', fontFamily: 'inherit',
  },
  clearX: {
    background: 'none', border: 'none', color: '#334155',
    cursor: 'pointer', fontSize: 13, padding: 4, flexShrink: 0,
  },

  // Dropdown
  dropdown: {
    position: 'absolute', top: 58, left: 0, right: 0,
    background: '#0d1520', border: '1px solid #1a2332',
    borderRadius: 14, zIndex: 999, overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
  },
  dropRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 14px', cursor: 'pointer',
    transition: 'background 0.12s',
  },
  dropBorder: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  dropFlag: { fontSize: 22, flexShrink: 0 },
  dropInfo: { flex: 1, minWidth: 0 },
  dropName: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: 2 },
  dropMeta: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3, fontSize: 11, color: '#475569' },

  // Guess button
  guessBtn: {
    width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
  },

  // Grid
  colLabels: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1.2fr 1.5fr 0.7fr 0.7fr',
    gap: 4, marginBottom: 6,
  },
  colLabel: {
    fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: 1.5, color: '#1e3a5f', textAlign: 'center', padding: '3px 0',
  },
  guessGrid: { display: 'flex', flexDirection: 'column', gap: 4 },
  guessRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1.2fr 1.5fr 0.7fr 0.7fr',
    gap: 4,
  },
  cell: {
    position: 'relative', borderRadius: 10, overflow: 'hidden',
    border: '1px solid transparent',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 64, padding: '8px 4px',
    textAlign: 'center', wordBreak: 'break-word',
    gap: 2,
  },
  cellTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  cellFlag: { fontSize: 18 },
  cellName: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', lineHeight: 1.3 },
  cellVal:  { fontSize: 12, fontWeight: 700, color: '#94a3b8' },
  cellArrow: { fontSize: 13, fontWeight: 900 },

  // Legend
  legend: { display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#334155' },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },

  // Result
  result: {
    marginTop: 28, padding: '28px 24px',
    borderRadius: 20, border: '1px solid',
    textAlign: 'center',
  },
  resultWin:  { background: 'rgba(34,197,94,0.05)',  borderColor: 'rgba(34,197,94,0.2)' },
  resultLoss: { background: 'rgba(239,68,68,0.04)',  borderColor: 'rgba(239,68,68,0.15)' },
  resultEmoji: { fontSize: 38, marginBottom: 10 },
  resultHead: {
    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: 2.5, color: '#475569', marginBottom: 10,
  },
  resultName: {
    fontSize: 26, fontWeight: 800, color: '#f8fafc',
    letterSpacing: '-0.3px', marginBottom: 6,
  },
  resultInfo: { fontSize: 13, color: '#475569', marginBottom: 20 },
  statsRow: {
    display: 'inline-flex', alignItems: 'center', gap: 16,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '14px 22px', marginBottom: 16,
  },
  statsDivider: { width: 1, height: 30, background: 'rgba(255,255,255,0.07)' },
  statChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statVal: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 },
  statLabel: { fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.2 },
  nextUp: { fontSize: 12, color: '#1e293b', margin: 0 },
};

const INJECTED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700;0,9..40,800&display=swap');

:root {
  --c-green: #22c55e;
  --c-red:   #ef4444;
}

@keyframes wyaSpin {
  to { transform: rotate(360deg); }
}
.wya-spin {
  animation: wyaSpin 0.75s linear infinite;
}

@keyframes wyaRowIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.wya-row-enter {
  animation: wyaRowIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes wyaDropIn {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wya-dropdown {
  animation: wyaDropIn 0.18s ease both;
}

@keyframes wyaResultPop {
  0%   { opacity: 0; transform: scale(0.94) translateY(12px); }
  60%  { transform: scale(1.02) translateY(0); }
  100% { opacity: 1; transform: scale(1); }
}
.wya-result-enter {
  animation: wyaResultPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.wya-drop-row:hover {
  background: rgba(255,255,255,0.05);
}

.wya-guess-active {
  background: #22c55e !important;
  color: #052e16 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 24px rgba(34,197,94,0.25) !important;
}
.wya-guess-active:hover {
  filter: brightness(1.06);
}
.wya-guess-active:active {
  transform: scale(0.98);
}
.wya-guess-inactive {
  background: #0f172a;
  color: #1e3a5f;
  cursor: not-allowed;
}

.wya-search-box:focus-within {
  border-color: rgba(34,197,94,0.3) !important;
}
`;