const fs = require('fs');

function fixFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  
  // First, check if it has the raid init that needs replacement
  content = content.replace(
    /let raid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n    setIsRaid\(raid\);\r?\n\r?\n    if \(raid\) \{/g,
    `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
  );
  
  // Also check top10.jsx which has isRaid instead of raid
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

fixFile('./src/pages/games/transfertrail.jsx');
fixFile('./src/pages/games/top10.jsx');
fixFile('./src/pages/games/dailytrivia.jsx');
// Also check higherlower.jsx just in case
// fixFile('./src/pages/games/higherlower.jsx'); // higherlower doesn't have this init block in the same way

console.log('Fixed other games');
