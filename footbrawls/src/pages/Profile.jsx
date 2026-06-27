import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const C = {
  bg:      "#05080f",
  bg2:     "#080c17",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  gold:    "#F7C344",
  goldGlow:"rgba(247,195,68,0.3)",
  green:   "#3DD68C",
  red:     "#E84040",
  blue:    "#4F8EF7",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};

const TIERS = [
  { name: "lurker",  min: 0,   color: C.muted,   label: "LURKER"  },
  { name: "fan",     min: 50,  color: "#3b82f6", label: "FAN"     },
  { name: "veteran", min: 200, color: C.green,   label: "VETERAN" },
  { name: "ultra",   min: 500, color: C.gold,    label: "ULTRA"   },
  { name: "legend",  min: 9999,color: "#a855f7", label: "LEGEND"  },
];

function getTier(totalXP = 0) {
  return [...TIERS].reverse().find(t => totalXP >= t.min) || TIERS[0];
}

const KIT_COLORS = {
  FR:  { shirt: "#0a26b1", shirtDark: "#061880", shorts: "#0a26b1", shortsDark: "#061880", socks: "#e1000f", pattern: "plain",    flag: "🇫🇷", name: "FRANCE" },
  BR:  { shirt: "#ffdf00", shirtDark: "#d4b800", shorts: "#002776", shortsDark: "#001655", socks: "#009b3a", pattern: "plain",    flag: "🇧🇷", name: "BRAZIL" },
  AR:  { shirt: "#74acdf", shirtDark: "#4e8ec7", shorts: "#0a0a2e", shortsDark: "#050518", socks: "#74acdf", pattern: "stripes", flag: "🇦🇷", name: "ARGENTINA" },
  DE:  { shirt: "#ffffff", shirtDark: "#d8d8d8", shorts: "#1a1a1a", shortsDark: "#000000", socks: "#ffffff", pattern: "plain",    flag: "🇩🇪", name: "GERMANY" },
  IT:  { shirt: "#003f8a", shirtDark: "#002d63", shorts: "#ffffff", shortsDark: "#e0e0e0", socks: "#003f8a", pattern: "plain",    flag: "🇮🇹", name: "ITALY" },
  ES:  { shirt: "#c1121f", shirtDark: "#8f0c16", shorts: "#c1121f", shortsDark: "#8f0c16", socks: "#ffdf00", pattern: "plain",    flag: "🇪🇸", name: "SPAIN" },
  GB:  { shirt: "#ffffff", shirtDark: "#e0e0e0", shorts: "#0a26b1", shortsDark: "#061880", socks: "#ffffff", pattern: "plain",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "ENGLAND" },
  US:  { shirt: "#ffffff", shirtDark: "#e0e0e0", shorts: "#002776", shortsDark: "#001655", socks: "#bf0a30", pattern: "plain",    flag: "🇺🇸", name: "USA" },
};

