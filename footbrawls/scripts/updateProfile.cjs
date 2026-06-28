const fs = require('fs');

let content = fs.readFileSync('src/pages/Profile.jsx', 'utf-8');

// 1. Replace PlayerMannequin3D with PlayerCard
const mannequinStart = content.indexOf('function PlayerMannequin3D({ kit }) {');
const mannequinEndRegex = /<div style={{\s*marginTop:\s*10,\s*fontSize:\s*11,\s*color:\s*C.muted,\s*letterSpacing:\s*0\.5,\s*fontFamily:\s*"'Space Mono', monospace",\s*}}>.*?Drag to rotate.*?<\/div>\s*<\/div>\s*\);\s*}/s;

const mannequinEndMatch = mannequinEndRegex.exec(content);

if (mannequinStart !== -1 && mannequinEndMatch) {
  const mannequinEndIndex = mannequinEndMatch.index + mannequinEndMatch[0].length;
  
  const playerCardCode = `
/* ─────────────────────────────────────────────────────────────
   HOLOGRAPHIC PLAYER CARD
───────────────────────────────────────────────────────────── */
function PlayerCard({ kit, user, tier }) {
  const cardRef = useRef(null);
  
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    cardRef.current.style.transform = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) scale3d(1.02, 1.02, 1.02)\`;
  };
  
  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = \`perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)\`;
  };

  const ovr = Math.floor((user?.totalXP || 0) / 100) + 50;
  
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: 260,
        height: 380,
        borderRadius: 20,
        background: \`linear-gradient(135deg, \${kit.shirtDark} 0%, \${kit.shirt} 100%)\`,
        border: \`2px solid \${kit.shirtDark}\`,
        boxShadow: \`0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.2)\`,
        transition: 'transform 0.15s ease-out',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 20,
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.3) 0%, transparent 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.1) 100%)', pointerEvents: 'none' }} />
      <div style={{ fontSize: 48, marginBottom: 12, marginTop: 10 }}>{kit.flag}</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {user?.nickname || "GUEST"}
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: '#fff', opacity: 0.9, marginBottom: 24 }}>
        {kit.name} KIT
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '12px 24px', width: '100%', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Space Mono', monospace" }}>OVR</div>
          <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", color: tier.color }}>{ovr > 99 ? 99 : ovr}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Space Mono', monospace" }}>POS</div>
          <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", color: '#fff' }}>ST</div>
        </div>
      </div>
    </div>
  );
}`;
  
  content = content.substring(0, mannequinStart) + playerCardCode + content.substring(mannequinEndIndex);
}

// 2. Change background to locker room
const mainDivRegex = /return \(\s*<div style={{\s*fontFamily:\s*"'Syne', sans-serif",\s*background:\s*C\.bg,/s;
content = content.replace(mainDivRegex, `return (
    <div style={{
      fontFamily:   "'Syne', sans-serif",
      backgroundImage: "url(/locker_room_bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",`);
      
// Add an overlay inside the main div
content = content.replace(/boxSizing:\s*"border-box",\s*position:\s*"relative",\s*}}>/s, 
  `boxSizing:    "border-box",
      position:     "relative",
    }}>
      {/* Dark overlay for locker room background */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(5, 8, 15, 0.82)", zIndex: 0 }} />
      
      <div style={{ position: "relative", zIndex: 1 }}>`);

// Don't forget to close the overlay wrapper before the nav
content = content.replace(/<nav style={{/g, `</div>\n\n      <nav style={{`);

// 3. Update the left column render to use PlayerCard
content = content.replace(/<PlayerMannequin3D kit={kit} \/>/g, `<PlayerCard kit={kit} user={user} tier={currentTier} />`);

// 4. Update the "3D Kit Viewer" text
content = content.replace(/3D Kit Viewer/g, `HOLOGRAPHIC PLAYER CARD`);

// 5. Remove the extra flag and kit name below the mannequin since it's now in the card
const extraKitTextRegex = /<div style={{ marginTop: 16 }}>\s*<span style={{ fontSize: 20 }}>{kit\.flag}<\/span>\s*<span style={{ marginLeft: 8.*?{kit\.name} KIT\s*<\/span>\s*<\/div>/s;
content = content.replace(extraKitTextRegex, '');

fs.writeFileSync('src/pages/Profile.jsx', content);
console.log("Profile.jsx updated successfully.");
