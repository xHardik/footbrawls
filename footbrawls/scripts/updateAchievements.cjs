const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// 1. Extract icons object from BottomNav
const iconsMatch = code.match(/const icons = \{[\s\S]*?\n  \};\n/);
if (iconsMatch) {
  let iconsStr = iconsMatch[0];
  code = code.replace(iconsStr, ''); // remove from BottomNav
  
  // Add some extra icons to the icons string
  const extraIcons = `
    Fire: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8 6 6 9 6 13C6 17 9 21 12 21C15 21 18 17 18 13C18 9 16 6 12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 11C12 11 13 13 13 15C13 17 12 18 12 18C12 18 10.5 17 10.5 14C10.5 11 12 11 12 11Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Target: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="1.5" fill={color}/>
      </svg>
    ),
    Brain: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 5C7 5 5 7 5 9C5 11 6.5 12.5 8 13.5V17C8 18 9 19 10.5 19H13.5C15 19 16 18 16 17V13.5C17.5 12.5 19 11 19 9C19 7 17 5 15 5C14.5 5 14 5.2 13.5 5.5C13 4.5 12 4 12 4C12 4 11 4.5 10.5 5.5C10 5.2 9.5 5 9 5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Crown: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 19L5 8L9 11L12 5L15 11L19 8L20 19H4Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  `;
  iconsStr = iconsStr.replace('  };\n', extraIcons + '  };\n');

  // Insert above export default function Profile
  code = code.replace('export default function Profile() {', iconsStr + '\nexport default function Profile() {');
}

// 2. Revert achievements array to the old list (without the 3 new ones) and use IconC instead of icon
const oldAchievements = `  const achievements = [
    { title: "Striker Hero",  desc: "Gain 200+ XP in a single day",           unlocked: true,  IconC: icons.Fire },
    { title: "Castle Raider", desc: "Win a Castle Raid with a teammate",       unlocked: true,  IconC: icons.Shield },
    { title: "Hot Predictor", desc: "Reach a 3.0x hot streak multiplier",      unlocked: true,  IconC: icons.Target },
    { title: "Trivia Master", desc: "Answer 5 consecutive trivia correctly",   unlocked: false, IconC: icons.Brain },
    { title: "Consul MVP",    desc: "Gain Raid MVP points bonus",              unlocked: false, IconC: icons.Crown },
  ];`;

code = code.replace(/const achievements = \[[\s\S]*?\];/, oldAchievements);

// 3. Update achievement rendering
const oldRender = '<span style={{ fontSize: 22 }}>{ach.icon}</span>';
const newRender = '<span><ach.IconC size={24} color={ach.unlocked ? C.green : C.muted} /></span>';
code = code.replace(oldRender, newRender);

fs.writeFileSync('src/pages/Profile.jsx', code);
