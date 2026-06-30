const fs = require('fs');

let t;

// wordle.jsx
t = fs.readFileSync('./src/pages/games/wordle.jsx', 'utf8');
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);\n\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync('./src/pages/games/wordle.jsx', t);

// top10.jsx
t = fs.readFileSync('./src/pages/games/top10.jsx', 'utf8');
t = t.replace(
  /let isRaid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(isRaid\);\n\n    if \(isRaid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync('./src/pages/games/top10.jsx', t);

// dailytrivia.jsx
t = fs.readFileSync('./src/pages/games/dailytrivia.jsx', 'utf8');
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);\n\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync('./src/pages/games/dailytrivia.jsx', t);

// transfertrail.jsx
t = fs.readFileSync('./src/pages/games/transfertrail.jsx', 'utf8');
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);\n\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync('./src/pages/games/transfertrail.jsx', t);

console.log('Fixed initialization logic in games!');
