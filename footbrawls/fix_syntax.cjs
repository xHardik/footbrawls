const fs = require('fs');
let content = fs.readFileSync('src/pages/VsFriends.jsx', 'utf8');

content = content.replace(/\\n  const handleStartGame/g, '\n  const handleStartGame');

// Also fix the backticks that didn't get caught because of the literal \n issue? Wait, no, those were fixed but let's make sure.
content = content.replace(/\\\\[\\]`act\$\{i\}\\\\[\\]`/g, "[`act${i}`]"); // if any left
content = content.replace(/\\`act\$\{i\}\\`/g, "`act${i}`");
content = content.replace(/\\`scores\.\$\{session\.guestId\}\.act\$\{i\}\\`/g, "`scores.${session.guestId}.act${i}`");
content = content.replace(/display: \\`\$\{botPoints\} pts \(Bot\)\\`/g, "display: `${botPoints} pts (Bot)`");

fs.writeFileSync('src/pages/VsFriends.jsx', content);
console.log("Fixed newline");
