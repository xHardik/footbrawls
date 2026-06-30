const fs = require('fs');

let p = './src/pages/games/wordle.jsx';
let content = fs.readFileSync(p, 'utf8');

// disable_hints.cjs changes
content = content.replace(/!isRaid/g, '!(isRaid || isVsFriends)');
content = content.replace(/!\(!\(isRaid \|\| isVsFriends\) \|\| isVsFriends\)/g, '!(isRaid || isVsFriends)');
content = content.replace(/isRaid=\{isRaid\}/g, 'isRaid={isRaid || isVsFriends}');

// fix_awardxp.cjs changes
content = content.replace(/\(isWin \|\| isRaid\)/g, '(isWin || isRaid || isVsFriends)');
content = content.replace(/\(won \|\| isRaid\)/g, '(won || isRaid || isVsFriends)');
content = content.replace(/\(raw > 0 \|\| isRaid\)/g, '(raw > 0 || isRaid || isVsFriends)');
content = content.replace(/\(finalXP > 0 \|\| isRaid\)/g, '(finalXP > 0 || isRaid || isVsFriends)');
content = content.replace(/\(rawXP > 0 \|\| isRaid\)/g, '(rawXP > 0 || isRaid || isVsFriends)');

// fix_wordle_init.cjs changes
// First, replace the targetuseMemo
content = content.replace(
  /const raid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n    const sessionId = localStorage\.getItem\('active_game_session_id'\);\r?\n    const sessionSeed = localStorage\.getItem\('active_game_session_seed'\);\r?\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
    const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
    if (isRaidSession || isVsFriendsSession) {`
);

// Then replace the useEffect load saved state
content = content.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n    setIsRaid\(raid\);\r?\n\r?\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);

fs.writeFileSync(p, content);

console.log('Fixed wordle.jsx completely');
