const fs = require('fs');

// 1. Fix top10.jsx
let top10 = fs.readFileSync('./src/pages/games/top10.jsx', 'utf8');
top10 = top10.replace(
  /const activeQuestion = useMemo\(\(\) => \{\r?\n    let seed = getDailySeed\(puzzleDate\);\r?\n    const raid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n    const sessionId = localStorage\.getItem\('active_game_session_id'\);\r?\n    const sessionSeed = localStorage\.getItem\('active_game_session_seed'\);\r?\n    if \(raid\) \{/g,
  `const activeQuestion = useMemo(() => {
    let seed = getDailySeed(puzzleDate);
    const isRaidSession = !!localStorage.getItem('active_game_session_id');
    const isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
    const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync('./src/pages/games/top10.jsx', top10);

// 2. Fix dailytrivia.jsx
let dt = fs.readFileSync('./src/pages/games/dailytrivia.jsx', 'utf8');
// We need to inject the seed logic into pickDailyQuestions or just generate it inline.
// Wait, pickDailyQuestions(puzzleDate) uses the date string as seed.
// If it's raid/vsfriends, we can pass the sessionSeed as the string!
dt = dt.replace(
  /  \/\/ ── Load \/ resume ──\r?\n  useEffect\(\(\) => \{\r?\n    const qs   = pickDailyQuestions\(puzzleDate\);/g,
  `  // ── Load / resume ──
  useEffect(() => {
    let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    let seedStr = puzzleDate;
    if (isRaidSession || isVsFriendsSession) {
      seedStr = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
    }
    const qs   = pickDailyQuestions(seedStr);`
);

// We also need to fix the initialized check in dailytrivia.jsx if it exists.
// Right now, dailytrivia checks save?.done
dt = dt.replace(
  /    if \(save\?\.done\) \{/g,
  `    if (isRaidSession || isVsFriendsSession) {
      setPhase('game');
    } else if (save?.done) {`
);

fs.writeFileSync('./src/pages/games/dailytrivia.jsx', dt);

console.log('Fixed top10 and dailytrivia seeding!');
