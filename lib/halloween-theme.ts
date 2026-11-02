// lib/halloween-theme.ts
export const halloween = {
  // Core palette
  bg: 'bg-[#0a0612]',                    // near-black purple
  bgPanel: 'bg-[#140a1f]/80',            // dark purple panel
  bgPanelSolid: 'bg-[#140a1f]',
  bgCard: 'bg-[#1a0f28]/70',
  bgHover: 'hover:bg-[#241436]',

  // Borders
  border: 'border-[#3d1f5c]/60',
  borderSoft: 'border-[#2a1540]/50',
  borderAccent: 'border-orange-500/40',

  // Text
  text: 'text-[#f5e6d3]',                // bone white
  textMuted: 'text-[#a88db8]',           // dusty lavender
  textDim: 'text-[#6b5580]',

  // Accents
  orange: 'text-orange-400',
  orangeBg: 'bg-orange-500/20',
  orangeBorder: 'border-orange-500/30',
  purple: 'text-purple-400',
  purpleBg: 'bg-purple-500/20',
  green: 'text-lime-400',                // "slime" green for success
  greenBg: 'bg-lime-500/20',

  // Gradients
  headerGradient: 'from-orange-600 via-purple-700 to-[#0a0612]',
  panelGradient: 'from-[#1a0f28] to-[#0f0818]',

  // Special
  glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
  glowPurple: 'shadow-[0_0_25px_rgba(168,85,247,0.2)]',
};

// Emoji/decor helpers
export const spooky = {
  pumpkin: '🎃',
  ghost: '👻',
  bat: '🦇',
  skull: '💀',
  spider: '🕷️',
  candy: '🍬',
  witch: '🧙',
  moon: '🌙',
};