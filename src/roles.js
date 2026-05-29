// ── Role Definitions ──────────────────────────────────────────────────────────
// Each role has bilingual text (Vietnamese primary, English reference),
// faction, timing, SVG icon, and host-side logic hints.

export const FACTION = Object.freeze({ WOLF: 'wolf', VILLAGE: 'village', NEUTRAL: 'neutral' });
export const TIMING  = Object.freeze({ NIGHT: 'night', DAY: 'day', ANY: 'any', PASSIVE: 'passive' });

// SVG icon strings (80×80 viewBox, fill="currentColor")
const ICONS = {
  wolf: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M8 14 L20 8 L24 20 L32 14 L40 24 C44 30 46 38 42 46 C38 54 30 58 22 56 C14 54 8 46 10 38 C8 32 6 24 8 14Z" opacity="0.9"/>
    <path d="M40 24 C44 30 46 38 42 46 C50 44 58 48 62 42 C66 36 62 28 56 26 L48 22Z" opacity="0.75"/>
    <circle cx="22" cy="38" r="3"/>
    <path d="M16 50 L20 58 L24 54 L28 60 L32 54 L26 50Z" opacity="0.8"/>
  </svg>`,

  villager: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 12 L52 22 L52 38 L40 38 L28 38 L28 22Z" opacity="0.9"/>
    <rect x="28" y="38" width="24" height="26" rx="2" opacity="0.85"/>
    <rect x="36" y="48" width="8" height="16" rx="1"/>
    <path d="M22 28 L22 52 L16 52 L16 24Z" opacity="0.7"/>
    <path d="M58 28 L58 52 L64 52 L64 24Z" opacity="0.7"/>
    <path d="M24 22 L40 10 L56 22Z" opacity="0.6"/>
  </svg>`,

  seer: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <ellipse cx="40" cy="40" rx="30" ry="16" opacity="0.25"/>
    <ellipse cx="40" cy="40" rx="22" ry="11" opacity="0.35"/>
    <ellipse cx="40" cy="40" rx="14" ry="7"  opacity="0.5"/>
    <circle cx="40" cy="40" r="8" opacity="0.9"/>
    <circle cx="40" cy="40" r="4"/>
    <path d="M40 8 L42 20 L38 20Z" opacity="0.7"/>
    <path d="M40 60 L42 72 L38 72Z" opacity="0.7"/>
    <path d="M8 40 L20 38 L20 42Z" opacity="0.7"/>
    <path d="M72 40 L60 38 L60 42Z" opacity="0.7"/>
  </svg>`,

  witch: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M28 28 C28 20 36 14 40 14 C44 14 52 20 52 28 L52 36 C52 44 48 50 40 52 C32 50 28 44 28 36Z" opacity="0.85"/>
    <path d="M20 58 C20 50 28 48 40 52 C52 48 60 50 60 58 L60 64 L20 64Z" opacity="0.9"/>
    <path d="M16 18 L24 26 L28 22 L22 12Z" opacity="0.7"/>
    <path d="M60 20 L54 30 L58 32 L66 22Z" opacity="0.55"/>
    <circle cx="36" cy="34" r="3" opacity="0.4"/>
    <circle cx="46" cy="30" r="2" opacity="0.3"/>
    <path d="M34 52 L32 64 M40 52 L40 64 M46 52 L48 64" stroke="currentColor" stroke-width="1.5" opacity="0.5" fill="none"/>
  </svg>`,

  hunter: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="10" y="37" width="52" height="6" rx="3" opacity="0.9"/>
    <rect x="56" y="32" width="14" height="16" rx="3" opacity="0.8"/>
    <path d="M10 40 L4 36 L4 44Z" opacity="0.85"/>
    <rect x="18" y="32" width="6" height="5" rx="1" opacity="0.6"/>
    <rect x="26" y="30" width="16" height="3" rx="1.5" opacity="0.7"/>
    <circle cx="4" cy="40" r="2" opacity="0.9"/>
  </svg>`,

  bodyguard: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 10 C40 10 20 18 18 30 L18 48 C18 60 40 70 40 70 C40 70 62 60 62 48 L62 30 C60 18 40 10 40 10Z" opacity="0.85"/>
    <path d="M40 20 C40 20 28 26 26 34 L26 48 C26 56 40 64 40 64 C40 64 54 56 54 48 L54 34 C52 26 40 20 40 20Z" opacity="0.5"/>
    <path d="M32 40 L38 46 L50 34" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9"/>
  </svg>`,

  mayor: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 10 L44 28 L62 28 L48 40 L54 58 L40 48 L26 58 L32 40 L18 28 L36 28Z" opacity="0.9"/>
    <circle cx="40" cy="40" r="10" opacity="0.25"/>
  </svg>`,

  jester: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 16 C30 16 26 8 20 10 C14 12 16 22 20 28 C16 28 10 32 12 38 C14 44 22 44 28 42 C28 52 34 58 40 58 C46 58 52 52 52 42 C58 44 66 44 68 38 C70 32 64 28 60 28 C64 22 66 12 60 10 C54 8 50 16 40 16Z" opacity="0.85"/>
    <circle cx="32" cy="38" r="3"/>
    <circle cx="48" cy="38" r="3"/>
    <path d="M34 46 Q40 52 46 46" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>
    <circle cx="20" cy="10" r="4" opacity="0.8"/>
    <circle cx="60" cy="10" r="4" opacity="0.8"/>
    <circle cx="40" cy="60" r="4" opacity="0.6"/>
  </svg>`,

  alpha_wolf: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M8 14 L20 8 L24 20 L32 14 L40 24 C44 30 46 38 42 46 C38 54 30 58 22 56 C14 54 8 46 10 38 C8 32 6 24 8 14Z" opacity="0.85"/>
    <path d="M40 24 C44 30 46 38 42 46 C50 44 58 48 62 42 C66 36 62 28 56 26 L48 22Z" opacity="0.7"/>
    <path d="M50 10 L56 6 L58 14 L62 10 L66 16 C68 20 68 26 64 30 C60 34 54 34 52 30 C50 26 50 10 50 10Z" opacity="0.8"/>
    <circle cx="22" cy="38" r="3"/>
    <circle cx="58" cy="22" r="2" opacity="0.9"/>
  </svg>`,

  cursed_villager: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 12 L52 22 L52 38 L40 38 L28 38 L28 22Z" opacity="0.65"/>
    <rect x="28" y="38" width="24" height="26" rx="2" opacity="0.6"/>
    <path d="M26 16 C28 8 36 8 40 14 C44 8 52 8 54 16 C56 24 50 30 40 34 C30 30 24 24 26 16Z" opacity="0.8"/>
    <path d="M34 52 L38 44 L40 52 L42 44 L46 52" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
  </svg>`,

  lycan: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 12 L52 22 L52 38 L40 38 L28 38 L28 22Z" opacity="0.7"/>
    <rect x="28" y="38" width="24" height="26" rx="2" opacity="0.65"/>
    <path d="M30 18 L22 12 L28 22 L18 20 L28 28Z" opacity="0.85"/>
    <path d="M50 18 L58 12 L52 22 L62 20 L52 28Z" opacity="0.85"/>
  </svg>`,

  aura_seer: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <ellipse cx="40" cy="40" rx="28" ry="14" opacity="0.2"/>
    <ellipse cx="40" cy="40" rx="20" ry="10" opacity="0.3"/>
    <circle cx="40" cy="40" r="10" opacity="0.85"/>
    <circle cx="40" cy="40" r="5"/>
    <path d="M40 16 L40 22 M40 58 L40 64 M16 40 L22 40 M58 40 L64 40 M24 24 L28 28 M52 52 L56 56 M56 24 L52 28 M28 52 L24 56" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  </svg>`,

  medium: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <circle cx="40" cy="28" r="14" opacity="0.85"/>
    <path d="M26 42 L26 64 L54 64 L54 42 C54 42 50 48 40 48 C30 48 26 42 26 42Z" opacity="0.8"/>
    <path d="M16 30 C12 24 14 16 22 16 L20 24Z" opacity="0.5"/>
    <path d="M64 30 C68 24 66 16 58 16 L60 24Z" opacity="0.5"/>
    <path d="M30 18 Q40 8 50 18" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4" stroke-dasharray="3,2"/>
  </svg>`,

  trapper: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M16 52 C16 40 24 32 40 32 C56 32 64 40 64 52 L64 56 C64 60 62 64 58 64 L22 64 C18 64 16 60 16 56Z" opacity="0.85"/>
    <path d="M28 32 L24 16 L36 20 L40 10 L44 20 L56 16 L52 32Z" opacity="0.8"/>
    <circle cx="40" cy="48" r="6" opacity="0.9"/>
    <path d="M28 52 L22 64 M52 52 L58 64" stroke="currentColor" stroke-width="2" opacity="0.5"/>
  </svg>`,

  gunner: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="14" y="36" width="44" height="8" rx="4" opacity="0.9"/>
    <rect x="52" y="30" width="16" height="20" rx="4" opacity="0.8"/>
    <path d="M14 40 L6 36 L6 44Z" opacity="0.85"/>
    <rect x="22" y="30" width="8" height="6" rx="2" opacity="0.6"/>
    <rect x="34" y="28" width="12" height="4" rx="2" opacity="0.55"/>
    <path d="M26 44 L26 56 L34 56 L34 44" opacity="0.7"/>
  </svg>`,

  priest: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="37" y="14" width="6" height="52" rx="3" opacity="0.9"/>
    <rect x="20" y="30" width="40" height="6" rx="3" opacity="0.9"/>
    <path d="M40 14 C40 14 30 18 28 28 C26 38 30 44 40 46 C50 44 54 38 52 28 C50 18 40 14 40 14Z" opacity="0.2"/>
  </svg>`,

  amor: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M40 60 C40 60 16 46 16 30 C16 22 22 16 30 16 C34 16 38 18 40 22 C42 18 46 16 50 16 C58 16 64 22 64 30 C64 46 40 60 40 60Z" opacity="0.85"/>
    <path d="M10 20 L70 50" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <circle cx="10" cy="20" r="3" opacity="0.8"/>
    <path d="M6 16 L14 16 L10 10Z" opacity="0.8"/>
    <circle cx="70" cy="50" r="3" opacity="0.5"/>
  </svg>`,
};

export const ROLES = Object.freeze({
  werewolf: {
    id: 'werewolf',
    nameVi: 'Sói', nameEn: 'Werewolf',
    faction: FACTION.WOLF, timing: TIMING.NIGHT,
    factionLabel: 'Phe Sói / Wolf Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, đội sói bí mật chọn một người dân để loại bỏ. Bạn biết đồng đội của mình.',
    abilityEn: 'Each night, the wolf team secretly chooses one player to eliminate. You know your teammates.',
    hasNightAction: true, isWolf: true,
    resolveOrder: 5, maxCount: 4, minCount: 1, defaultCount: 2,
    svgIcon: ICONS.wolf,
  },
  alpha_wolf: {
    id: 'alpha_wolf',
    nameVi: 'Sói Đầu Đàn', nameEn: 'Alpha Wolf',
    faction: FACTION.WOLF, timing: TIMING.NIGHT,
    factionLabel: 'Phe Sói / Wolf Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Một lần trong trò chơi, bạn có thể chuyển hóa một người dân thành Sói. Ngoài ra, bạn cũng tham gia giết người cùng đội.',
    abilityEn: 'Once per game, you can convert one villager to the wolf team. You also join the wolf kill each night.',
    hasNightAction: true, isWolf: true, hasConvert: true,
    resolveOrder: 4, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.alpha_wolf,
  },
  villager: {
    id: 'villager',
    nameVi: 'Dân Làng', nameEn: 'Villager',
    faction: FACTION.VILLAGE, timing: TIMING.PASSIVE,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '⚖️ Thụ Động', timingClass: 'timing-passive',
    abilityVi: 'Bạn không có khả năng đặc biệt. Hãy dùng lý trí và sự quan sát để tìm ra bọn sói và loại trừ chúng.',
    abilityEn: 'You have no special ability. Use reason and observation to find the wolves and eliminate them.',
    hasNightAction: false, isWolf: false,
    resolveOrder: 99, maxCount: 6, minCount: 0, defaultCount: 3,
    svgIcon: ICONS.villager,
  },
  cursed_villager: {
    id: 'cursed_villager',
    nameVi: 'Dân Bị Nguyền', nameEn: 'Cursed Villager',
    faction: FACTION.VILLAGE, timing: TIMING.PASSIVE,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '⚖️ Thụ Động', timingClass: 'timing-passive',
    abilityVi: 'Bạn thuộc phe làng, nhưng Tiên Tri sẽ nhìn thấy bạn là Sói. Nếu bị Sói Đầu Đàn chuyển hóa, bạn thực sự trở thành sói.',
    abilityEn: 'You are on the village team, but the Seer sees you as a Werewolf. If converted by the Alpha Wolf, you truly become a wolf.',
    hasNightAction: false, isWolf: false, appearsAsWolf: true,
    resolveOrder: 99, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.cursed_villager,
  },
  lycan: {
    id: 'lycan',
    nameVi: 'Người Sói Thực Sự', nameEn: 'Lycan',
    faction: FACTION.VILLAGE, timing: TIMING.PASSIVE,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '⚖️ Thụ Động', timingClass: 'timing-passive',
    abilityVi: 'Bạn thuộc phe làng nhưng xuất hiện là Sói với Tiên Tri và Tiên Tri Hào Quang. Bạn không biết mình có vẻ ngoài này.',
    abilityEn: 'You are on the village team but appear as a Werewolf to both the Seer and Aura Seer. You do not know this.',
    hasNightAction: false, isWolf: false, appearsAsWolf: true, appearsEvilAura: true,
    resolveOrder: 99, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.lycan,
  },
  seer: {
    id: 'seer',
    nameVi: 'Tiên Tri', nameEn: 'Seer',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, bạn có thể xem danh tính thật của một người — kết quả sẽ là Sói hoặc Không phải Sói.',
    abilityEn: 'Each night you may investigate one player — the result is either Werewolf or Not a Werewolf.',
    hasNightAction: true, isWolf: false,
    resolveOrder: 8, maxCount: 1, minCount: 0, defaultCount: 1,
    svgIcon: ICONS.seer,
  },
  aura_seer: {
    id: 'aura_seer',
    nameVi: 'Tiên Tri Hào Quang', nameEn: 'Aura Seer',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, bạn xem hào quang của một người — kết quả là Thiện hoặc Ác. Hào quang Ác bao gồm cả sói và các vai trung lập có phe ác.',
    abilityEn: 'Each night, you check one player\'s aura — Good or Evil. Evil aura includes wolves and evil-aligned neutrals.',
    hasNightAction: true, isWolf: false,
    resolveOrder: 8, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.aura_seer,
  },
  witch: {
    id: 'witch',
    nameVi: 'Phù Thủy', nameEn: 'Witch',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Bạn có một bình thuốc Cứu (hồi sinh nạn nhân đêm nay) và một bình thuốc Độc (giết một người). Mỗi loại chỉ dùng được một lần.',
    abilityEn: 'You have one Heal potion (save tonight\'s wolf victim) and one Poison potion (kill anyone). Each can only be used once.',
    hasNightAction: true, isWolf: false, hasHeal: true, hasPoison: true,
    resolveOrder: 3, maxCount: 1, minCount: 0, defaultCount: 1,
    svgIcon: ICONS.witch,
  },
  hunter: {
    id: 'hunter',
    nameVi: 'Thợ Săn', nameEn: 'Hunter',
    faction: FACTION.VILLAGE, timing: TIMING.PASSIVE,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '⚖️ Thụ Động', timingClass: 'timing-passive',
    abilityVi: 'Khi bạn bị loại bỏ (bởi sói hoặc bỏ phiếu), bạn lập tức bắn chết một người khác. Chọn người đó trước khi rời game.',
    abilityEn: 'When you are eliminated (by wolves or vote), you immediately shoot one other player. Choose before leaving.',
    hasNightAction: false, isWolf: false, onDeathShoot: true,
    resolveOrder: 11, maxCount: 1, minCount: 0, defaultCount: 1,
    svgIcon: ICONS.hunter,
  },
  bodyguard: {
    id: 'bodyguard',
    nameVi: 'Vệ Sĩ', nameEn: 'Bodyguard',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, bạn bảo vệ một người khỏi đòn tấn công của sói. Bạn không thể bảo vệ cùng một người hai đêm liên tiếp.',
    abilityEn: 'Each night, protect one player from the wolf kill. You cannot protect the same player two nights in a row.',
    hasNightAction: true, isWolf: false, noRepeatProtect: true,
    resolveOrder: 2, maxCount: 1, minCount: 0, defaultCount: 1,
    svgIcon: ICONS.bodyguard,
  },
  mayor: {
    id: 'mayor',
    nameVi: 'Thị Trưởng', nameEn: 'Mayor',
    faction: FACTION.VILLAGE, timing: TIMING.PASSIVE,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '⚖️ Thụ Động', timingClass: 'timing-passive',
    abilityVi: 'Phiếu bầu của bạn có giá trị gấp đôi trong mỗi lần bỏ phiếu ban ngày.',
    abilityEn: 'Your vote counts as two votes in every daytime vote.',
    hasNightAction: false, isWolf: false, doubleVote: true,
    resolveOrder: 99, maxCount: 1, minCount: 0, defaultCount: 1,
    svgIcon: ICONS.mayor,
  },
  medium: {
    id: 'medium',
    nameVi: 'Đồng Cốt', nameEn: 'Medium',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, bạn có thể trò chuyện với một người đã chết và nhận được một gợi ý về phe của họ hoặc điều họ biết.',
    abilityEn: 'Each night, communicate with one dead player to receive a hint about their faction or knowledge.',
    hasNightAction: true, isWolf: false,
    resolveOrder: 9, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.medium,
  },
  trapper: {
    id: 'trapper',
    nameVi: 'Thợ Bẫy', nameEn: 'Trapper',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, đặt bẫy tại nhà của một người. Nếu sói tấn công người đó đêm nay, bẫy kích hoạt và tiêu diệt sói đó.',
    abilityEn: 'Each night, place a trap at a player\'s house. If wolves attack that player tonight, the trap triggers and kills the attacking wolf.',
    hasNightAction: true, isWolf: false,
    resolveOrder: 1, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.trapper,
  },
  gunner: {
    id: 'gunner',
    nameVi: 'Xạ Thủ', nameEn: 'Gunner',
    faction: FACTION.VILLAGE, timing: TIMING.DAY,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '☀️ Ngày', timingClass: 'timing-day',
    abilityVi: 'Bạn có 2 viên đạn. Ban ngày, bạn có thể bắn một người — không cần bỏ phiếu. Nếu bắn trúng sói, người đó chết ngay lập tức.',
    abilityEn: 'You have 2 bullets. During the day, you may shoot any player immediately — no vote needed. Reveals if the target was a wolf.',
    hasNightAction: false, hasDayAction: true, isWolf: false, bullets: 2,
    resolveOrder: 99, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.gunner,
  },
  priest: {
    id: 'priest',
    nameVi: 'Linh Mục', nameEn: 'Priest',
    faction: FACTION.VILLAGE, timing: TIMING.NIGHT,
    factionLabel: 'Phe Làng / Village Team',
    timingLabel: '🌙 Đêm', timingClass: 'timing-night',
    abilityVi: 'Mỗi đêm, bạn ban phép lành cho một người — họ sẽ miễn nhiễm với đòn tấn công của sói trong đêm đó.',
    abilityEn: 'Each night, bless one player — they are immune to the wolf kill that night.',
    hasNightAction: true, isWolf: false,
    resolveOrder: 7, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.priest,
  },
  jester: {
    id: 'jester',
    nameVi: 'Hề', nameEn: 'Jester',
    faction: FACTION.NEUTRAL, timing: TIMING.PASSIVE,
    factionLabel: 'Trung Lập / Neutral',
    timingLabel: '⚖️ Thụ Động', timingClass: 'timing-passive',
    abilityVi: 'Bạn thắng nếu bị làng bỏ phiếu loại trừ. Bạn không thắng nếu bị sói giết. Hãy diễn xuất như thể bạn là sói!',
    abilityEn: 'You win if the village votes to eliminate you. You do NOT win if killed by wolves. Act suspicious!',
    hasNightAction: false, isWolf: false, winOnVoteElim: true,
    resolveOrder: 99, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.jester,
  },
  amor: {
    id: 'amor',
    nameVi: 'Thần Tình Yêu', nameEn: 'Amor',
    faction: FACTION.NEUTRAL, timing: TIMING.NIGHT,
    factionLabel: 'Trung Lập / Neutral',
    timingLabel: '🌙 Đêm 1', timingClass: 'timing-night',
    abilityVi: 'Đêm đầu tiên, bạn liên kết hai người với nhau. Nếu một người chết, người kia cũng chết theo. Họ sẽ thắng cùng nhau.',
    abilityEn: 'On the first night, link two players. If one dies, the other dies too. They win together regardless of faction.',
    hasNightAction: true, isNightOneOnly: true, isWolf: false,
    resolveOrder: 10, maxCount: 1, minCount: 0, defaultCount: 0,
    svgIcon: ICONS.amor,
  },
});

export const ROLE_IDS = Object.keys(ROLES);

// ── Role presets by player count ───────────────────────────────────────────────
export const PRESETS = Object.freeze({
  9:  ['werewolf','werewolf','seer','witch','hunter','bodyguard','villager','villager','villager'],
  10: ['werewolf','werewolf','seer','witch','hunter','bodyguard','mayor','villager','villager','villager'],
  11: ['werewolf','werewolf','werewolf','seer','witch','hunter','bodyguard','mayor','villager','villager','jester'],
  12: ['werewolf','werewolf','werewolf','alpha_wolf','seer','witch','hunter','bodyguard','mayor','aura_seer','villager','jester'],
  13: ['werewolf','werewolf','werewolf','alpha_wolf','seer','witch','hunter','bodyguard','mayor','aura_seer','trapper','villager','jester'],
  14: ['werewolf','werewolf','werewolf','alpha_wolf','seer','witch','hunter','bodyguard','mayor','aura_seer','trapper','medium','villager','jester'],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export function makeRoleCard(roleId) {
  const r = ROLES[roleId];
  if (!r) return null;
  const div = document.createElement('div');
  div.className = `role-card faction-${r.faction} has-photo`;
  div.style.backgroundImage = `url('${new URL(`assets/roles/${roleId}.jpg`, document.baseURI).href}')`;
  div.innerHTML = `
    <div class="card-photo-overlay"></div>
    <div class="card-glow"></div>
    <div class="card-header">
      <span class="faction-badge">${r.factionLabel}</span>
      <span class="timing-badge ${r.timingClass}">${r.timingLabel}</span>
    </div>
    <div class="card-names">
      <h2 class="role-name-vi">${r.nameVi}</h2>
      <p class="role-name-en">${r.nameEn}</p>
    </div>
    <div class="card-ability">
      <p class="ability-vi">${r.abilityVi}</p>
      <p class="ability-en">${r.abilityEn}</p>
    </div>
  `;
  return div;
}

export function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
