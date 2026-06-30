const fs = require('fs');
let v = fs.readFileSync('./src/pages/games/whoareya.jsx', 'utf8');

// Update HintPill definition
v = v.replace(
  /function HintPill\(\{ icon, label, value, revealed, onClick, loading, isRaid \}\) \{/,
  'function HintPill({ icon, label, value, revealed, onClick, loading, isRaid, isVsFriends }) {'
);

// Update HintPill usages
v = v.replace(
  /isRaid=\{isRaid\}/g,
  'isRaid={isRaid} isVsFriends={isVsFriends}'
);

fs.writeFileSync('./src/pages/games/whoareya.jsx', v);
console.log('Fixed whoareya HintPill crash');
