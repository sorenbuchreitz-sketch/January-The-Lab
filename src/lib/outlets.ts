export type MediaLean = 'Left' | 'Lean Left' | 'Center' | 'Lean Right' | 'Right';

export interface OutletMetadata {
  lean: MediaLean;
  country?: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const OUTLET_DATABASE: Record<string, MediaLean> = {
  // Center
  reuters: 'Center',
  'bbc news': 'Center',
  bbc: 'Center',
  'associated press': 'Center',
  ap: 'Center',
  'the associated press': 'Center',
  bloomberg: 'Center',
  'financial times': 'Center',
  'the financial times': 'Center',
  'deutsche welle': 'Center',
  'nikkei asia': 'Center',
  'the straits times': 'Center',
  'al jazeera': 'Center',
  nature: 'Center',
  'nature news': 'Center',
  'mit technology review': 'Center',
  'ars technica': 'Center',
  'lloyd\'s list': 'Center',
  'australian financial review': 'Center',
  'the christian science monitor': 'Center',
  afp: 'Center',
  axios: 'Center',
  'the hill': 'Center',

  // Lean Left
  'the new york times': 'Lean Left',
  'the washington post': 'Lean Left',
  cnn: 'Lean Left',
  politico: 'Lean Left',
  npr: 'Lean Left',
  'the atlantic': 'Lean Left',
  'nbc news': 'Lean Left',
  'cbs news': 'Lean Left',
  'abc news': 'Lean Left',
  'south china morning post': 'Lean Left',
  wired: 'Lean Left',
  time: 'Lean Left',

  // Left
  'the guardian': 'Left',
  msnbc: 'Left',
  vox: 'Left',
  huffpost: 'Left',
  slate: 'Left',
  'the intercept': 'Left',
  'mother jones': 'Left',

  // Lean Right
  'the wall street journal': 'Lean Right',
  wsj: 'Lean Right',
  'national review': 'Lean Right',
  'the telegraph': 'Lean Right',
  'new york post': 'Lean Right',
  'washington examiner': 'Lean Right',
  forbes: 'Lean Right',

  // Right
  'fox news': 'Right',
  'daily wire': 'Right',
  'daily mail': 'Right',
  breitbart: 'Right',
  newsmax: 'Right',
  'the federalist': 'Right',
};

export function getOutletLean(outletName: string): MediaLean {
  if (!outletName) return 'Center';
  const clean = outletName.trim().toLowerCase();
  if (OUTLET_DATABASE[clean]) {
    return OUTLET_DATABASE[clean];
  }

  // Substring match
  for (const [key, val] of Object.entries(OUTLET_DATABASE)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }

  return 'Center';
}

export function getLeanBadgeStyles(lean: MediaLean): {
  bg: string;
  text: string;
  border: string;
  dotBg: string;
} {
  switch (lean) {
    case 'Left':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dotBg: 'bg-blue-500',
      };
    case 'Lean Left':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dotBg: 'bg-sky-400',
      };
    case 'Center':
      return {
        bg: 'bg-neutral-100',
        text: 'text-neutral-700',
        border: 'border-neutral-200',
        dotBg: 'bg-neutral-400',
      };
    case 'Lean Right':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dotBg: 'bg-amber-500',
      };
    case 'Right':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dotBg: 'bg-rose-500',
      };
  }
}
