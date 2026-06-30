const fs = require('fs');
const glob = require('glob');
const path = require('path');

const dir = './src/pages/games';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Replace `!isRaid` with `!(isRaid || isVsFriends)`
  // But be careful not to replace it if it's already `!(isRaid || isVsFriends)`
  // A regex that replaces `!isRaid` if it's not followed by ` || isVsFriends`
  // Actually, let's just do a simple replacement for specific common patterns:
  
  content = content.replace(/!isRaid/g, '!(isRaid || isVsFriends)');
  
  // Also fix double-replaced `!(!(isRaid || isVsFriends) || isVsFriends)` if any
  content = content.replace(/!\(!\(isRaid \|\| isVsFriends\) \|\| isVsFriends\)/g, '!(isRaid || isVsFriends)');

  // For whoareya and transfertrail, replace `isRaid={isRaid}` with `isRaid={isRaid || isVsFriends}`
  content = content.replace(/isRaid=\{isRaid\}/g, 'isRaid={isRaid || isVsFriends}');

  // In wordle and transfertrail, if there's any `!isRaid &&` or similar it gets replaced nicely.

  fs.writeFileSync(p, content);
});

console.log('Disabled hints/ads for VsFriends');
