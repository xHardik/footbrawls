const fs = require('fs');
const games = [
  'whoareya.jsx', 'wordle.jsx', 'higherlower.jsx', 'transfertrail.jsx', 
  'top10.jsx', 'dailytrivia.jsx', 'dribble.jsx', 'penaltynerve.jsx'
];

games.forEach(f => {
  const p = './src/pages/games/' + f;
  let t = fs.readFileSync(p, 'utf8');

  t = t.replace(/let sessionData = null;/, "let sessionData = null; let nextActVal = null;");
  
  t = t.replace(/sessionData = res\?\.session;/g, "sessionData = res?.session; nextActVal = res?.nextAct;");
  t = t.replace(/sessionData = r\?\.session;/g, "sessionData = r?.session; nextActVal = r?.nextAct;");

  // Regex to match the uid and while loop calculation
  const regex = /const uid = getUser\(\)\?\.userId;[\s\S]*?const nextGame = sessionData\?\.gamesList\?\.\[userActCount(?:\s*\+\s*1)?\];?([^\n]*)/;
  
  t = t.replace(regex, "const nextGame = sessionData?.gamesList?.[nextActVal - 1];");

  fs.writeFileSync(p, t);
});
console.log('Fixed progression in all 8 games!');
