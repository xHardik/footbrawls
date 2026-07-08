export const BUDDY_TIMEOUT_MS = 15_000;

export const RAID_TYPES = {
  normal:    { id: 'normal',    label: 'Normal Match',    winXP: 100, lossXP: 30, castleDamagePct: 0.00 },
  challenge: { id: 'challenge', label: 'Castle Siege',    winXP: 300, lossXP: 30, castleDamagePct: 0.03 },
  training:  { id: 'training',  label: 'Practice Match',  winXP: 0,   lossXP: 0,  castleDamagePct: 0 },
};

export const ACT1_GAME_POOL = [
  { id: 'whoAreYa',       label: 'Who Are Ya?',       icon: '👤', route: '/games/whoareya' },
  { id: 'wordle',         label: 'Player Wordle',     icon: '🟩', route: '/games/wordle' },
  { id: 'higherLower',    label: 'Higher or Lower',   icon: '📊', route: '/games/higherlower' },
  { id: 'transferTrail',  label: 'Transfer Trail',    icon: '🔗', route: '/games/transfertrail' },
  { id: 'top10',          label: 'Top 10 Guess',      icon: '🏆', route: '/games/top10' },
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
