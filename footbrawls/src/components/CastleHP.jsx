import { useState, useEffect } from "react";
import { getGuildLevel, getLevelProgress, getHPDisplay, checkUpgrade } from "../lib/guildLevels";

const C = {
  accent:  "#F7C344",
  green:   "#3DD68C",
  red:     "#E84040",
};

// ── Per-level castle configs ──────────────────────────────────────────────────
const CASTLE_THEMES = {
  1: { // Grassroots — wood + dirt, rough, barely a fort
    skyDark: ["#050810","#080c18"],
    skyLit:  ["#120c00","#1e1200"],
    stoneDark: "#2a2018", stoneLit: "#4a3418",
    stoneDark2: "#1e1810", stoneLit2: "#3d2c14",
    wallIntDark: "#10080000", wallIntLit: "#2d1800",
    brickDark: "#241c10", brickLit: "#5a3c18",
    brickDark2: "#1c1408", brickLit2: "#4a3010",
    windowDark: "#080402", windowLit: "#d4780a",
    windowGlow: "#e8920c",
    flagDark: "#2a2018", flagLit: "#8B5CF6",
    groundDark: ["#1a1205","#080500"],
    groundLit:  ["#4a2e08","#1e1200"],
    glowGate: ["#c8860a","#7a4500"],
    glowTower: "#c8860a",
    accent: "#8B5CF6",
    // Extra: wood planks overlay on walls
    extra: "wood",
  },
  2: { // Rising — proper stone, limestone, basic castle
    skyDark: ["#060810","#0a0d18"],
    skyLit:  ["#160e02","#241804"],
    stoneDark: "#2e2416", stoneLit: "#5c4020",
    stoneDark2: "#261e12", stoneLit2: "#4e3418",
    wallIntDark: "#180e00", wallIntLit: "#3c2208",
    brickDark: "#2a1e0e", brickLit: "#6e4c22",
    brickDark2: "#221808", brickLit2: "#5a3c18",
    windowDark: "#0a0600", windowLit: "#e8920c",
    windowGlow: "#F7A828",
    flagDark: "#2e2416", flagLit: "#3b82f6",
    groundDark: ["#1e1508","#0a0600"],
    groundLit:  ["#5c3a0a","#281800"],
    glowGate: ["#e8920c","#8a5000"],
    glowTower: "#e8920c",
    accent: "#3b82f6",
    extra: "none",
  },
  3: { // Established — dark granite, imposing walls, multiple towers
    skyDark: ["#060810","#08080e"],
    skyLit:  ["#140e04","#201606"],
    stoneDark: "#1e1e22", stoneLit: "#524830",
    stoneDark2: "#18181c", stoneLit2: "#44402c",
    wallIntDark: "#141008", wallIntLit: "#342808",
    brickDark: "#1c1c20", brickLit: "#5e5438",
    brickDark2: "#161618", brickLit2: "#4e4830",
    windowDark: "#080808", windowLit: "#F7C344",
    windowGlow: "#F7C344",
    flagDark: "#1e1e22", flagLit: "#10b981",
    groundDark: ["#141008","#060400"],
    groundLit:  ["#4c3808","#201600"],
    glowGate: ["#F7C344","#8a6000"],
    glowTower: "#F7C344",
    accent: "#10b981",
    extra: "banner",
  },
  4: { // Elite — polished sandstone, gold trim, ornate
    skyDark: ["#050608","#08080a"],
    skyLit:  ["#120e02","#1e1800"],
    stoneDark: "#2c2410", stoneLit: "#6e5820",
    stoneDark2: "#241c0c", stoneLit2: "#5e4c1a",
    wallIntDark: "#1a1400", wallIntLit: "#4a3400",
    brickDark: "#2a2210", brickLit: "#806230",
    brickDark2: "#221a08", brickLit2: "#6e5224",
    windowDark: "#0c0800", windowLit: "#F7C344",
    windowGlow: "#ffe080",
    flagDark: "#2c2410", flagLit: "#f59e0b",
    groundDark: ["#201600","#080400"],
    groundLit:  ["#6a4400","#301800"],
    glowGate: ["#ffe080","#c8940a"],
    glowTower: "#F7C344",
    accent: "#f59e0b",
    extra: "gold-trim",
  },
  5: { // Legendary — obsidian + purple magic, ethereal glow
    skyDark: ["#04040c","#080814"],
    skyLit:  ["#0c0818","#140e28"],
    stoneDark: "#18142c", stoneLit: "#3c2860",
    stoneDark2: "#100c20", stoneLit2: "#2e1e50",
    wallIntDark: "#100820", wallIntLit: "#280e50",
    brickDark: "#141028", brickLit: "#4a2e70",
    brickDark2: "#0e0c1e", brickLit2: "#3c2460",
    windowDark: "#080412", windowLit: "#a855f7",
    windowGlow: "#c084fc",
    flagDark: "#18142c", flagLit: "#8b5cf6",
    groundDark: ["#0c0818","#040408"],
    groundLit:  ["#2c1060","#140830"],
    glowGate: ["#c084fc","#7c3aed"],
    glowTower: "#a855f7",
    accent: "#8b5cf6",
    extra: "magic",
  },
};

