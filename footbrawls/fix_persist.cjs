const fs = require('fs');

let t = fs.readFileSync('./src/pages/games/higherlower.jsx', 'utf8');
t = t.replace(
  /function persist\(updates\) \{\n    const puzzleDate = getActivePuzzleDate\(\);/,
  `function persist(updates) {
    if (isRaid || isVsFriends) return;
    const puzzleDate = getActivePuzzleDate();`
);
fs.writeFileSync('./src/pages/games/higherlower.jsx', t);

t = fs.readFileSync('./src/pages/games/penaltynerve.jsx', 'utf8');
t = t.replace(
  /function saveResult\(today, goals, xp\) \{\n  const history = loadHistory\(\);/,
  `function saveResult(today, goals, xp) {
  if (typeof window !== 'undefined' && (localStorage.getItem('active_game_session_id') || localStorage.getItem('active_vs_friends_session_id'))) return { stats: {}, history: {} };
  const history = loadHistory();`
);
fs.writeFileSync('./src/pages/games/penaltynerve.jsx', t);

console.log('Fixed persist unconditionally saving in higherlower and penaltynerve!');
