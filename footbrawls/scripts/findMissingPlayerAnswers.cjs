// scripts/findMissingPlayerAnswers.cjs
const fs = require('fs');
const path = require('path');

async function findMissing() {
  const questionsPath = path.join(__dirname, '..', 'src', 'lib', 'questions.js');
  const playersPath = path.join(__dirname, '..', 'src', 'lib', 'players.js');

  const questionsContent = fs.readFileSync(questionsPath, 'utf8');
  const playersContent = fs.readFileSync(playersPath, 'utf8');

  // Strip exports to eval
  const cleanQuestions = questionsContent
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+default\s+/g, '');
  const cleanPlayers = playersContent
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+default\s+/g, '');

  let PLAYERS_LIST = [];
  let TRIVIA_QUESTIONS = [];
  let RAPID_FIRE_QUESTIONS = [];
  let TOP10_QUESTIONS = [];

  try {
    const playersCode = cleanPlayers + '\nmodule.exports = { PLAYERS };';
    const playersModule = { exports: {} };
    const runPlayers = new Function('module', 'exports', playersCode);
    runPlayers(playersModule, playersModule.exports);
    PLAYERS_LIST = playersModule.exports.PLAYERS || [];
  } catch (e) {
    console.error('Failed to parse players.js:', e);
    return;
  }

  try {
    const questionsCode = cleanQuestions + '\nmodule.exports = { TRIVIA_QUESTIONS, RAPID_FIRE_QUESTIONS, TOP10_QUESTIONS };';
    const questionsModule = { exports: {} };
    const runQuestions = new Function('module', 'exports', questionsCode);
    runQuestions(questionsModule, questionsModule.exports);
    TRIVIA_QUESTIONS = questionsModule.exports.TRIVIA_QUESTIONS || [];
    RAPID_FIRE_QUESTIONS = questionsModule.exports.RAPID_FIRE_QUESTIONS || [];
    TOP10_QUESTIONS = questionsModule.exports.TOP10_QUESTIONS || [];
  } catch (e) {
    console.error('Failed to parse questions.js:', e);
    return;
  }

  function normalizeName(name) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const registeredPlayerNames = new Set(PLAYERS_LIST.map(p => normalizeName(p.name)));
  
  // Custom manual list of common football player names that we want to look for in questions
  // to avoid matching options that represent years, scorelines, stats, positions, or clubs.
  const suspectedPlayerAnswers = new Set();

  // Helper to add suspected player names
  function inspectAndAdd(option) {
    const norm = normalizeName(option);
    // Ignore options representing years, positions, teams, stats, rules, numbers
    if (
      !/^\d+$/.test(norm) &&
      !norm.includes('goal') &&
      !norm.includes('card') &&
      !norm.includes('minute') &&
      !norm.includes('seconds') &&
      !norm.includes('title') &&
      !norm.includes('match') &&
      !norm.includes('trophy') &&
      !norm.includes('season') &&
      !norm.includes('confederation') &&
      !norm.includes('caps') &&
      !norm.includes('appearances') &&
      !norm.includes('stadium') &&
      !norm.includes('euro') &&
      !norm.includes('world cup') &&
      !norm.includes('midfielder') &&
      !norm.includes('defender') &&
      !norm.includes('goalkeeper') &&
      !norm.includes('forward') &&
      !norm.includes('winger') &&
      !norm.includes('striker') &&
      !norm.includes('playmaker') &&
      !norm.includes('sweep') &&
      !norm.includes('press') &&
      !norm.includes('tiki') &&
      !norm.includes('park') &&
      !norm.includes('catenaccio') &&
      !norm.includes('line') &&
      !norm.includes('zone') &&
      !norm.includes('club') &&
      !norm.includes('flank') &&
      !norm.includes('football') &&
      !norm.includes('referee') &&
      // Skip known countries
      !['germany', 'italy', 'brazil', 'argentina', 'england', 'france', 'spain', 'morocco', 'uruguay', 'chile', 'netherlands', 'portugal', 'china', 'sweden', 'norway', 'georgia', 'armenia', 'ukraine', 'azerbaijan', 'algeria', 'tunisia', 'senegal', 'egypt', 'russia', 'usa', 'united states', 'soviet union', 'ussr', 'czechoslovakia', 'denmark', 'greece', 'belgium', 'saudi arabia', 'south korea', 'japan', 'australia'].includes(norm) &&
      // Skip known clubs
      !['barcelona', 'real madrid', 'juventus', 'ac milan', 'tottenham', 'manchester united', 'arsenal', 'chelsea', 'liverpool', 'inter milan', 'bayern munich', 'psg', 'paris saint-germain', 'manchester city', 'man city', 'aston villa', 'newcastle', 'everton', 'leicester', 'ajax', 'benfica', 'porto', 'sporting cp', 'lille', 'marseille', 'lyon', 'galatasaray', 'fenerbahce', 'al hilal', 'al nassr', 'bayer leverkusen', 'borussia dortmund', 'rb leipzig', 'freiburg', 'udinese', 'roma', 'fiorentina', 'napoli', 'brentford', 'atletico madrid', 'monaco', 'valencia', 'sevilla', 'girona', 'las palmas', 'villarreal', 'bologna', 'atalanta', 'real sociedad'].includes(norm)
    ) {
      suspectedPlayerAnswers.add(option);
    }
  }

  // 1. Check TRIVIA_QUESTIONS answers
  TRIVIA_QUESTIONS.forEach(q => {
    const correctOpt = q.opts[q.ans];
    if (correctOpt) {
      inspectAndAdd(correctOpt);
    }
  });

  // 2. Check RAPID_FIRE_QUESTIONS answers
  RAPID_FIRE_QUESTIONS.forEach(q => {
    const correctOpt = q.opts[q.ans];
    if (correctOpt) {
      inspectAndAdd(correctOpt);
    }
  });

  // 3. Check TOP10_QUESTIONS answers
  TOP10_QUESTIONS.forEach(q => {
    q.answers.forEach(ans => {
      // Top 10 lists can be players (e.g. Alan Shearer) or teams/transfers
      // Let's inspect the names
      inspectAndAdd(ans.name);
    });
  });

  const missingPlayers = [];
  suspectedPlayerAnswers.forEach(name => {
    const norm = normalizeName(name);
    // Strip parenthetical notes like "Ronaldo (Brazil)" or "Neymar (Barcelona to PSG)" to get the raw name
    const rawName = name.split('(')[0].trim();
    const normRaw = normalizeName(rawName);

    if (!registeredPlayerNames.has(norm) && !registeredPlayerNames.has(normRaw)) {
      missingPlayers.push(name);
    }
  });

  console.log(`\nHere are all the players who are answers in questions.js but are NOT in players.js:\n`);
  missingPlayers.sort().forEach(p => {
    console.log(`- ${p}`);
  });
}

findMissing().catch(console.error);
