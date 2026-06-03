export const BUDDY_TIMEOUT_MS = 45_000;

export const RAID_TYPES = {
  normal:    { id: 'normal',    label: 'Normal Raid',    winXP: 100, lossXP: 30, castleDamagePct: 0.20 },
  challenge: { id: 'challenge', label: 'Challenge Raid', winXP: 200, lossXP: 30, castleDamagePct: 0.40 },
  training:  { id: 'training',  label: 'Training',       winXP: 0,   lossXP: 0,  castleDamagePct: 0 },
};

export const ACT1_GAME_POOL = [
  { id: 'whoAreYa',       label: 'Who Are Ya?',       icon: '👤' },
  { id: 'wordle',         label: 'Player Wordle',     icon: '🟩' },
  { id: 'higherLower',    label: 'Higher or Lower',   icon: '📊' },
  { id: 'transferTrail',  label: 'Transfer Trail',    icon: '🔗' },
  { id: 'matchPredictor', label: 'Match Predictor',   icon: '🔮' },
  { id: 'penaltyNerve',   label: 'Penalty Nerve',     icon: '⚽' },
];

export const PENALTY_ZONES = [
  { id: 'topLeft',      label: 'TL', row: 0, col: 0 },
  { id: 'topCenter',    label: 'TC', row: 0, col: 1 },
  { id: 'topRight',     label: 'TR', row: 0, col: 2 },
  { id: 'midLeft',      label: 'ML', row: 1, col: 0 },
  { id: 'center',       label: 'C',  row: 1, col: 1 },
  { id: 'midRight',     label: 'MR', row: 1, col: 2 },
  { id: 'bottomLeft',   label: 'BL', row: 2, col: 0 },
  { id: 'bottomCenter', label: 'BC', row: 2, col: 1 },
  { id: 'bottomRight',  label: 'BR', row: 2, col: 2 },
];

export const DRIBBLE_DEFENDERS = [
  { id: 'left',  label: 'Left',  emoji: '⬅️' },
  { id: 'center', label: 'Center', emoji: '⬆️' },
  { id: 'right', label: 'Right', emoji: '➡️' },
];

export const DRIBBLE_SHOT_ZONES = [
  { id: 'topLeft',     label: 'TL', row: 0, col: 0 },
  { id: 'topCenter',   label: 'TC', row: 0, col: 1 },
  { id: 'topRight',    label: 'TR', row: 0, col: 2 },
  { id: 'bottomLeft',  label: 'BL', row: 1, col: 0 },
  { id: 'bottomCenter', label: 'BC', row: 1, col: 1 },
  { id: 'bottomRight', label: 'BR', row: 1, col: 2 },
];

export const CURSE_LIFT_WINS = 3;

export const R = {
  bg:     '#060810',
  purple: '#A855F7',
  accent: '#F7C344',
  green:  '#3DD68C',
  red:    '#E84040',
  text:   '#F2F2F4',
  muted:  'rgba(242,242,244,0.5)',
  border: 'rgba(255,255,255,0.07)',
  surface:'rgba(255,255,255,0.04)',
};
