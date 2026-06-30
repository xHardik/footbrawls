const fs = require('fs');

let dt = fs.readFileSync('./src/pages/games/dailytrivia.jsx', 'utf8');

dt = dt.replace(
  /function persist\(date, data\) \{/g,
  `function persist(date, data) {
  if (!!localStorage.getItem('active_game_session_id') || !!localStorage.getItem('active_vs_friends_session_id')) return;`
);

dt = dt.replace(
  /function saveStats\(score, correct, date\) \{/g,
  `function saveStats(score, correct, date) {
  if (!!localStorage.getItem('active_game_session_id') || !!localStorage.getItem('active_vs_friends_session_id')) return { stats: loadStats(), history: loadHistory() };`
);

fs.writeFileSync('./src/pages/games/dailytrivia.jsx', dt);
console.log('Fixed dailytrivia persist');
