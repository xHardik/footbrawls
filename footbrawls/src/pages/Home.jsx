import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const DAILY_XP_CAP = 200;
const CASTLE_HP_CAP = 10000;

const C = {
  pitch: "#06111f",
  panel: "#0b182a",
  panel2: "#10223a",
  stroke: "rgba(255,255,255,0.08)",
  stroke2: "rgba(255,255,255,0.15)",
  text: "#e8f1ff",
  soft: "rgba(204,222,247,0.68)",
  mute: "rgba(204,222,247,0.42)",
  green: "#00d48a",
  blue: "#4a9eff",
  gold: "#f0c040",
  red: "#ff4865",
  violet: "#9a72ff",
};

const GAME_META = [
  {
    id: "whoAreYa",
    icon: "👤",
    name: "Who Are Ya?",
    desc: "Guess today's mystery player with position, country, and club clues.",
    xp: 25,
    route: "/games/whoareya",
    color: "#9a72ff",
    storageKey: "footbrawls_whoareya",
  },
  {
    id: "matchPredictor",
    icon: "🔮",
    name: "Match Predictor",
    desc: "Lock result and scorer picks before kickoff.",
    xp: 100,
    route: "/games/matchpredictor",
    color: "#4a9eff",
    storageKey: "footbrawls_matchpredictor",
  },
  {
    id: "penaltyNerve",
    icon: "⚽",
    name: "Penalty Nerve",
    desc: "Beat the keeper across five pressure kicks.",
    xp: 30,
    route: "/games/penaltynerve",
    color: "#ff4865",
    storageKey: "footbrawls_penaltynerve",
  },
  {
    id: "wordle",
    icon: "🟩",
    name: "Player Wordle",
    desc: "Use attribute colour feedback to find the footballer.",
    xp: 20,
    route: "/games/wordle",
    color: "#20c96b",
    storageKey: "footbrawls_wordle_history",
  },
  {
    id: "higherLower",
    icon: "📊",
    name: "Higher or Lower",
    desc: "Compare age, caps, goals, and market value.",
    xp: 15,
    route: "/games/higherlower",
    color: "#f6a623",
    storageKey: "footbrawls_higherlower",
  },
  {
    id: "transferTrail",
    icon: "🔗",
    name: "Transfer Trail",
    desc: "Connect two players through shared clubs.",
    xp: 20,
    route: "/games/transfertrail",
    color: "#00d48a",
    storageKey: "footbrawls_transfertrail",
  },
];

const FEED = [
  { icon: "⚽", user: "Priya_10", action: "held nerve from the spot", time: "2m" },
  { icon: "👤", user: "Arjun_CF", action: "solved Who Are Ya in 2", time: "5m" },
  { icon: "🔮", user: "Vikram_7", action: "locked a bold scoreline", time: "11m" },
  { icon: "🔗", user: "Sneha_11", action: "finished Transfer Trail in 3", time: "18m" },
];

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const link = document.createElement("link");
  link.id = "fb-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Outfit:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isDoneToday(game) {
  try {
    const today = getTodayKey();
    const raw = localStorage.getItem(game.storageKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.date === today || Boolean(data[today]);
  } catch {
    return false;
  }
}

function clampPct(value, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function fmtCountdown(secs) {
  return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={s.toast}>
      {message}
    </div>
  );
}

function Shell({ children }) {
  return <div style={s.shell}>{children}</div>;
}

function TopNav({ user, xpPct }) {
  return (
    <nav style={s.topNav}>
      <button style={s.brand} type="button">
        FOOT<span style={{ color: C.green }}>BRAWLS</span>
      </button>
      <div style={s.profilePill}>
        <div style={s.xpMiniTrack}>
          <div style={{ ...s.xpMiniFill, width: `${xpPct}%` }} />
        </div>
        <span style={s.profileName}>{user.nickname}</span>
      </div>
    </nav>
  );
}