/* ─────────────────────────────────────────────────────────────
   3-D REVOLVING PLAYER  –  mouse-drag + auto-spin + real depth
───────────────────────────────────────────────────────────── */
function PlayerMannequin3D({ kit }) {
  const containerRef = useRef(null);
  const angleRef     = useRef(20);          // current Y rotation
  const velRef       = useRef(0);           // momentum
  const dragging     = useRef(false);
  const lastX        = useRef(0);
  const rafRef       = useRef(null);
  const autoSpin     = useRef(true);

  // ---- derived colours ----
  const shirt      = kit.shirt;
  const shirtDark  = kit.shirtDark;
  const shorts     = kit.shorts;
  const shortsDark = kit.shortsDark;
  const socks      = kit.socks;
  const isStripe   = kit.pattern === "stripes";
  const stripeA    = shirt;
  const stripeB    = "#ffffff";

  // Each CSS face needs a "side" fill that's the darkened edge colour
  const shirtSide  = shirtDark;
  const shortsSide = shortsDark;
  const sockSide   = socks + "bb";

  // ---- animation loop ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const tick = () => {
      if (dragging.current) {
        // momentum decays while dragging is live (handled by pointer events)
      } else {
        if (autoSpin.current) {
          velRef.current = 0.45;               // constant auto-rotate
        } else {
          velRef.current *= 0.93;              // friction after drag
          if (Math.abs(velRef.current) < 0.05) autoSpin.current = true;
        }
        angleRef.current = (angleRef.current + velRef.current) % 360;
      }
      el.style.transform = `rotateY(${angleRef.current}deg)`;

      // Dynamic lighting based on angle
      const rad     = (angleRef.current * Math.PI) / 180;
      const light   = 0.5 + 0.5 * Math.cos(rad);
      const bri     = (0.7 + light * 0.45).toFixed(2);
      const con     = (0.85 + light * 0.2).toFixed(2);
      el.style.filter = `brightness(${bri}) contrast(${con})`;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ---- pointer drag ----
  const onPointerDown = (e) => {
    dragging.current  = true;
    autoSpin.current  = false;
    lastX.current     = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    containerRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const x   = e.clientX ?? e.touches?.[0]?.clientX ?? lastX.current;
    const dx  = x - lastX.current;
    velRef.current     = dx * 0.6;
    angleRef.current   = (angleRef.current + dx * 0.6) % 360;
    lastX.current      = x;
  };
  const onPointerUp = () => {
    dragging.current = false;
    // velRef keeps momentum; auto-spin resumes when it decays
  };

  /* ---- build striped pattern for Argentina ---- */
  const stripeStyle = isStripe
    ? {
        background: `repeating-linear-gradient(90deg, ${stripeA} 0px, ${stripeA} 12px, ${stripeB} 12px, ${stripeB} 24px)`,
      }
    : { background: shirt };

  /* ----------------------------------------------------------------
     CSS 3-D box approach:
     Each body part is a div with 6 faces (front/back/left/right/top/bottom).
     We use transform-style: preserve-3d throughout so the browser
     composites them in real 3D — giving genuine depth from every angle.
  ---------------------------------------------------------------- */

  // Utility: build a 3-D box node
  // w=CSS width of the front face, h=height, d=depth (thickness)
  // faceColors: { front, back, left, right, top, bottom }
  const Box3D = ({ w, h, d, style = {}, faceColors = {}, children, className }) => {
    const fc = {
      front:  faceColors.front  || shirt,
      back:   faceColors.back   || shirtDark,
      left:   faceColors.left   || shirtSide,
      right:  faceColors.right  || shirtSide,
      top:    faceColors.top    || shirtDark,
      bottom: faceColors.bottom || shirtDark,
    };
    const faceBase = {
      position: "absolute",
      backfaceVisibility: "hidden",
    };
    return (
      <div
        className={className}
        style={{
          position:        "relative",
          width:           w,
          height:          h,
          transformStyle:  "preserve-3d",
          ...style,
        }}
      >
        {/* front */}
        <div style={{ ...faceBase, width: w, height: h, background: isStripe ? `repeating-linear-gradient(90deg,${stripeA} 0,${stripeA} 12px,${stripeB} 12px,${stripeB} 24px)` : fc.front, transform: `translateZ(${d/2}px)` }}>{children}</div>
        {/* back */}
        <div style={{ ...faceBase, width: w, height: h, background: fc.back, transform: `rotateY(180deg) translateZ(${d/2}px)` }} />
        {/* left */}
        <div style={{ ...faceBase, width: d, height: h, background: fc.left, transform: `rotateY(-90deg) translateZ(${d/2}px)` }} />
        {/* right */}
        <div style={{ ...faceBase, width: d, height: h, background: fc.right, transform: `rotateY(90deg) translateZ(${w - d/2}px)` }} />
        {/* top */}
        <div style={{ ...faceBase, width: w, height: d, background: fc.top, transform: `rotateX(90deg) translateZ(${d/2}px)` }} />
        {/* bottom */}
        <div style={{ ...faceBase, width: w, height: d, background: fc.bottom, transform: `rotateX(-90deg) translateZ(${h - d/2}px)` }} />
      </div>
    );
  };

  const SKIN      = "url(#skinGrad)";
  const SKIN_SIDE = "#c08050";
  const SKIN_DARK = "#a06030";

  /* ─── SVG mannequin with real 3-D depth via transform-style ─── */
  return (
    <div
      style={{
        perspective:     "1100px",
        perspectiveOrigin: "50% 40%",
        width:           "100%",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        userSelect:      "none",
        cursor:          "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* The rotating group */}
      <div
        ref={containerRef}
        style={{
          transformStyle:  "preserve-3d",
          willChange:      "transform",
          position:        "relative",
          width:           120,
          height:          340,
        }}
      >
        {/* ── HEAD ── */}
        <div style={{
          position:       "absolute",
          top:            0,
          left:           "50%",
          transformStyle: "preserve-3d",
          transform:      "translateX(-50%)",
        }}>
          {/* skull – a stretched sphere approximated by a layered set of planes */}
          <Box3D
            w={52} h={58} d={44}
            style={{ transform: "translateX(0)" }}
            faceColors={{
              front:  "#e8b88a",
              back:   "#c07840",
              left:   "#d09060",
              right:  "#d09060",
              top:    "#4a2f14",   // hair
              bottom: "#e8b88a",
            }}
          />
          {/* face overlay (eyes, mouth) drawn on front face – just colour cues */}
          <div style={{
            position:   "absolute",
            top:        14,
            left:       "50%",
            transform:  `translateX(-50%) translateZ(${44/2 + 0.5}px)`,
            width:      52,
            height:     40,
            pointerEvents: "none",
          }}>
            {/* eyes */}
            <div style={{ position:"absolute", top:12, left:10, width:10, height:7, borderRadius:"50%", background:"#1a0f05", border:"2px solid #fff5" }} />
            <div style={{ position:"absolute", top:12, right:10, width:10, height:7, borderRadius:"50%", background:"#1a0f05", border:"2px solid #fff5" }} />
            {/* mouth */}
            <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", width:18, height:5, borderRadius:"0 0 9px 9px", background:"#8b4513", opacity:0.7 }} />
          </div>
        </div>

        {/* ── NECK ── */}
        <Box3D
          w={22} h={18} d={18}
          style={{
            position:  "absolute",
            top:       54,
            left:      "50%",
            transform: "translateX(-50%)",
          }}
          faceColors={{ front:SKIN_SIDE, back:SKIN_DARK, left:SKIN_DARK, right:SKIN_DARK, top:SKIN_SIDE, bottom:SKIN_SIDE }}
        />

        {/* ── TORSO ── */}
        <Box3D
          w={88} h={90} d={36}
          style={{
            position:  "absolute",
            top:       70,
            left:      "50%",
            transform: "translateX(-50%)",
          }}
          faceColors={{
            front:  isStripe ? shirt : shirt,
            back:   shirtDark,
            left:   shirtSide,
            right:  shirtSide,
            top:    shirtDark,
            bottom: shirtDark,
          }}
        >
          {/* badge */}
          <div style={{
            position:    "absolute",
            top:         20,
            left:        12,
            width:       16,
            height:      16,
            borderRadius:"50%",
            background:  "rgba(255,255,255,0.9)",
            border:      "1px solid rgba(0,0,0,0.15)",
            display:     "flex",
            alignItems:  "center",
            justifyContent:"center",
            fontSize:    9,
            zIndex:      2,
          }}>
            {kit.flag}
          </div>
          {/* number */}
          <div style={{
            position:   "absolute",
            bottom:     8,
            left:       "50%",
            transform:  "translateX(-50%)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize:   28,
            color:      "rgba(255,255,255,0.18)",
            lineHeight: 1,
          }}>10</div>
        </Box3D>

        {/* ── LEFT UPPER ARM ── */}
        <Box3D
          w={18} h={52} d={18}
          style={{
            position:  "absolute",
            top:       72,
            left:      "50%",
            transform: "translateX(-98px) rotateZ(12deg)",
            transformOrigin: "top center",
          }}
          faceColors={{ front:shirt, back:shirtDark, left:shirtSide, right:shirtSide, top:shirtDark, bottom:shirtDark }}
        />
        {/* ── LEFT FOREARM ── */}
        <Box3D
          w={15} h={46} d={15}
          style={{
            position:  "absolute",
            top:       120,
            left:      "50%",
            transform: "translateX(-106px) rotateZ(6deg)",
            transformOrigin: "top center",
          }}
          faceColors={{ front:SKIN_SIDE, back:SKIN_DARK, left:SKIN_DARK, right:SKIN_DARK, top:SKIN_SIDE, bottom:SKIN_SIDE }}
        />
        {/* ── LEFT HAND ── */}
        <Box3D
          w={13} h={14} d={10}
          style={{
            position:  "absolute",
            top:       163,
            left:      "50%",
            transform: "translateX(-107px)",
          }}
          faceColors={{ front:SKIN_SIDE, back:SKIN_DARK, left:SKIN_DARK, right:SKIN_DARK, top:SKIN_SIDE, bottom:SKIN_SIDE }}
        />

        {/* ── RIGHT UPPER ARM ── */}
        <Box3D
          w={18} h={52} d={18}
          style={{
            position:  "absolute",
            top:       72,
            left:      "50%",
            transform: "translateX(80px) rotateZ(-12deg)",
            transformOrigin: "top center",
          }}
          faceColors={{ front:shirt, back:shirtDark, left:shirtSide, right:shirtSide, top:shirtDark, bottom:shirtDark }}
        />
        {/* ── RIGHT FOREARM ── */}
        <Box3D
          w={15} h={46} d={15}
          style={{
            position:  "absolute",
            top:       120,
            left:      "50%",
            transform: "translateX(91px) rotateZ(-6deg)",
            transformOrigin: "top center",
          }}
          faceColors={{ front:SKIN_SIDE, back:SKIN_DARK, left:SKIN_DARK, right:SKIN_DARK, top:SKIN_SIDE, bottom:SKIN_SIDE }}
        />
        {/* ── RIGHT HAND ── */}
        <Box3D
          w={13} h={14} d={10}
          style={{
            position:  "absolute",
            top:       163,
            left:      "50%",
            transform: "translateX(94px)",
          }}
          faceColors={{ front:SKIN_SIDE, back:SKIN_DARK, left:SKIN_DARK, right:SKIN_DARK, top:SKIN_SIDE, bottom:SKIN_SIDE }}
        />

        {/* ── HIPS / SHORTS WAISTBAND ── */}
        <Box3D
          w={90} h={12} d={32}
          style={{
            position:  "absolute",
            top:       158,
            left:      "50%",
            transform: "translateX(-50%)",
          }}
          faceColors={{ front:shortsDark, back:shortsDark, left:shortsDark, right:shortsDark, top:shortsDark, bottom:shortsDark }}
        />

        {/* ── LEFT THIGH (SHORTS) ── */}
        <Box3D
          w={38} h={56} d={30}
          style={{
            position:  "absolute",
            top:       168,
            left:      "50%",
            transform: "translateX(-50%) translateX(-22px)",
          }}
          faceColors={{ front:shorts, back:shortsDark, left:shortsSide, right:shortsSide, top:shorts, bottom:shorts }}
        />
        {/* ── RIGHT THIGH (SHORTS) ── */}
        <Box3D
          w={38} h={56} d={30}
          style={{
            position:  "absolute",
            top:       168,
            left:      "50%",
            transform: "translateX(-50%) translateX(22px)",
          }}
          faceColors={{ front:shorts, back:shortsDark, left:shortsSide, right:shortsSide, top:shorts, bottom:shorts }}
        />

        {/* ── LEFT SHIN ── */}
        <Box3D
          w={28} h={70} d={22}
          style={{
            position:  "absolute",
            top:       222,
            left:      "50%",
            transform: "translateX(-50%) translateX(-22px)",
          }}
          faceColors={{ front:socks, back:socks+"88", left:socks+"aa", right:socks+"aa", top:socks, bottom:socks }}
        />
        {/* ── RIGHT SHIN ── */}
        <Box3D
          w={28} h={70} d={22}
          style={{
            position:  "absolute",
            top:       222,
            left:      "50%",
            transform: "translateX(-50%) translateX(22px)",
          }}
          faceColors={{ front:socks, back:socks+"88", left:socks+"aa", right:socks+"aa", top:socks, bottom:socks }}
        />

        {/* ── LEFT BOOT ── */}
        <Box3D
          w={32} h={18} d={30}
          style={{
            position:  "absolute",
            top:       290,
            left:      "50%",
            transform: "translateX(-50%) translateX(-22px) translateZ(4px)",
          }}
          faceColors={{ front:C.gold, back:"#b8920a", left:"#c9a01a", right:"#c9a01a", top:"#d4ac20", bottom:"#7a6000" }}
        />
        {/* ── RIGHT BOOT ── */}
        <Box3D
          w={32} h={18} d={30}
          style={{
            position:  "absolute",
            top:       290,
            left:      "50%",
            transform: "translateX(-50%) translateX(22px) translateZ(4px)",
          }}
          faceColors={{ front:C.gold, back:"#b8920a", left:"#c9a01a", right:"#c9a01a", top:"#d4ac20", bottom:"#7a6000" }}
        />

      </div>

      {/* Ground shadow */}
      <div style={{
        width:        100,
        height:       18,
        marginTop:    8,
        background:   "radial-gradient(ellipse, rgba(247,195,68,0.18) 0%, transparent 80%)",
        borderRadius: "50%",
      }} />

      {/* Drag hint */}
      <div style={{
        marginTop:   10,
        fontSize:    11,
        color:       C.muted2,
        fontFamily:  "'Space Mono', monospace",
        letterSpacing: 1,
        userSelect:  "none",
      }}>
        ↔ DRAG TO ROTATE
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const user = getUser();

  const countryCode = user?.homeCountry || "FR";
  const kit = KIT_COLORS[countryCode] || KIT_COLORS.FR;
  const countryObj = COUNTRIES.find(c => c.code === countryCode);
  const currentTier = getTier(user?.totalXP || 0);

  const achievements = [
    { title: "Striker Hero",  desc: "Gain 200+ XP in a single day",           unlocked: true,  icon: "🔥" },
    { title: "Castle Raider", desc: "Win a Castle Raid with a teammate",       unlocked: true,  icon: "🏰" },
    { title: "Hot Predictor", desc: "Reach a 3.0x hot streak multiplier",      unlocked: true,  icon: "🎯" },
    { title: "Trivia Master", desc: "Answer 5 consecutive trivia correctly",   unlocked: false, icon: "🧠" },
    { title: "Consul MVP",    desc: "Gain Raid MVP points bonus",              unlocked: false, icon: "👑" },
  ];

  return (
    <div style={{
      fontFamily:   "'Syne', sans-serif",
      background:   C.bg,
      color:        C.text,
      minHeight:    "100vh",
      padding:      "24px max(12px, 4vw) 100px",
      boxSizing:    "border-box",
      position:     "relative",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{
          fontFamily:    "'Bebas Neue', sans-serif",
          fontSize:      "3rem",
          letterSpacing: "3px",
          color:         C.gold,
          margin:        0,
        }}>
          👤 ATHLETE DOSSIER
        </h1>
        <p style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>
          Inspect your athlete career standings, custom national kit, and unlocked accolades
        </p>
      </div>

      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap:                 28,
        maxWidth:            820,
        margin:              "0 auto",
      }} className="profile-grid">

        {/* LEFT COLUMN: 3D Jersey Mannequin */}
        <div style={{
          background:   "rgba(255,255,255,0.025)",
          border:       `1px solid ${C.border}`,
          borderRadius: 18,
          padding:      24,
          textAlign:    "center",
          display:      "flex",
          flexDirection:"column",
          alignItems:   "center",
          position:     "relative",
          boxShadow:    "0 8px 32px rgba(0,0,0,0.3)",
          overflow:     "hidden",
        }}>
          <div style={{
            fontFamily:    "'Space Mono', monospace",
            fontSize:      10,
            color:         C.gold,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom:  16,
          }}>
            3D Kit Viewer
          </div>

          <PlayerMannequin3D kit={kit} />

          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 20 }}>{kit.flag}</span>
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Space Mono', monospace" }}>
              {kit.name} KIT
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Player Bio & Accolades */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats card */}
          <div style={{
            background:   "rgba(255,255,255,0.025)",
            border:       `1px solid ${C.border}`,
            borderRadius: 18,
            padding:      20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: 1.5, color: C.text }}>
                {user?.nickname || "Guest Challenger"}
              </h3>
              <span style={{
                fontSize:    10,
                fontWeight:  800,
                color:       currentTier.color,
                background:  `${currentTier.color}15`,
                border:      `1px solid ${currentTier.color}35`,
                padding:     "2px 8px",
                borderRadius:99,
                fontFamily:  "'Space Mono', monospace",
              }}>
                {currentTier.label}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.muted }}>
              <div>Total Standing Career XP: <strong style={{ color: C.gold }}>{user?.totalXP || 0} XP</strong></div>
              <div>Represented Nation: <strong style={{ color: C.text }}>{kit.flag} {countryCode}</strong></div>
            </div>
          </div>

          {/* Achievements */}
          <div style={{
            background:   "rgba(255,255,255,0.025)",
            border:       `1px solid ${C.border}`,
            borderRadius: 18,
            padding:      20,
          }}>
            <div style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      10,
              color:         C.gold,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom:  16,
            }}>
              🏆 Trophies & Milestones
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {achievements.map((ach, idx) => (
                <div key={idx} style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         12,
                  padding:     "10px 14px",
                  background:  ach.unlocked ? "rgba(61,214,140,0.04)" : "rgba(255,255,255,0.01)",
                  border:      `1px solid ${ach.unlocked ? "rgba(61,214,140,0.15)" : C.border}`,
                  borderRadius:12,
                  opacity:     ach.unlocked ? 1 : 0.4,
                }}>
                  <span style={{ fontSize: 22 }}>{ach.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ach.unlocked ? C.green : C.text }}>{ach.title}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ach.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: ach.unlocked ? C.green : C.muted }}>
                    {ach.unlocked ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <BottomNav active="profile" navigate={navigate} onUnavailable={() => alert("Coming soon — stay tuned")} />
    </div>
  );
}

