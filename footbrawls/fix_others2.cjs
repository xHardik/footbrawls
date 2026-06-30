const fs = require('fs');

function fixFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace the load saved state useEffect initialization for ALL games
  content = content.replace(
    /let raid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n    setIsRaid\(raid\);\r?\n\r?\n    if \(raid\) \{/g,
    `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
  );

  content = content.replace(
    /let isRaid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n    setIsRaid\(isRaid\);\r?\n\r?\n    if \(isRaid\) \{/g,
    `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
  );

  fs.writeFileSync(p, content);
}

fixFile('./src/pages/games/higherlower.jsx');
fixFile('./src/pages/games/transfertrail.jsx');
fixFile('./src/pages/games/top10.jsx');
fixFile('./src/pages/games/dailytrivia.jsx');

console.log('Fixed ALL remaining games!');