function Hero({ user, guild, doneCount, totalGames }) {
  const xp = user.dailyXP || 0;
  const xpPct = clampPct(xp, DAILY_XP_CAP);
  const next = Math.max(0, DAILY_XP_CAP - xp);

  return (
    <section style={s.hero}>
      <div style={s.heroGlow} />
      <div style={s.heroTop}>
        <div>
          <div style={s.kicker}>Today&apos;s campaign</div>
          <h1 style={s.heroTitle}>Win XP. Hold the castle.</h1>
        </div>
        <div style={s.flagBox}>{guild.flag}</div>
      </div>

      <div style={s.heroStats}>
        <Stat label="Daily XP" value={`${xp}/${DAILY_XP_CAP}`} accent={C.green} />
        <Stat label="Games Done" value={`${doneCount}/${totalGames}`} accent={C.gold} />
        <Stat label="Tier" value={user.tier || "lurker"} accent={C.blue} />
      </div>

      <div style={s.xpTrack}>
        <div style={{ ...s.xpFill, width: `${xpPct}%` }} />
      </div>
      <div style={s.heroFoot}>
        <span>{next} XP left today</span>
        <span>{guild.name}</span>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={s.stat}>
      <span style={{ ...s.statValue, color: accent }}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

function GuildCard({ guild, onOpen }) {
  const hp = guild.castleHP ?? 0;
  const maxHp = guild.castleHPCap ?? CASTLE_HP_CAP;
  const pct = clampPct(hp, maxHp);
  const status = pct >= 70 ? "Fortress" : pct >= 35 ? "Holding" : "Under pressure";
  const color = pct >= 70 ? C.green : pct >= 35 ? C.gold : C.red;

  return (
    <button style={s.guildCard} type="button" onClick={onOpen}>
      <div style={s.guildHead}>
        <div style={s.guildIdentity}>
          <span style={s.guildFlag}>{guild.flag}</span>
          <div>
            <div style={s.guildName}>{guild.name}</div>
            <div style={s.guildMeta}>
              {(guild.memberCount || 0).toLocaleString()} members
            </div>
          </div>
        </div>
        <span style={{ ...s.statusPill, color, borderColor: `${color}55`, background: `${color}16` }}>
          {status}
        </span>
      </div>
      <div style={s.hpRow}>
        <span>Castle HP</span>
        <strong>{hp.toLocaleString()} / {maxHp.toLocaleString()}</strong>
      </div>
      <div style={s.hpTrack}>
        <div style={{ ...s.hpFill, width: `${pct}%`, background: color }} />
      </div>
    </button>
  );
}

function MatchLock({ secondsLeft }) {
  return (
    <section style={s.matchCard}>
      <div>
        <div style={s.kicker}>Prediction lock</div>
        <div style={s.matchName}>Argentina vs France</div>
      </div>
      <div style={s.timerBlock}>
        <span style={s.timer}>{fmtCountdown(secondsLeft)}</span>
        <span style={s.timerHint}>remaining</span>
      </div>
    </section>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={s.sectionHeader}>
      <h2 style={s.sectionTitle}>{title}</h2>
      {right && <span style={s.sectionRight}>{right}</span>}
    </div>
  );
}

function GameCard({ game, done, onPlay }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onPlay(game)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        ...s.gameCard,
        transform: pressed ? "scale(0.985)" : "scale(1)",
        borderColor: done ? `${C.green}55` : C.stroke,
      }}
    >
      <div style={{ ...s.gameIcon, color: game.color, background: `${game.color}18`, borderColor: `${game.color}44` }}>
        {game.icon}
      </div>
      <div style={s.gameBody}>
        <div style={s.gameTopLine}>
          <span style={s.gameName}>{game.name}</span>
          <span style={{ ...s.xpPill, color: game.color, background: `${game.color}16`, borderColor: `${game.color}44` }}>
            +{game.xp}
          </span>
        </div>
        <p style={s.gameDesc}>{game.desc}</p>
      </div>
      <div style={done ? s.doneButton : s.playButton}>
        {done ? "Replay" : "Play"}
      </div>
    </button>
  );
}

function ActivityFeed() {
  return (
    <section style={s.feed}>
      {FEED.map((item, i) => (
        <div key={`${item.user}-${item.time}`} style={{ ...s.feedRow, borderBottom: i < FEED.length - 1 ? `1px solid ${C.stroke}` : "none" }}>
          <span style={s.feedIcon}>{item.icon}</span>
          <div style={s.feedText}>
            <strong>{item.user}</strong> {item.action}
          </div>
          <span style={s.feedTime}>{item.time}</span>
        </div>
      ))}
    </section>
  );
}

