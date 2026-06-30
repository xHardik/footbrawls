const fs = require('fs');
const games = [
  'higherlower.jsx', 'transfertrail.jsx', 'top10.jsx', 
  'dailytrivia.jsx', 'dribble.jsx', 'penaltynerve.jsx'
];

games.forEach(f => {
  const p = './src/pages/games/' + f;
  let t = fs.readFileSync(p, 'utf8');

  // 1. Add isVsFriends state
  t = t.replace(
    /const \[isRaid,\s*setIsRaid\]\s*=\s*useState\(false\);/,
    "const [isRaid, setIsRaid] = useState(false);\n  const [isVsFriends, setIsVsFriends] = useState(false);"
  );

  // 2. Add isVsFriends check in useEffect
  t = t.replace(
    /setIsRaid\(!!localStorage\.getItem\('active_game_session_id'\)\);/g,
    "setIsRaid(!!localStorage.getItem('active_game_session_id'));\n      setIsVsFriends(!!localStorage.getItem('active_vs_friends_session_id'));"
  );

  // 3. Update back button logic
  t = t.replace(
    /\{!isRaid && /g,
    "{!(isRaid || isVsFriends) && "
  );

  // 4. Update the navbar tag logic
  // For each game, find the tag block and replace it
  const navTagRegexes = [
    /<div className="hl-nav-tag">[\s\S]*?<\/div>/,
    /<div className="tt-nav-tag">[\s\S]*?<\/div>/,
    /<div className="t10-nav-tag">[\s\S]*?<\/div>/,
    /<div className="dt-nav-tag">[\s\S]*?<\/div>/,
    /<div className="db-nav-tag">[\s\S]*?<\/div>/,
    /<div className="pn-nav-tag">[\s\S]*?<\/div>/
  ];

  let matched = false;
  for (let r of navTagRegexes) {
    if (t.match(r)) {
      matched = true;
      const original = t.match(r)[0];
      const className = original.match(/className="([^"]+)"/)[1];
      const dotClassName = original.match(/className="([^"]+)"/g)[1].split('"')[1];
      
      const newTag = `{isVsFriends ? (
          <div className="${className}" style={{ background: 'rgba(61,214,140,0.15)', borderColor: '#3DD68C', color: '#3DD68C' }}>
            <span className="${dotClassName}" style={{ background: '#3DD68C', boxShadow: '0 0 8px #3DD68C' }} />
            VS FRIENDS
          </div>
        ) : (
          ${original}
        )}`;
      t = t.replace(r, newTag);
      break;
    }
  }

  // NOTE: dailytrivia did not have the !isRaid check on the back button!
  if (f === 'dailytrivia.jsx') {
    t = t.replace(
      /<button className="dt-nav-logo"/,
      "{!(isRaid || isVsFriends) && <button className=\"dt-nav-logo\""
    );
    t = t.replace(
      /navigate\('\/'\)}><\/button>/,
      "navigate('/')}>←</button>}"
    ); // wait, dt-nav-logo had a ← inside it: <button className="dt-nav-logo" onClick={() => navigate('/')}>←</button>
    
    t = t.replace(
      /<button className="dt-nav-logo" onClick=\{\(\) => navigate\('\/'\)\}>←<\/button>/,
      "{!(isRaid || isVsFriends) && <button className=\"dt-nav-logo\" onClick={() => navigate('/')}>←</button>}"
    );
  }

  fs.writeFileSync(p, t);
});
console.log('Fixed games!');
