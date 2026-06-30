const fs = require('fs');

let content = fs.readFileSync('src/pages/VsFriends.jsx', 'utf8');

// 1. Add bot scoring logic inside the component
const botLogic = `
  // --- BOT LOGIC ---
  useEffect(() => {
    if (session && session.isBotMatch && session.hostId === user?.userId && session.status === 'active') {
      let changed = false;
      const updates = {};
      
      for (let i = 1; i <= session.currentAct; i++) {
        const hScore = session.scores?.[session.hostId]?.[\\\`act\${i}\\\`];
        const bScore = session.scores?.[session.guestId]?.[\\\`act\${i}\\\`];
        
        if (hScore && !bScore) {
          const hostPoints = hScore.normalized || hScore.wins || hScore.goals || 0;
          let botPoints = Math.round(hostPoints + Math.floor(Math.random() * 31) - 15);
          botPoints = Math.max(0, Math.min(100, botPoints));
          
          updates[\\\`scores.\${session.guestId}.act\${i}\\\`] = {
            normalized: botPoints,
            display: \\\`\${botPoints} pts (Bot)\\\`
          };
          changed = true;
        }
      }
      
      if (changed) {
        updateDoc(doc(db, 'gameSessions', session.id), updates).catch(console.error);
      }
    }
  }, [session, user]);

  const handlePlayVsBot = async () => {
    if (!session || loading) return;
    setLoading(true);
    try {
      const BOT_NAMES = ["MessiGoat10", "Pessi_L", "Penaldo", "CR7_Siuu", "EngIsBest", "Selecao_Pride", "ViniBaller", "Mbappe_Speed", "HaalandRobot", "Bellingham_99"];
      const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const botId = "bot_" + Math.floor(Math.random() * 99999);
      
      await updateDoc(doc(db, 'gameSessions', session.id), {
        guestId: botId,
        guestName: botName,
        guestFlag: '🤖',
        status: 'active',
        isBotMatch: true
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  // -----------------
`;

if (!content.includes('// --- BOT LOGIC ---')) {
  content = content.replace('  const handleStartGame = () => {', botLogic + '\\n  const handleStartGame = () => {');
}

const botButton = `
              <div style={styles.codeBanner}>
                <div style={styles.codeLabel}>SHARE THIS LOBBY CODE:</div>
                <div style={styles.codeText}>{session.inviteCode}</div>
                <button type="button" onClick={handlePlayVsBot} disabled={loading} style={{...styles.secondaryBtn, width: '100%', marginTop: 12, background: 'rgba(247,195,68,0.1)', borderColor: 'rgba(247,195,68,0.5)', color: '#F7C344'}}>
                  {loading ? '...' : '🤖 Play against AI Bot'}
                </button>
              </div>
`;

if (content.includes('<div style={styles.codeBanner}>')) {
  const oldBannerRegex = /<div style=\{styles\.codeBanner\}>[\s\S]*?<\/div>/;
  content = content.replace(oldBannerRegex, botButton.trim());
}

fs.writeFileSync('src/pages/VsFriends.jsx', content);
console.log('VsFriends.jsx patched successfully.');
