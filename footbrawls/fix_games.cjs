const fs = require('fs');
const files = [
  'whoareya.jsx', 'wordle.jsx', 'higherlower.jsx', 'transfertrail.jsx', 
  'top10.jsx', 'dailytrivia.jsx', 'dribble.jsx', 'penaltynerve.jsx'
];
files.forEach(f => {
  const p = './src/pages/games/' + f;
  let text = fs.readFileSync(p, 'utf8');
  
  const searchRegex = /const uid = getUser\(\)\?\.userId; let userActCount = 0; while \(sessionData\?\.scores\?\.\[uid\]\?\.\[.+?\] !== undefined\) \{ userActCount\+\+; \} const nextGame = sessionData\?\.gamesList\?\.\[userActCount \+ 1\];/g;
  
  const replacementFinal = `const uid = getUser()?.userId;
          let userActCount = 0;
          while (sessionData?.scores?.[uid]?.["act" + (userActCount + 1)] !== undefined) { userActCount++; }
          const nextGame = sessionData?.gamesList?.[userActCount + 1];`;

  text = text.replace(searchRegex, replacementFinal);
  fs.writeFileSync(p, text);
});
console.log('Fixed!');
