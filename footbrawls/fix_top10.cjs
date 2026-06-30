const fs = require('fs');

let top10 = fs.readFileSync('./src/pages/games/top10.jsx', 'utf8');

// The tricky block with multiple newlines
top10 = top10.replace(
  /let isRaid = !!localStorage\.getItem\('active_game_session_id'\);\r?\n\r?\n    setIsRaid\(isRaid\);\r?\n\r?\n    if \(isRaid\) \{/g,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession || isVsFriendsSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);

// We need to fix the persist logic to use isRaid || isVsFriends just in case isRaid state is delayed
top10 = top10.replace(
  /if \(isRaid\) return;/g,
  `if (isRaid || isVsFriends) return;`
);

fs.writeFileSync('./src/pages/games/top10.jsx', top10);

console.log('Fixed top10 tricky block');
