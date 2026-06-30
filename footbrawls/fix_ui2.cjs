const fs = require('fs');
const games = ['whoareya.jsx', 'wordle.jsx'];

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
  const navTagRegexes = [
    /<div className="wya-nav-tag">[\s\S]*?<\/div>/,
    /<div className="wdl-nav-tag">[\s\S]*?<\/div>/
  ];

  for (let r of navTagRegexes) {
    if (t.match(r)) {
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

  fs.writeFileSync(p, t);
});
console.log('Fixed whoareya and wordle!');
