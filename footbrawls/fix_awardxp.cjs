const fs = require('fs');
const glob = require('glob');
const path = require('path');

const dir = './src/pages/games';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Fix awardXP condition when loss occurs
  content = content.replace(/\(isWin \|\| isRaid\)/g, '(isWin || isRaid || isVsFriends)');
  content = content.replace(/\(won \|\| isRaid\)/g, '(won || isRaid || isVsFriends)');
  content = content.replace(/\(raw > 0 \|\| isRaid\)/g, '(raw > 0 || isRaid || isVsFriends)');
  content = content.replace(/\(finalXP > 0 \|\| isRaid\)/g, '(finalXP > 0 || isRaid || isVsFriends)');
  content = content.replace(/\(rawXP > 0 \|\| isRaid\)/g, '(rawXP > 0 || isRaid || isVsFriends)');

  fs.writeFileSync(p, content);
});

console.log('Fixed awardXP loss triggers!');
