const fs = require('fs');

let p = './src/pages/games/wordle.jsx';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);\n\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);

content = content.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);\r\n\r\n    if \(raid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);


fs.writeFileSync(p, content);

console.log('Fixed wordle init');
