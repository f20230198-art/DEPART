// Open Peeps Avatar Engine and Username Moderation Filter
const OPEN_PEEPS_AVATARS = [
  { id: 'peep_1', name: 'Alex', seed: 'Alex_99', bg: '#e0e7ff', hair: 'short' },
  { id: 'peep_2', name: 'Sam', seed: 'Sam_44', bg: '#fef3c7', hair: 'curly' },
  { id: 'peep_3', name: 'Dev', seed: 'Dev_12', bg: '#d1fae5', hair: 'beanie' },
  { id: 'peep_4', name: 'Arya', seed: 'Arya_88', bg: '#fce7f3', hair: 'bun' },
  { id: 'peep_5', name: 'Jordan', seed: 'Jordan_23', bg: '#e0f2fe', hair: 'hoodie' },
  { id: 'peep_6', name: 'Taylor', seed: 'Taylor_77', bg: '#ede9fe', hair: 'cap' },
  { id: 'peep_7', name: 'Morgan', seed: 'Morgan_31', bg: '#fee2e2', hair: 'waves' },
  { id: 'peep_8', name: 'Casey', seed: 'Casey_55', bg: '#ccfbf1', hair: 'stache' },
  { id: 'peep_9', name: 'Riley', seed: 'Riley_19', bg: '#fef9c3', hair: 'spiky' },
  { id: 'peep_10', name: 'Zion', seed: 'Zion_92', bg: '#fae8ff', hair: 'dreads' },
  { id: 'peep_11', name: 'Kai', seed: 'Kai_63', bg: '#e2e8f0', hair: 'crop' },
  { id: 'peep_12', name: 'Quinn', seed: 'Quinn_41', bg: '#ffedd5', hair: 'bob' }
];

// Generate Open Peeps SVG avatar URL
function getAvatarUrl(avatarId, size = 48) {
  const found = OPEN_PEEPS_AVATARS.find(p => p.id === avatarId || p.seed === avatarId);
  if (found) return `/avatars/${found.id}.svg`;
  const seed = avatarId || 'Dev_12';
  const bg = 'e0e7ff';
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&size=${size}`;
}

// Render Avatar HTML with fallback image
function renderAvatarHTML(avatarId, size = 32, extraClass = '') {
  const found = OPEN_PEEPS_AVATARS.find(p => p.id === avatarId || p.seed === avatarId);
  const seed = found ? found.seed : (avatarId || 'Dev_12');
  const bg = found ? found.bg : '#e0e7ff';
  const url = getAvatarUrl(avatarId, size * 2);

  return `
    <div class="peep-avatar-frame ${extraClass}" style="width: ${size}px; height: ${size}px; background-color: ${bg};">
      <img src="${url}" alt="Avatar" width="${size}" height="${size}" loading="lazy" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&size=${size}';">
    </div>
  `;
}

// Moderation blacklists for substring and whole-word matching
const MODERATION_RULES = {
  substring: [
    'admin', 'administrator', 'moderator', 'system', 'root',
    'fuck', 'fucker', 'fucking', 'fuk',
    'shit', 'shitty',
    'bitch',
    'asshole',
    'loser',
    'dumbass',
    'whore',
    'slut',
    'dick',
    'cock',
    'pussy',
    'cunt',
    'bastard',
    'bpdc',
    'gay',
    'noob',
    'bot',
    'nigger', 'nigga', 'faggot', 'retard',
    'suicide', 'kys', 'porn', 'nsfw', 'dildo',
    'chutiya', 'bhenchod', 'madarchod', 'gandu', 'bhosdike', 'harami', 'randi'
  ],
  whole_word: [
    'idiot', 'stupid', 'moron', 'dumb', 'creep', 'freak', 'trash', 'worthless', 'pathetic', 'ugly', 'fat',
    'crap', 'damn', 'bullshit', 'poop', 'penis', 'vagina', 'boobs', 'tits', 'sex', 'nude', 'incest',
    'kill', 'murder', 'massacre', 'terrorist', 'bomb', 'shoot', 'stab', 'selfharm', 'hitler', 'nazi',
    'cocaine', 'heroin', 'meth', 'weed', 'weed420', 'drugs', 'stoner',
    'mod', 'staff', 'support', 'official', 'verified', 'developer', 'owner', 'host', 'null', 'undefined'
  ]
};

// Homoglyph and confusable character dictionary
const HOMOGLYPH_MAP = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
  '\u0430': 'a',
  '\u0435': 'e',
  '\u043e': 'o',
  '\u0440': 'p',
  '\u0441': 'c',
  '\u0443': 'y',
  '\u0445': 'x',
  '\u0456': 'i',
  '\u0458': 'j',
  '\u0455': 's',
  '\u03b1': 'a',
  '\u03bf': 'o',
  '\u03c1': 'p',
  '\u03bd': 'v'
};

// Normalizes input username through NFKD and homoglyph mapping
function normalizeUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const decomposed = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  let mapped = '';
  for (const char of decomposed) {
    mapped += HOMOGLYPH_MAP[char] || char;
  }

  const sanitized = mapped.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const fullyStripped = sanitized.replace(/[^a-z0-9]/g, '');
  const collapsedRepeats = fullyStripped.replace(/(.)\1{2,}/g, '$1$1');
  const singleCollapsed = fullyStripped.replace(/(.)\1+/g, '$1');
  const tokens = sanitized.split(/[\s\-_.\d]+/).filter(t => t.length > 0);

  return {
    raw,
    sanitized,
    fullyStripped,
    collapsedRepeats,
    singleCollapsed,
    tokens
  };
}

// Validates username against character, length, and moderation rules
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Please enter a valid username.' };
  }

  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'Username must be at least 2 characters.' };
  }

  if (trimmed.length > 15) {
    return { valid: false, message: 'Username cannot exceed 15 characters.' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, message: 'Username can only contain letters, numbers, hyphens, and underscores.' };
  }

  const norm = normalizeUsername(trimmed);
  if (!norm) {
    return { valid: false, message: 'Invalid username characters.' };
  }

  // Check substring blacklist
  for (const sub of MODERATION_RULES.substring) {
    if (
      norm.fullyStripped.includes(sub) ||
      norm.collapsedRepeats.includes(sub) ||
      norm.singleCollapsed.includes(sub)
    ) {
      return { valid: false, message: `Username contains restricted term: "${sub}". Please choose another.` };
    }
  }

  // Check whole-word blacklist
  for (const word of MODERATION_RULES.whole_word) {
    for (const token of norm.tokens) {
      if (token === word) {
        return { valid: false, message: `Username contains restricted word: "${word}". Please choose another.` };
      }
    }
    if (norm.fullyStripped === word || norm.singleCollapsed === word) {
      return { valid: false, message: `Username contains restricted word: "${word}". Please choose another.` };
    }
  }

  return { valid: true, cleanUsername: trimmed };
}

// Export for browser and node
if (typeof window !== 'undefined') {
  window.OPEN_PEEPS_AVATARS = OPEN_PEEPS_AVATARS;
  window.getAvatarUrl = getAvatarUrl;
  window.renderAvatarHTML = renderAvatarHTML;
  window.validateUsername = validateUsername;
  window.MODERATION_RULES = MODERATION_RULES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OPEN_PEEPS_AVATARS,
    getAvatarUrl,
    validateUsername,
    MODERATION_RULES
  };
}
