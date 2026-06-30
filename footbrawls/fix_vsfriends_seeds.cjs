const fs = require('fs');

// whoareya.jsx
let p = './src/pages/games/whoareya.jsx';
let t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);[\s\S]*?player = getDailyPlayer\(PLAYERS, 'whoAreYa', puzzleDate\);\n    \}/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
    const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
    let player;
    if (isRaidSession || isVsFriendsSession) {
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const salt = isVsFriendsSession ? 101 : 997;
      const idx = (seedVal + salt) % PLAYERS.length;
      player = PLAYERS[idx];
    } else {
      player = getDailyPlayer(PLAYERS, 'whoAreYa', puzzleDate);
    }`
);
t = t.replace(/setIsRaid\(raid\);/, "setIsRaid(isRaidSession);\n    setIsVsFriends(isVsFriendsSession);");
t = t.replace(/if \(raid\) \{/, "if (isRaidSession || isVsFriendsSession) {");
fs.writeFileSync(p, t);


// wordle.jsx
p = './src/pages/games/wordle.jsx';
t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);[\s\S]*?return getDailyPlayer\(players, "wordle", puzzleDate\);/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    if (isRaidSession || isVsFriendsSession) {
      const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
      const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const salt = isVsFriendsSession ? 202 : 37;
      return players[(seedVal + salt) % players.length];
    }
    return getDailyPlayer(players, "wordle", puzzleDate);`
);
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);[\s\S]*?if \(raid\) \{/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync(p, t);


// transfertrail.jsx
p = './src/pages/games/transfertrail.jsx';
t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /const puzzlePlayers = useMemo\(\(\) => getDailyPlayers\(players, puzzleDate\), \[players, puzzleDate\]\);/,
  `const puzzlePlayers = useMemo(() => {
    let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    if (isRaidSession || isVsFriendsSession) {
      const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
      const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const salt = isVsFriendsSession ? 303 : 99;
      const arr = [];
      for(let i=0; i<3; i++) {
        arr.push(players[(seedVal + salt + i*7) % players.length]);
      }
      return arr;
    }
    return getDailyPlayers(players, puzzleDate);
  }, [players, puzzleDate]);`
);
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);[\s\S]*?if \(raid\) \{/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync(p, t);


// top10.jsx
p = './src/pages/games/top10.jsx';
t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /const target = useMemo\(\(\) => \{[\s\S]*?return Object\.values\(getDailyTop10\(\)\)\[0\];\n  \}, \[puzzleDate\]\);/,
  `const target = useMemo(() => {
    let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    if (isRaidSession || isVsFriendsSession) {
      const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
      const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const salt = isVsFriendsSession ? 404 : 11;
      const all = Object.values(TOP10_DATA);
      return all[(seedVal + salt) % all.length];
    }
    let raid = !!localStorage.getItem('active_game_session_id');
    if (raid) {
      const sessionId = localStorage.getItem('active_game_session_id');
      const sessionSeed = localStorage.getItem('active_game_session_seed');
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const all = Object.values(TOP10_DATA);
      return all[(seedVal + 11) % all.length];
    }
    return Object.values(getDailyTop10())[0];
  }, [puzzleDate]);`
);
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);[\s\S]*?if \(raid\) \{/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync(p, t);


// dailytrivia.jsx
p = './src/pages/games/dailytrivia.jsx';
t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /const puzzleQuestions = useMemo\(\(\) => \{[\s\S]*?return getDailyTrivia\(\);\n  \}, \[puzzleDate\]\);/,
  `const puzzleQuestions = useMemo(() => {
    let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    if (isRaidSession || isVsFriendsSession) {
      const sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
      const sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const salt = isVsFriendsSession ? 505 : 22;
      const all = Object.values(TRIVIA_QUESTIONS);
      const arr = [];
      for(let i=0; i<3; i++) {
        arr.push(all[(seedVal + salt + i*13) % all.length]);
      }
      return arr;
    }
    let raid = !!localStorage.getItem('active_game_session_id');
    if (raid) {
      const sessionId = localStorage.getItem('active_game_session_id');
      const sessionSeed = localStorage.getItem('active_game_session_seed');
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const all = Object.values(TRIVIA_QUESTIONS);
      const q = [];
      for (let i = 0; i < 3; i++) {
        q.push(all[(seedVal + 22 + i * 13) % all.length]);
      }
      return q;
    }
    return getDailyTrivia();
  }, [puzzleDate]);`
);
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);[\s\S]*?if \(raid\) \{/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
fs.writeFileSync(p, t);


// higherlower.jsx
p = './src/pages/games/higherlower.jsx';
t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /let raid = !!localStorage\.getItem\('active_game_session_id'\);\n    setIsRaid\(raid\);[\s\S]*?if \(raid\) \{/,
  `let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {`
);
t = t.replace(
  /const rawA = getSequencedPlayer\(players, round\);[\s\S]*?return \{ playerA: rawA, playerB: rawB \};/,
  `
    let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    let sessionId = isRaidSession ? localStorage.getItem('active_game_session_id') : localStorage.getItem('active_vs_friends_session_id');
    let sessionSeed = isRaidSession ? localStorage.getItem('active_game_session_seed') : localStorage.getItem('active_vs_friends_session_seed');
    
    let rawA, rawB;
    if (isRaidSession || isVsFriendsSession) {
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const salt = isVsFriendsSession ? 606 : 0;
      const all = Object.values(players);
      rawA = all[(seedVal + salt + round) % all.length];
      rawB = all[(seedVal + salt + round + 1) % all.length];
    } else {
      rawA = getSequencedPlayer(players, round);
      rawB = getSequencedPlayer(players, round + 1);
    }
    return { playerA: rawA, playerB: rawB };`
);
fs.writeFileSync(p, t);

console.log('Fixed seeds in 6 games!');