function BottomNav({ active, navigate, onUnavailable }) {
  const [pressed, setPressed] = useState(null);

  const icons = {
    Ball: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
        <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={color} opacity="0.7"/>
        <path d="M2 12h4l2 3-2 3H2" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
        <path d="M22 12h-4l-2 3 2 3h4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
        <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill={color} opacity="0.6"/>
        <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill={color} opacity="0.6"/>
        <path d="M8 19l1-4 3-1 3 1 1 4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
      </svg>
    ),
    Shield: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Swords: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    Rank: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 20h18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 20V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <path d="M12 20V4" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M17 20V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
      </svg>
    ),
    Person: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
        <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };

  const items = [
    { id: "home",    label: "Games",  IconC: icons.Ball,   route: "/",        color: "#F7C344", glow: "rgba(247,195,68,0.8)",   bgGlow: "rgba(247,195,68,0.1)",   bgRadial: "rgba(247,195,68,0.2)"   },
    { id: "guild",   label: "Guild",  IconC: icons.Shield, route: "/guild",   color: "#3DD68C", glow: "rgba(61,214,140,0.8)",   bgGlow: "rgba(61,214,140,0.1)",   bgRadial: "rgba(61,214,140,0.2)"   },
    { id: "raids",   label: "Raids",  IconC: icons.Swords, route: "/raid",    color: "#3b82f6", glow: "rgba(59,130,246,0.8)",   bgGlow: "rgba(59,130,246,0.1)",   bgRadial: "rgba(59,130,246,0.2)"   },
    { id: "ranks",   label: "Ranks",  IconC: icons.Rank,   route: "/ranks",   color: "#E84040", glow: "rgba(232,64,64,0.8)",    bgGlow: "rgba(232,64,64,0.1)",    bgRadial: "rgba(232,64,64,0.2)"    },
    { id: "profile", label: "Me",     IconC: icons.Person, route: "/profile", color: "#F7C344", glow: "rgba(247,195,68,0.8)",   bgGlow: "rgba(247,195,68,0.1)",   bgRadial: "rgba(247,195,68,0.2)"   },
  ];

  return (
    <nav style={{
      position:       "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      display:        "flex",
      background:     "rgba(5,8,15,0.97)",
      backdropFilter: "blur(32px) saturate(1.5)",
      borderTop:      `1px solid rgba(255,255,255,0.07)`,
      paddingBottom:  "env(safe-area-inset-bottom,0px)",
      boxShadow:      "0 -1px 0 rgba(255,255,255,0.04),0 -12px 40px rgba(0,0,0,0.7)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(247,195,68,0.15),rgba(247,195,68,0.3) 50%,rgba(247,195,68,0.15),transparent)" }} />
      {items.map(item => {
        const isActive  = item.id === active;
        const isPressed = pressed === item.id;
        const NavIcon   = item.IconC;
        const col       = isActive ? item.color : isPressed ? "rgba(242,242,244,0.6)" : "rgba(242,242,244,0.27)";
        return (
          <button key={item.id} type="button"
            onMouseDown={() => setPressed(item.id)}
            onMouseUp={() => setPressed(null)}
            onMouseLeave={() => setPressed(null)}
            onTouchStart={() => setPressed(item.id)}
            onTouchEnd={() => setPressed(null)}
            onClick={() => item.route ? navigate(item.route) : onUnavailable()}
            style={{
              flex: 1, minWidth: 0, border: "none", background: "transparent",
              padding: "10px 4px 8px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              cursor: "pointer",
              fontFamily: "'Space Mono',monospace", fontSize: "0.45rem", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
              color: col,
              position: "relative", transition: "color 0.15s",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              transform: isPressed ? "scale(0.88)" : "scale(1)",
            }}
          >
            {isActive && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, borderRadius: "0 0 4px 4px", background: item.color, boxShadow: `0 0 12px ${item.glow}` }} />}
            {isActive && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 25%,${item.bgRadial},transparent 70%)`, pointerEvents: "none" }} />}
            <div style={{
              position: "relative", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8,
              background: isActive ? item.bgGlow : "transparent",
              border: isActive ? `1px solid ${item.color}33` : "1px solid transparent",
              transition: "all 0.18s",
            }}>
              <NavIcon color={col} />
            </div>
            <span style={{ letterSpacing: 0.4, fontSize: "0.55rem" }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}