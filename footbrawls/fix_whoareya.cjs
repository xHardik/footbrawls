const fs = require('fs');

let p = './src/pages/games/whoareya.jsx';
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

// fix_init2.cjs changes (initialization block)
content = content.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    const sessionId = localStorage\.getItem\('active_game_session_id'\);\n    const sessionSeed = localStorage\.getItem\('active_game_session_seed'\);\n    let player;\n    if \(isRaidSession \|\| isVsFriendsSession\) \{/g,
  `let raid = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    const sessionId = raid ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
    const sessionSeed = raid ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
    let player;
    if (raid || isVsFriendsSession) {`
);

content = content.replace(
  /setIsRaid\(isRaidSession\);\n    setIsVsFriends\(isVsFriendsSession\);\n\n    if \(isRaidSession \|\| isVsFriendsSession\) \{/g,
  `setIsRaid(raid);
    setIsVsFriends(isVsFriendsSession);

    if (raid || isVsFriendsSession) {`
);


fs.writeFileSync(p, content);

console.log('Fixed whoareya.jsx completely');