function CastleSVG({ level, hpPct, accent }) {
  const t = CASTLE_THEMES[level] || CASTLE_THEMES[1];
  const H = 200;
  const fillY = H - Math.round(H * hpPct / 100);

  const uid = `lvl${level}`;

  return (
    <svg width="100%" viewBox="0 0 380 200" style={{ display:"block", borderRadius:10, overflow:"hidden" }}>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x="0" y={fillY} width="380" height={H - fillY}/>
        </clipPath>

        {/* Stone patterns */}
        <pattern id={`sb-${uid}`} x="0" y="0" width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="18" height="12" fill={t.stoneDark}/>
          <rect x="0.5" y="0.5" width="16.5" height="5.2" rx="0.4" fill={t.brickDark} stroke={t.stoneDark2} strokeWidth="0.35"/>
          <rect x="0.5" y="6.8" width="16.5" height="4.7" rx="0.4" fill={t.brickDark2} stroke={t.stoneDark2} strokeWidth="0.35"/>
        </pattern>
        <pattern id={`sl-${uid}`} x="0" y="0" width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="18" height="12" fill={t.stoneLit}/>
          <rect x="0.5" y="0.5" width="16.5" height="5.2" rx="0.4" fill={t.brickLit} stroke={t.stoneLit2} strokeWidth="0.35"/>
          <rect x="0.5" y="6.8" width="16.5" height="4.7" rx="0.4" fill={t.brickLit2} stroke={t.stoneLit2} strokeWidth="0.35"/>
        </pattern>
        <pattern id={`sb2-${uid}`} x="9" y="0" width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="18" height="12" fill={t.stoneDark}/>
          <rect x="0.5" y="0.5" width="16.5" height="5.2" rx="0.4" fill={t.brickDark} stroke={t.stoneDark2} strokeWidth="0.35"/>
          <rect x="0.5" y="6.8" width="16.5" height="4.7" rx="0.4" fill={t.brickDark2} stroke={t.stoneDark2} strokeWidth="0.35"/>
        </pattern>
        <pattern id={`sl2-${uid}`} x="9" y="0" width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="18" height="12" fill={t.stoneLit}/>
          <rect x="0.5" y="0.5" width="16.5" height="5.2" rx="0.4" fill={t.brickLit} stroke={t.stoneLit2} strokeWidth="0.35"/>
          <rect x="0.5" y="6.8" width="16.5" height="4.7" rx="0.4" fill={t.brickLit2} stroke={t.stoneLit2} strokeWidth="0.35"/>
        </pattern>

        <linearGradient id={`sky-d-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.skyDark[0]}/>
          <stop offset="100%" stopColor={t.skyDark[1]}/>
        </linearGradient>
        <linearGradient id={`sky-l-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.skyLit[0]}/>
          <stop offset="100%" stopColor={t.skyLit[1]}/>
        </linearGradient>
        <linearGradient id={`gnd-d-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.groundDark[0]}/>
          <stop offset="100%" stopColor={t.groundDark[1]}/>
        </linearGradient>
        <linearGradient id={`gnd-l-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.groundLit[0]}/>
          <stop offset="100%" stopColor={t.groundLit[1]}/>
        </linearGradient>
        <linearGradient id={`wi-d-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.wallIntDark} stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.6"/>
        </linearGradient>
        <linearGradient id={`wi-l-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.wallIntLit} stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3"/>
        </linearGradient>
        <radialGradient id={`gg-${uid}`} cx="50%" cy="85%" r="55%">
          <stop offset="0%" stopColor={t.glowGate[0]} stopOpacity="0.6"/>
          <stop offset="50%" stopColor={t.glowGate[1]} stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`gt-${uid}`} cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor={t.glowTower} stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
        </radialGradient>

        {/* Level 5 magic aura */}
        {level === 5 && (
          <radialGradient id={`magic-${uid}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
          </radialGradient>
        )}
      </defs>

      {/* ── DARK BASE ── */}
      <g>
        <rect width="380" height="200" fill={`url(#sky-d-${uid})`}/>
        {/* Stars */}
        {[[30,14],[72,6],[140,10],[210,5],[275,9],[340,6],[360,18]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={0.6+Math.random()*0.4} fill="rgba(255,255,255,0.45)"/>
        ))}
        <rect x="0" y="178" width="380" height="22" fill={`url(#gnd-d-${uid})`}/>
        <rect x="0" y="176" width="380" height="3" fill={t.stoneDark2} opacity="0.7"/>

        {/* LEFT TOWER */}
        <rect x="25" y="68" width="68" height="112" fill={`url(#sb-${uid})`}/>
        <rect x="25" y="68" width="68" height="112" fill={`url(#wi-d-${uid})`}/>
        <rect x="25" y="68" width="68" height="112" fill="none" stroke={t.stoneDark2} strokeWidth="0.6"/>
        {/* LT battlements */}
        {[24,42,60,78].map((x,i)=>(
          <rect key={i} x={x} y="55" width="14" height="15" rx="1" fill={`url(#sb-${uid})`} stroke={t.stoneDark2} strokeWidth="0.5"/>
        ))}
        {[38,56,74].map((x,i)=><rect key={i} x={x} y="55" width="4" height="15" fill={t.skyDark[0]}/>)}
        {/* LT windows */}
        <rect x="44" y="88" width="16" height="22" rx="3" fill={t.windowDark}/>
        <path d={`M44 100 Q52 90 60 100`} fill={t.windowDark}/>
        <rect x="46" y="142" width="22" height="28" rx="2" fill={t.windowDark}/>
        {/* Flag pole dark */}
        <line x1="59" y1="55" x2="59" y2="26" stroke={t.stoneDark2} strokeWidth="1.6"/>
        <polygon points="59,26 59,40 76,33" fill={t.stoneDark2}/>

        {/* RIGHT TOWER */}
        <rect x="287" y="68" width="68" height="112" fill={`url(#sb2-${uid})`}/>
        <rect x="287" y="68" width="68" height="112" fill={`url(#wi-d-${uid})`}/>
        <rect x="287" y="68" width="68" height="112" fill="none" stroke={t.stoneDark2} strokeWidth="0.6"/>
        {[286,304,322,340].map((x,i)=>(
          <rect key={i} x={x} y="55" width="14" height="15" rx="1" fill={`url(#sb2-${uid})`} stroke={t.stoneDark2} strokeWidth="0.5"/>
        ))}
        {[300,318,336].map((x,i)=><rect key={i} x={x} y="55" width="4" height="15" fill={t.skyDark[0]}/>)}
        <rect x="320" y="88" width="16" height="22" rx="3" fill={t.windowDark}/>
        <path d={`M320 100 Q328 90 336 100`} fill={t.windowDark}/>
        <rect x="312" y="142" width="22" height="28" rx="2" fill={t.windowDark}/>
        <line x1="321" y1="55" x2="321" y2="26" stroke={t.stoneDark2} strokeWidth="1.6"/>
        <polygon points="321,26 321,40 304,33" fill={t.stoneDark2}/>

        {/* MAIN WALL */}
        <rect x="89" y="100" width="202" height="80" fill={`url(#sb-${uid})`}/>
        <rect x="89" y="100" width="202" height="80" fill={`url(#wi-d-${uid})`}/>
        <rect x="89" y="100" width="202" height="80" fill="none" stroke={t.stoneDark2} strokeWidth="0.6"/>
        {[90,108,126,244,262,280].map((x,i)=>(
          <rect key={i} x={x} y="88" width="14" height="14" rx="1" fill={`url(#sb-${uid})`} stroke={t.stoneDark2} strokeWidth="0.4"/>
        ))}
        {/* Gate */}
        <rect x="152" y="128" width="76" height="52" fill={t.skyDark[0]}/>
        <path d="M152 150 Q190 125 228 150" fill={t.skyDark[0]} stroke={t.stoneDark2} strokeWidth="0.6"/>
        {/* Portcullis */}
        {[164,175,186,197,208,219].map((x,i)=>(
          <line key={i} x1={x} y1={135+i%2*3} x2={x} y2="180" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5"/>
        ))}
        {[143,150,156].map((y,i)=>(
          <line key={i} x1="155" y1={y} x2="225" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}
        <ellipse cx="190" cy="180" rx="50" ry="5" fill={t.skyDark[0]} opacity="0.7"/>

        {/* Extra level features — dark */}
        {level >= 3 && <>
          {/* Side turrets */}
          <rect x="89" y="84" width="22" height="18" fill={`url(#sb-${uid})`} stroke={t.stoneDark2} strokeWidth="0.5"/>
          <rect x="269" y="84" width="22" height="18" fill={`url(#sb-${uid})`} stroke={t.stoneDark2} strokeWidth="0.5"/>
        </>}
        {level >= 4 && <>
          {/* Centre tower above gate */}
          <rect x="168" y="72" width="44" height="32" fill={`url(#sb-${uid})`} stroke={t.stoneDark2} strokeWidth="0.5"/>
          {[167,180,194,206].map((x,i)=>(
            <rect key={i} x={x} y="60" width="12" height="14" rx="1" fill={`url(#sb-${uid})`} stroke={t.stoneDark2} strokeWidth="0.4"/>
          ))}
          {[179,193].map((x,i)=><rect key={i} x={x} y="60" width="3" height="14" fill={t.skyDark[0]}/>)}
        </>}
        {level >= 5 && <>
          {/* Dark magic aura outlines */}
          <circle cx="190" cy="100" r="80" fill="none" stroke="rgba(168,85,247,0.06)" strokeWidth="40"/>
        </>}
      </g>

      {/* ── LIT CASTLE (clipped) ── */}
      <g clipPath={`url(#clip-${uid})`}>
        <rect width="380" height="200" fill={`url(#sky-l-${uid})`}/>
        {/* Moon */}
        <circle cx="320" cy="28" r="16" fill={t.windowGlow} opacity="0.1"/>
        <circle cx="320" cy="28" r="10" fill={t.windowGlow} opacity="0.14"/>
        {level === 5 && <ellipse cx="190" cy="90" rx="130" ry="80" fill={`url(#magic-${uid})`}/>}
        <rect x="0" y="178" width="380" height="22" fill={`url(#gnd-l-${uid})`}/>
        <rect x="0" y="176" width="380" height="3" fill={t.stoneLit2} opacity="0.8"/>
        {/* Ground torch glow */}
        <ellipse cx="92" cy="179" rx="28" ry="5" fill={t.windowGlow} opacity="0.15"/>
        <ellipse cx="288" cy="179" rx="28" ry="5" fill={t.windowGlow} opacity="0.15"/>

        {/* LEFT TOWER lit */}
        <rect x="25" y="68" width="68" height="112" fill={`url(#sl-${uid})`}/>
        <rect x="25" y="68" width="68" height="112" fill={`url(#wi-l-${uid})`}/>
        <rect x="25" y="68" width="68" height="112" fill="none" stroke={t.stoneLit2} strokeWidth="0.6"/>
        <rect x="28" y="68" width="64" height="112" fill={`url(#gt-${uid})`} opacity="0.7"/>
        {[24,42,60,78].map((x,i)=>(
          <rect key={i} x={x} y="55" width="14" height="15" rx="1" fill={`url(#sl-${uid})`} stroke={t.stoneLit2} strokeWidth="0.5"/>
        ))}
        {[38,56,74].map((x,i)=><rect key={i} x={x} y="55" width="4" height="15" fill={t.skyLit[0]}/>)}
        {/* LT windows glowing */}
        <rect x="44" y="88" width="16" height="22" rx="3" fill={t.windowLit} opacity="0.92"/>
        <path d={`M44 100 Q52 90 60 100`} fill={t.windowLit} opacity="0.92"/>
        <rect x="43" y="87" width="18" height="24" rx="3" fill="none" stroke={t.windowGlow} strokeWidth="0.8" opacity="0.7"/>
        <ellipse cx="52" cy="99" rx="20" ry="16" fill={t.windowGlow} opacity="0.18"/>
        <rect x="46" y="142" width="22" height="28" rx="2" fill={t.windowLit} opacity="0.85"/>
        <ellipse cx="57" cy="155" rx="16" ry="11" fill={t.windowGlow} opacity="0.22"/>
        {/* LT torch */}
        <rect x="88" y="112" width="3.5" height="11" rx="1" fill={`${t.stoneLit}88`}/>
        <ellipse cx="89" cy="110" rx="3.5" ry="4.5" fill={t.windowLit} opacity="0.92"/>
        <ellipse cx="89" cy="107" rx="2" ry="2.5" fill="#fffde0"/>
        <ellipse cx="89" cy="110" rx="9" ry="7" fill={t.windowGlow} opacity="0.22"/>
        {/* Flag pole lit */}
        <line x1="59" y1="55" x2="59" y2="22" stroke={t.stoneLit2} strokeWidth="1.6"/>
        <polygon points="59,22 59,38 80,30" fill={t.flagLit}/>
        <ellipse cx="70" cy="30" rx="13" ry="9" fill={t.flagLit} opacity="0.18"/>

        {/* RIGHT TOWER lit */}
        <rect x="287" y="68" width="68" height="112" fill={`url(#sl2-${uid})`}/>
        <rect x="287" y="68" width="68" height="112" fill={`url(#wi-l-${uid})`}/>
        <rect x="287" y="68" width="68" height="112" fill="none" stroke={t.stoneLit2} strokeWidth="0.6"/>
        <rect x="290" y="68" width="62" height="112" fill={`url(#gt-${uid})`} opacity="0.7"/>
        {[286,304,322,340].map((x,i)=>(
          <rect key={i} x={x} y="55" width="14" height="15" rx="1" fill={`url(#sl2-${uid})`} stroke={t.stoneLit2} strokeWidth="0.5"/>
        ))}
        {[300,318,336].map((x,i)=><rect key={i} x={x} y="55" width="4" height="15" fill={t.skyLit[0]}/>)}
        <rect x="320" y="88" width="16" height="22" rx="3" fill={t.windowLit} opacity="0.92"/>
        <path d={`M320 100 Q328 90 336 100`} fill={t.windowLit} opacity="0.92"/>
        <rect x="319" y="87" width="18" height="24" rx="3" fill="none" stroke={t.windowGlow} strokeWidth="0.8" opacity="0.7"/>
        <ellipse cx="328" cy="99" rx="20" ry="16" fill={t.windowGlow} opacity="0.18"/>
        <rect x="312" y="142" width="22" height="28" rx="2" fill={t.windowLit} opacity="0.85"/>
        <ellipse cx="323" cy="155" rx="16" ry="11" fill={t.windowGlow} opacity="0.22"/>
        <rect x="288" y="112" width="3.5" height="11" rx="1" fill={`${t.stoneLit}88`}/>
        <ellipse cx="289" cy="110" rx="3.5" ry="4.5" fill={t.windowLit} opacity="0.92"/>
        <ellipse cx="289" cy="107" rx="2" ry="2.5" fill="#fffde0"/>
        <ellipse cx="289" cy="110" rx="9" ry="7" fill={t.windowGlow} opacity="0.22"/>
        <line x1="321" y1="55" x2="321" y2="22" stroke={t.stoneLit2} strokeWidth="1.6"/>
        <polygon points="321,22 321,38 300,30" fill={t.flagLit}/>
        <ellipse cx="310" cy="30" rx="13" ry="9" fill={t.flagLit} opacity="0.18"/>

        {/* MAIN WALL lit */}
        <rect x="89" y="100" width="202" height="80" fill={`url(#sl-${uid})`}/>
        <rect x="89" y="100" width="202" height="80" fill={`url(#wi-l-${uid})`}/>
        <rect x="89" y="100" width="202" height="80" fill="none" stroke={t.stoneLit2} strokeWidth="0.6"/>
        {[90,108,126,244,262,280].map((x,i)=>(
          <rect key={i} x={x} y="88" width="14" height="14" rx="1" fill={`url(#sl-${uid})`} stroke={t.stoneLit2} strokeWidth="0.4"/>
        ))}
        {/* Gate glow */}
        <rect x="152" y="128" width="76" height="52" fill={t.skyLit[0]}/>
        <path d="M152 150 Q190 125 228 150" fill={t.skyLit[0]} stroke={t.stoneLit2} strokeWidth="0.6"/>
        <ellipse cx="190" cy="160" rx="34" ry="28" fill={`url(#gg-${uid})`} opacity="0.95"/>
        {[164,175,186,197,208,219].map((x,i)=>(
          <line key={i} x1={x} y1={135+i%2*3} x2={x} y2="180" stroke={`${t.windowGlow}33`} strokeWidth="1.5"/>
        ))}
        {[143,150,156].map((y,i)=>(
          <line key={i} x1="155" y1={y} x2="225" y2={y} stroke={`${t.windowGlow}22`} strokeWidth="1"/>
        ))}
        {/* Wall torches */}
        {[[136,113],[244,113]].map(([x,y],i)=>(
          <g key={i}>
            <rect x={x} y={y} width="3.5" height="10" rx="1" fill={`${t.stoneLit}88`}/>
            <ellipse cx={x+1.5} cy={y-1} rx="3" ry="4" fill={t.windowLit} opacity="0.9"/>
            <ellipse cx={x+1.5} cy={y-4} rx="1.8" ry="2.2" fill="#fffde0"/>
            <ellipse cx={x+1.5} cy={y-1} rx="8" ry="6.5" fill={t.windowGlow} opacity="0.2"/>
          </g>
        ))}
        <ellipse cx="190" cy="182" rx="50" ry="4.5" fill={t.glowTower} opacity="0.18"/>

        {/* Level 3+ side turrets lit */}
        {level >= 3 && <>
          <rect x="89" y="84" width="22" height="18" fill={`url(#sl-${uid})`} stroke={t.stoneLit2} strokeWidth="0.5"/>
          <rect x="269" y="84" width="22" height="18" fill={`url(#sl-${uid})`} stroke={t.stoneLit2} strokeWidth="0.5"/>
          {/* Banners */}
          <rect x="148" y="100" width="4" height="26" fill={t.stoneLit2}/>
          <polygon points="152,100 152,116 168,108" fill={t.accent}/>
          <rect x="228" y="100" width="4" height="26" fill={t.stoneLit2}/>
          <polygon points="228,100 228,116 212,108" fill={t.accent}/>
        </>}

        {/* Level 4+ centre tower lit */}
        {level >= 4 && <>
          <rect x="168" y="72" width="44" height="32" fill={`url(#sl-${uid})`} stroke={t.stoneLit2} strokeWidth="0.5"/>
          <rect x="168" y="72" width="44" height="32" fill={`url(#wi-l-${uid})`} opacity="0.5"/>
          {[167,180,194,206].map((x,i)=>(
            <rect key={i} x={x} y="60" width="12" height="14" rx="1" fill={`url(#sl-${uid})`} stroke={t.stoneLit2} strokeWidth="0.4"/>
          ))}
          {[179,193].map((x,i)=><rect key={i} x={x} y="60" width="3" height="14" fill={t.skyLit[0]}/>)}
          {/* Centre window */}
          <rect x="183" y="77" width="14" height="18" rx="2" fill={t.windowLit} opacity="0.92"/>
          <ellipse cx="190" cy="84" rx="12" ry="10" fill={t.windowGlow} opacity="0.25"/>
          {/* Gold trim on battlements */}
          <rect x="167" y="59" width="46" height="2" fill={t.accent} opacity="0.6" rx="1"/>
        </>}

        {/* Level 5 magic effects */}
        {level === 5 && <>
          <ellipse cx="190" cy="110" rx="90" ry="60" fill={`url(#magic-${uid})`} opacity="0.8"/>
          {/* Floating orbs */}
          {[[80,70],[300,65],[155,50],[225,52]].map(([x,y],i)=>(
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#a855f7" opacity="0.7">
                <animate attributeName="cy" values={`${y};${y-8};${y}`} dur={`${2+i*0.5}s`} repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7;0.3;0.7" dur={`${2+i*0.5}s`} repeatCount="indefinite"/>
              </circle>
              <circle cx={x} cy={y} r="8" fill="#a855f7" opacity="0.12">
                <animate attributeName="cy" values={`${y};${y-8};${y}`} dur={`${2+i*0.5}s`} repeatCount="indefinite"/>
              </circle>
            </g>
          ))}
          {/* Magic runes on gate */}
          <text x="185" y="168" fontSize="10" fill="#c084fc" opacity="0.55" fontFamily="serif">✦</text>
          <text x="172" y="162" fontSize="7" fill="#a855f7" opacity="0.4" fontFamily="serif">◈</text>
          <text x="200" y="162" fontSize="7" fill="#a855f7" opacity="0.4" fontFamily="serif">◈</text>
        </>}
      </g>

      {/* HP waterline */}
      {hpPct > 2 && hpPct < 98 && (
        <line x1="0" y1={fillY} x2="380" y2={fillY} stroke={`${t.accent}88`} strokeWidth="0.8" strokeDasharray="5 4"/>
      )}
    </svg>
  );
}

// ── Main CastleHP component ───────────────────────────────────────────────────
export default function CastleHP({ hp = 0, maxHp = 10000, contributors = [], guildLevel = 1 }) {
  const levelConfig = getGuildLevel(guildLevel);
  const hpPct       = Math.min(100, Math.round((hp / maxHp) * 100));
  const hpColor     = hpPct >= 70 ? C.green : hpPct >= 35 ? C.accent : C.red;
  const hpLabel     = hpPct >= 70 ? "Fortress" : hpPct >= 35 ? "Holding" : "Under Pressure";
  const hpDisplay   = getHPDisplay(hp, guildLevel);

  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${levelConfig.color}28`, borderRadius:18, overflow:"hidden" }}>
      {/* Level badge header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 10px", borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>{levelConfig.emoji}</span>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", letterSpacing:2, color:levelConfig.color, lineHeight:1 }}>
              {levelConfig.name} Guild
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.56rem", color:"rgba(242,242,244,0.35)", letterSpacing:1.5, textTransform:"uppercase", marginTop:2 }}>
              Level {guildLevel} · {hpLabel}
            </div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.4rem", color:hpColor, lineHeight:1, letterSpacing:1 }}>
            {hp.toLocaleString()}
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.54rem", color:"rgba(242,242,244,0.35)", marginTop:2 }}>
            / {maxHp.toLocaleString()} HP
          </div>
        </div>
      </div>

      {/* Castle SVG */}
      <div style={{ padding:"0 4px" }}>
        <CastleSVG level={guildLevel} hpPct={hpPct} accent={levelConfig.color}/>
      </div>

      {/* Progress bar + level progress */}
      <div style={{ padding:"10px 16px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color:"rgba(242,242,244,0.4)", letterSpacing:1, textTransform:"uppercase" }}>
            HP Progress
          </span>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color:hpColor, fontWeight:700 }}>
            {hpPct}%
          </span>
        </div>
        <div style={{ height:6, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
          <div style={{ width:`${hpPct}%`, height:"100%", borderRadius:99, background:`linear-gradient(90deg,${hpColor},${hpColor}aa)`, transition:"width 0.5s ease", boxShadow:`0 0 8px ${hpColor}55` }}/>
        </div>

        {/* Contributors */}
        {contributors.length > 0 && (
          <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.55rem", color:"rgba(242,242,244,0.3)", letterSpacing:1, textTransform:"uppercase", flexShrink:0 }}>Top builders</span>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {contributors.map((c,i) => (
                <span key={i} style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", color:levelConfig.color, background:`${levelConfig.color}15`, border:`1px solid ${levelConfig.color}28`, borderRadius:99, padding:"2px 8px" }}>
                  {c.flag||"🏳️"} {c.nickname} +{c.contribution||0}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}