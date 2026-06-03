import { awardXP } from './xpEngine';
import { getUser } from './user';
import { RAID_TYPES } from './raidConstants';

/**
 * Award raid XP locally via xpEngine, then persist guild effects server-side.
 * Training mode skips all XP.
 */
export async function finalizeRaid({
  raidType,
  outcome,
  isMvp,
  acts,
  match,
  rivalGuildCode,
  playerPerformance,
}) {
  const user = getUser();
  if (!user?.userId) throw new Error('No user found');

  const isTraining = raidType === 'training';
  const xpResults  = { win: null, mvp: null, cappedOut: false };

  if (!isTraining) {
    let winSource = null;
    if (outcome === 'win') {
      winSource = raidType === 'challenge' ? 'raid_win_challenge' : 'raid_win_normal';
    } else if (outcome === 'loss') {
      winSource = 'raid_loss';
    } else {
      winSource = 'raid_loss';
    }

    if (winSource) {
      const res = await awardXP(user.userId, winSource);
      xpResults.win = res;
      xpResults.cappedOut = res?.cappedOut ?? false;
    }

    if (isMvp) {
      const mvpRes = await awardXP(user.userId, 'raid_mvp');
      xpResults.mvp = mvpRes;
    }
  }

  const payload = {
    raidType,
    outcome,
    isTraining,
    userId:           user.userId,
    nickname:         user.nickname,
    homeCountry:      user.homeCountry,
    rivalGuildCode:   rivalGuildCode || match?.rivals?.[0]?.homeCountry,
    acts,
    match: {
      isBotMatch: match?.isBotMatch ?? true,
      buddy:      match?.buddy ?? null,
      rivals:     match?.rivals ?? [],
    },
    playerPerformance,
    xpAwarded: isTraining ? 0 : (xpResults.win?.xpAwarded ?? 0) + (xpResults.mvp?.xpAwarded ?? 0),
  };

  let serverResult = null;
  try {
    const res = await fetch('/api/raid/finalize', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (res.ok) {
      serverResult = await res.json();
    } else {
      console.warn('[raidFinalize] Server finalize failed:', res.status);
    }
  } catch (err) {
    console.warn('[raidFinalize] API unreachable:', err.message);
  }

  return { xpResults, serverResult, payload };
}

export function getRaidXpPreview(raidType, outcome) {
  const config = RAID_TYPES[raidType];
  if (!config || raidType === 'training') return { win: 0, loss: 0, mvp: 0 };
  return {
    win:  outcome === 'win'  ? config.winXP : 0,
    loss: outcome !== 'win' ? config.lossXP : 0,
    mvp:  50,
  };
}