function RaidBanner({ onUnavailable }) {
  return (
    <button type="button" style={s.raidBanner} onClick={onUnavailable}>
      <div style={s.raidIcon}>⚔️</div>
      <div style={s.raidBody}>
        <div style={s.raidTitle}>
          Challenge Raid
          <span style={s.raidPill}>Soon</span>
        </div>
        <p style={s.raidCopy}>Team up on match day to break curses and swing castle momentum.</p>
      </div>
      <span style={s.chevron}>›</span>
    </button>
  );
}

function BottomNav({ active, navigate, onUnavailable }) {
  const items = [
    { id: "home", label: "Games", icon: "⚽", route: "/" },
    { id: "guild", label: "Guild", icon: "🏰", route: "/guild" },
    { id: "raids", label: "Raids", icon: "⚔️" },
    { id: "ranks", label: "Ranks", icon: "🏆" },
    { id: "profile", label: "Me", icon: "👤" },
  ];

  return (
    <nav style={s.bottomNav}>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => (item.route ? navigate(item.route) : onUnavailable())}
            style={{ ...s.navItem, color: isActive ? C.green : C.mute }}
          >
            {isActive && <span style={s.navIndicator} />}
            <span style={s.navIcon}>{item.icon}</span>
            <span style={s.navLabel}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(3 * 3600 + 42 * 60 + 19);
  const [localUser, setLocalUser] = useState(() => getUser());
  const [guildDoc, setGuildDoc] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth >= 900,
  );

  useEffect(() => {
    injectFonts();
    setLocalUser(getUser());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((sLeft) => Math.max(0, sLeft - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 900);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!localUser?.homeCountry) return undefined;
    const unsub = onSnapshot(
      doc(db, "guilds", localUser.homeCountry),
      (snap) => setGuildDoc(snap.exists() ? snap.data() : null),
      () => setGuildDoc(null),
    );
    return unsub;
  }, [localUser?.homeCountry]);

  const user = localUser || {
    nickname: "Guest",
    homeCountry: "IND",
    supportTeam: "IND",
    dailyXP: 0,
    tier: "lurker",
  };

  const country = COUNTRIES.find((c) => c.code === user.homeCountry);
  const guild = {
    name: guildDoc?.name || `${country?.name || user.homeCountry} Fan Guild`,
    flag: guildDoc?.flag || user.flag || country?.flag || "🏳️",
    memberCount: guildDoc?.memberCount ?? 0,
    castleHP: guildDoc?.castleHP ?? 0,
    castleHPCap: guildDoc?.castleHPCap ?? CASTLE_HP_CAP,
  };

  const games = useMemo(
    () => GAME_META.map((game) => ({ ...game, done: isDoneToday(game) })),
    [],
  );
  const doneCount = games.filter((game) => game.done).length;
  const xpPct = clampPct(user.dailyXP || 0, DAILY_XP_CAP);

  function showSoon() {
    setToast("That section is coming next.");
    window.clearTimeout(showSoon.timeout);
    showSoon.timeout = window.setTimeout(() => setToast(""), 1800);
  }

  return (
    <Shell>
      <TopNav user={user} xpPct={xpPct} />
      <main style={{ ...s.main, ...(isDesktop ? s.mainDesktop : null) }}>
        <div style={isDesktop ? s.desktopGrid : s.mobileStack}>
          <section style={s.primaryColumn}>
            <Hero user={user} guild={guild} doneCount={doneCount} totalGames={games.length} />

            <SectionHeader title="Today's Games" right={`${doneCount}/${games.length} complete`} />
            <div style={{ ...s.gameList, ...(isDesktop ? s.gameListDesktop : null) }}>
              {games.map((game) => (
                <GameCard key={game.id} game={game} done={game.done} onPlay={() => navigate(game.route)} />
              ))}
            </div>
          </section>

          <aside style={isDesktop ? s.sideColumn : s.mobileStack}>
            <GuildCard guild={guild} onOpen={() => navigate("/guild")} />
            <MatchLock secondsLeft={secondsLeft} />

            <SectionHeader title="Guild Pulse" right="Live" />
            <ActivityFeed />

            <SectionHeader title="Raid Battles" />
            <RaidBanner onUnavailable={showSoon} />
          </aside>
        </div>
      </main>
      <BottomNav active="home" navigate={navigate} onUnavailable={showSoon} />
      <Toast message={toast} />
    </Shell>
  );
}

const s = {
  shell: {
    background:
      "radial-gradient(circle at 50% -80px, rgba(0,212,138,0.18), transparent 260px), #06111f",
    color: C.text,
    minHeight: "100vh",
    width: "100%",
    fontFamily: "'Outfit', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  topNav: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    height: 56,
    padding: "0 16px",
    background: "rgba(6,17,31,0.88)",
    backdropFilter: "blur(18px)",
    borderBottom: `1px solid ${C.stroke}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    border: "none",
    background: "transparent",
    color: C.gold,
    padding: 0,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 25,
    fontWeight: 900,
    letterSpacing: 1.4,
    cursor: "pointer",
  },
  profilePill: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
    background: "rgba(255,255,255,0.045)",
    border: `1px solid ${C.stroke}`,
    borderRadius: 999,
    padding: "7px 10px",
  },
  xpMiniTrack: {
    width: 34,
    height: 5,
    borderRadius: 99,
    background: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  xpMiniFill: {
    height: "100%",
    background: C.green,
    borderRadius: 99,
  },
  profileName: {
    color: C.text,
    fontSize: 12,
    fontWeight: 700,
    maxWidth: 92,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "14px 16px 18px",
  },
  mainDesktop: {
    padding: "26px clamp(24px, 4vw, 56px) 28px",
  },
  mobileStack: {
    display: "flex",
    flexDirection: "column",
  },
  desktopGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 400px)",
    gap: 24,
    alignItems: "start",
  },
  primaryColumn: {
    minWidth: 0,
  },
  sideColumn: {
    minWidth: 0,
    position: "sticky",
    top: 82,
    display: "flex",
    flexDirection: "column",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(145deg, rgba(16,34,58,0.96), rgba(7,22,39,0.96))",
    border: `1px solid ${C.stroke2}`,
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
  },
  heroGlow: {
    position: "absolute",
    inset: "auto -40px -70px auto",
    width: 170,
    height: 170,
    borderRadius: "50%",
    background: "rgba(74,158,255,0.18)",
    filter: "blur(34px)",
  },
  heroTop: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  kicker: {
    color: C.mute,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    margin: "5px 0 0",
    color: C.text,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 32,
    lineHeight: 0.95,
    letterSpacing: 0,
  },
  flagBox: {
    width: 48,
    height: 38,
    borderRadius: 8,
    background: "rgba(255,255,255,0.055)",
    border: `1px solid ${C.stroke}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 25,
    flexShrink: 0,
  },
  heroStats: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginTop: 18,
  },
  stat: {
    background: "rgba(255,255,255,0.045)",
    border: `1px solid ${C.stroke}`,
    borderRadius: 8,
    padding: "10px 8px",
    minWidth: 0,
  },
  statValue: {
    display: "block",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 21,
    fontWeight: 900,
    lineHeight: 1,
    textTransform: "uppercase",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  statLabel: {
    display: "block",
    color: C.mute,
    fontSize: 10,
    fontWeight: 700,
    marginTop: 5,
  },
  xpTrack: {
    position: "relative",
    height: 8,
    marginTop: 16,
    borderRadius: 99,
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 99,
    background: `linear-gradient(90deg, ${C.green}, #67ffd0)`,
  },
  heroFoot: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    color: C.soft,
    fontSize: 11,
    fontWeight: 600,
  },
  guildCard: {
    width: "100%",
    marginTop: 12,
    background: C.panel,
    border: `1px solid ${C.stroke}`,
    borderRadius: 8,
    padding: 14,
    color: C.text,
    textAlign: "left",
    cursor: "pointer",
  },
  guildHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  guildIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 0,
  },
  guildFlag: {
    width: 38,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    background: C.panel2,
    border: `1px solid ${C.stroke}`,
    fontSize: 20,
  },
  guildName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1,
  },
  guildMeta: {
    marginTop: 4,
    color: C.mute,
    fontSize: 11,
    fontWeight: 600,
  },
  statusPill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  hpRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    color: C.mute,
    fontSize: 11,
    fontWeight: 700,
  },
  hpTrack: {
    height: 7,
    marginTop: 8,
    borderRadius: 99,
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  hpFill: {
    height: "100%",
    borderRadius: 99,
  },
  matchCard: {
    marginTop: 10,
    background: "rgba(74,158,255,0.08)",
    border: "1px solid rgba(74,158,255,0.22)",
    borderRadius: 8,
    padding: "13px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  matchName: {
    marginTop: 4,
    color: C.text,
    fontSize: 14,
    fontWeight: 800,
  },
  timerBlock: {
    textAlign: "right",
  },
  timer: {
    display: "block",
    color: C.blue,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 29,
    fontWeight: 900,
    lineHeight: 0.9,
    letterSpacing: 1,
  },
  timerHint: {
    color: C.mute,
    fontSize: 10,
    fontWeight: 700,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "20px 0 10px",
  },
  sectionTitle: {
    margin: 0,
    color: C.text,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionRight: {
    color: C.gold,
    fontSize: 11,
    fontWeight: 800,
  },
  gameList: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },
  gameListDesktop: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
  },
  gameCard: {
    width: "100%",
    background: C.panel,
    border: "1px solid",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 11,
    color: C.text,
    textAlign: "left",
    cursor: "pointer",
    transition: "transform 0.12s ease, border-color 0.12s ease",
  },
  gameIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },
  gameBody: {
    flex: 1,
    minWidth: 0,
  },
  gameTopLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  gameName: {
    color: C.text,
    fontSize: 14,
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  xpPill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 900,
    flexShrink: 0,
  },
  gameDesc: {
    margin: "5px 0 0",
    color: C.mute,
    fontSize: 11,
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  playButton: {
    minWidth: 48,
    height: 34,
    borderRadius: 8,
    background: C.green,
    color: "#04131f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  doneButton: {
    minWidth: 56,
    height: 34,
    borderRadius: 8,
    background: "rgba(0,212,138,0.12)",
    border: "1px solid rgba(0,212,138,0.35)",
    color: C.green,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  feed: {
    background: C.panel,
    border: `1px solid ${C.stroke}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  feedRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
  },
  feedIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: C.panel2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    flexShrink: 0,
  },
  feedText: {
    flex: 1,
    minWidth: 0,
    color: C.soft,
    fontSize: 12,
    lineHeight: 1.25,
  },
  feedTime: {
    color: C.mute,
    fontSize: 10,
    fontWeight: 800,
  },
  raidBanner: {
    width: "100%",
    marginBottom: 14,
    background: "linear-gradient(135deg, rgba(154,114,255,0.16), rgba(74,158,255,0.08))",
    border: "1px solid rgba(154,114,255,0.32)",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: C.text,
    textAlign: "left",
    cursor: "pointer",
  },
  raidIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: "rgba(154,114,255,0.16)",
    border: "1px solid rgba(154,114,255,0.34)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 23,
    flexShrink: 0,
  },
  raidBody: {
    flex: 1,
    minWidth: 0,
  },
  raidTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: C.text,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 20,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  raidPill: {
    border: `1px solid ${C.gold}55`,
    borderRadius: 999,
    padding: "2px 7px",
    color: C.gold,
    background: "rgba(240,192,64,0.12)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10,
    fontWeight: 900,
  },
  raidCopy: {
    margin: "4px 0 0",
    color: C.mute,
    fontSize: 11,
    lineHeight: 1.35,
  },
  chevron: {
    color: C.violet,
    fontSize: 26,
    fontWeight: 900,
  },
  bottomNav: {
    position: "sticky",
    bottom: 0,
    zIndex: 50,
    display: "flex",
    background: "rgba(6,17,31,0.94)",
    backdropFilter: "blur(18px)",
    borderTop: `1px solid ${C.stroke}`,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  navItem: {
    position: "relative",
    flex: 1,
    minWidth: 0,
    border: "none",
    background: "transparent",
    padding: "9px 4px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
  },
  navIndicator: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: 26,
    height: 2,
    borderRadius: "0 0 999px 999px",
    background: C.green,
  },
  navIcon: {
    fontSize: 19,
    lineHeight: 1,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  toast: {
    position: "fixed",
    bottom: 76,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 200,
    maxWidth: "calc(100vw - 32px)",
    background: "#10223a",
    border: `1px solid ${C.stroke2}`,
    borderRadius: 999,
    color: C.text,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
    boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
    pointerEvents: "none",
  },
};
