/**
 * Pixel Craft fallback questions.
 *
 * These backup puzzles keep the game playable when the live bank does not
 * have enough compatible questions. Language puzzles ship with pre-built word
 * fragments, and math puzzles ship with pre-built equation fragments.
 */

import type { FallbackQuestion } from '../../../domain/types';

interface PixelCraftBaseContent extends Record<string, unknown> {
  pixelCraftKind: 'language' | 'math';
  craftedEmoji: string;
  craftedLabel: string;
  prompt: string;
}

interface PixelCraftLanguageContent extends PixelCraftBaseContent {
  pixelCraftKind: 'language';
  correctFragments: string[];
  decoyFragments: string[];
}

interface PixelCraftMathContent extends PixelCraftBaseContent {
  pixelCraftKind: 'math';
  equationFragments: string[];
}

function createLanguageQuestion(
  id: string,
  prompt: string,
  correctFragments: string[],
  decoyFragments: string[],
  craftedEmoji: string,
  craftedLabel: string,
): FallbackQuestion {
  const content: PixelCraftLanguageContent = {
    pixelCraftKind: 'language',
    prompt,
    correctFragments,
    decoyFragments,
    craftedEmoji,
    craftedLabel,
  };

  return {
    id,
    name: craftedLabel,
    type: 'multiple_choice',
    text: prompt,
    status: 'published',
    content,
  };
}

function createMathQuestion(
  id: string,
  prompt: string,
  equationFragments: string[],
  craftedEmoji: string,
  craftedLabel: string,
): FallbackQuestion {
  const content: PixelCraftMathContent = {
    pixelCraftKind: 'math',
    prompt,
    equationFragments,
    craftedEmoji,
    craftedLabel,
  };

  return {
    id,
    name: craftedLabel,
    type: 'numerical',
    text: prompt,
    status: 'published',
    content,
  };
}

const LANGUAGE_QUESTIONS = [
  createLanguageQuestion(
    'pc-lang-001',
    'Craft the phrase that describes clean energy.',
    ['solar', 'panels', 'gather', 'sunlight'],
    ['wind', 'engines', 'night', 'storm'],
    '🔋',
    'Solar Battery',
  ),
  createLanguageQuestion(
    'pc-lang-002',
    'Build the sentence about ocean life.',
    ['coral', 'reefs', 'shelter', 'fish'],
    ['desert', 'rocks', 'chase', 'sand'],
    '🐠',
    'Reef Charm',
  ),
  createLanguageQuestion(
    'pc-lang-003',
    'Craft the phrase that explains teamwork.',
    ['small', 'steps', 'build', 'trust'],
    ['loud', 'storms', 'break', 'glass'],
    '🤝',
    'Trust Totem',
  ),
  createLanguageQuestion(
    'pc-lang-004',
    'Assemble the library rule.',
    ['quiet', 'voices', 'help', 'everyone'],
    ['rapid', 'drums', 'scare', 'pages'],
    '📚',
    'Library Sigil',
  ),
  createLanguageQuestion(
    'pc-lang-005',
    'Build the sentence about healthy habits.',
    ['fresh', 'water', 'keeps', 'focus'],
    ['sugary', 'fog', 'melts', 'clocks'],
    '💧',
    'Focus Flask',
  ),
  createLanguageQuestion(
    'pc-lang-006',
    'Craft the phrase about good science.',
    ['clear', 'notes', 'track', 'evidence'],
    ['hidden', 'sparks', 'paint', 'mirrors'],
    '🧪',
    'Evidence Vial',
  ),
  createLanguageQuestion(
    'pc-lang-007',
    'Build the weather sentence.',
    ['dark', 'clouds', 'carry', 'rain'],
    ['bright', 'stones', 'carry', 'dust'],
    '🌧️',
    'Rain Token',
  ),
  createLanguageQuestion(
    'pc-lang-008',
    'Assemble the phrase about reading.',
    ['curious', 'minds', 'ask', 'questions'],
    ['sleepy', 'coins', 'stack', 'blankets'],
    '🧠',
    'Curiosity Core',
  ),
  createLanguageQuestion(
    'pc-lang-009',
    'Craft the sentence about farming.',
    ['rich', 'soil', 'feeds', 'roots'],
    ['thin', 'smoke', 'feeds', 'steel'],
    '🌱',
    'Root Relic',
  ),
  createLanguageQuestion(
    'pc-lang-010',
    'Build the phrase about maps.',
    ['north', 'stars', 'guide', 'travelers'],
    ['silver', 'boots', 'guide', 'thunder'],
    '🧭',
    'Navigator Star',
  ),
  createLanguageQuestion(
    'pc-lang-011',
    'Craft the sentence about music.',
    ['steady', 'rhythms', 'shape', 'dance'],
    ['frozen', 'candles', 'shape', 'silence'],
    '🎵',
    'Rhythm Rune',
  ),
  createLanguageQuestion(
    'pc-lang-012',
    'Assemble the phrase about recycling.',
    ['used', 'glass', 'becomes', 'bottles'],
    ['lost', 'dust', 'becomes', 'thunder'],
    '♻️',
    'Reuse Prism',
  ),
  createLanguageQuestion(
    'pc-lang-013',
    'Craft the sentence about forests.',
    ['tall', 'trees', 'cool', 'air'],
    ['sharp', 'bells', 'cool', 'wires'],
    '🌲',
    'Forest Badge',
  ),
  createLanguageQuestion(
    'pc-lang-014',
    'Build the phrase about history.',
    ['old', 'stories', 'carry', 'wisdom'],
    ['new', 'shadows', 'carry', 'noise'],
    '🏺',
    'Wisdom Tablet',
  ),
  createLanguageQuestion(
    'pc-lang-015',
    'Assemble the phrase about art.',
    ['bold', 'colors', 'spark', 'feeling'],
    ['cold', 'numbers', 'spark', 'circuits'],
    '🎨',
    'Color Crest',
  ),
  createLanguageQuestion(
    'pc-lang-016',
    'Craft the sentence about kindness.',
    ['gentle', 'words', 'lift', 'spirits'],
    ['rough', 'gears', 'lift', 'anchors'],
    '💛',
    'Spirit Charm',
  ),
  createLanguageQuestion(
    'pc-lang-017',
    'Build the phrase about space.',
    ['distant', 'planets', 'orbit', 'stars'],
    ['broken', 'lamps', 'orbit', 'bridges'],
    '🪐',
    'Orbit Emblem',
  ),
  createLanguageQuestion(
    'pc-lang-018',
    'Assemble the phrase about math class.',
    ['careful', 'patterns', 'reveal', 'answers'],
    ['silent', 'puddles', 'reveal', 'feathers'],
    '📐',
    'Pattern Chip',
  ),
  createLanguageQuestion(
    'pc-lang-019',
    'Craft the sentence about animals.',
    ['swift', 'wings', 'cross', 'valleys'],
    ['rusty', 'chains', 'cross', 'pillows'],
    '🦅',
    'Wing Badge',
  ),
  createLanguageQuestion(
    'pc-lang-020',
    'Build the phrase about the internet.',
    ['secure', 'passwords', 'protect', 'accounts'],
    ['loose', 'buttons', 'protect', 'candles'],
    '🛡️',
    'Cipher Shield',
  ),
  createLanguageQuestion(
    'pc-lang-021',
    'Assemble the phrase about teamwork.',
    ['shared', 'plans', 'save', 'time'],
    ['hidden', 'bells', 'save', 'marbles'],
    '⏳',
    'Planning Gear',
  ),
  createLanguageQuestion(
    'pc-lang-022',
    'Craft the sentence about cooking.',
    ['warm', 'bread', 'fills', 'kitchens'],
    ['cold', 'gears', 'fills', 'tunnels'],
    '🍞',
    'Bakery Brick',
  ),
  createLanguageQuestion(
    'pc-lang-023',
    'Build the phrase about rivers.',
    ['moving', 'water', 'shapes', 'stone'],
    ['sleeping', 'paper', 'shapes', 'echoes'],
    '🌊',
    'River Rune',
  ),
  createLanguageQuestion(
    'pc-lang-024',
    'Assemble the phrase about coding.',
    ['clean', 'logic', 'prevents', 'bugs'],
    ['foggy', 'lanterns', 'prevent', 'blankets'],
    '💻',
    'Logic Board',
  ),
  createLanguageQuestion(
    'pc-lang-025',
    'Craft the sentence about health.',
    ['daily', 'walks', 'strengthen', 'hearts'],
    ['weekly', 'storms', 'strengthen', 'bridges'],
    '❤️',
    'Vital Badge',
  ),
  createLanguageQuestion(
    'pc-lang-026',
    'Build the phrase about astronomy.',
    ['moon', 'phases', 'change', 'monthly'],
    ['clock', 'faces', 'change', 'softly'],
    '🌙',
    'Lunar Plate',
  ),
  createLanguageQuestion(
    'pc-lang-027',
    'Assemble the phrase about gardens.',
    ['bright', 'flowers', 'attract', 'bees'],
    ['dim', 'switches', 'attract', 'snow'],
    '🌼',
    'Bee Blossom',
  ),
  createLanguageQuestion(
    'pc-lang-028',
    'Craft the sentence about problem solving.',
    ['patient', 'thinking', 'finds', 'paths'],
    ['rapid', 'thunder', 'finds', 'shadows'],
    '🧩',
    'Path Stone',
  ),
  createLanguageQuestion(
    'pc-lang-029',
    'Build the phrase about school.',
    ['helpful', 'teachers', 'guide', 'growth'],
    ['restless', 'engines', 'guide', 'fog'],
    '🧑‍🏫',
    'Growth Scroll',
  ),
  createLanguageQuestion(
    'pc-lang-030',
    'Assemble the phrase about invention.',
    ['clever', 'tools', 'solve', 'problems'],
    ['broken', 'ropes', 'solve', 'bubbles'],
    '🛠️',
    'Inventor Gear',
  ),
] as const;

const MATH_QUESTIONS = [
  createMathQuestion(
    'pc-math-001',
    'Craft the equation for three times four.',
    ['3', '×', '4', '=', '12'],
    '🧮',
    'Times Tablet',
  ),
  createMathQuestion(
    'pc-math-002',
    'Build the sum for eight plus seven.',
    ['8', '+', '7', '=', '15'],
    '➕',
    'Addition Core',
  ),
  createMathQuestion(
    'pc-math-003',
    'Assemble the subtraction for twenty minus six.',
    ['20', '-', '6', '=', '14'],
    '➖',
    'Balance Chip',
  ),
  createMathQuestion(
    'pc-math-004',
    'Craft the division for eighteen divided by three.',
    ['18', '÷', '3', '=', '6'],
    '📏',
    'Division Bar',
  ),
  createMathQuestion(
    'pc-math-005',
    'Build the equation for nine plus nine.',
    ['9', '+', '9', '=', '18'],
    '🔢',
    'Twin Sum',
  ),
  createMathQuestion(
    'pc-math-006',
    'Assemble the subtraction for forty minus twenty five.',
    ['40', '-', '25', '=', '15'],
    '🧱',
    'Brick Counter',
  ),
  createMathQuestion(
    'pc-math-007',
    'Craft the multiplication for six times seven.',
    ['6', '×', '7', '=', '42'],
    '⚙️',
    'Gear Product',
  ),
  createMathQuestion(
    'pc-math-008',
    'Build the equation for fifteen divided by five.',
    ['15', '÷', '5', '=', '3'],
    '🪵',
    'Quotient Log',
  ),
  createMathQuestion(
    'pc-math-009',
    'Assemble the sum for eleven plus thirteen.',
    ['11', '+', '13', '=', '24'],
    '🧠',
    'Brain Sum',
  ),
  createMathQuestion(
    'pc-math-010',
    'Craft the subtraction for ninety minus thirty.',
    ['90', '-', '30', '=', '60'],
    '🏁',
    'Speed Meter',
  ),
  createMathQuestion(
    'pc-math-011',
    'Build the multiplication for twelve times five.',
    ['12', '×', '5', '=', '60'],
    '🔩',
    'Metal Multiply',
  ),
  createMathQuestion(
    'pc-math-012',
    'Assemble the division for forty eight divided by six.',
    ['48', '÷', '6', '=', '8'],
    '🪙',
    'Coin Divider',
  ),
  createMathQuestion(
    'pc-math-013',
    'Craft the sum for twenty one plus nine.',
    ['21', '+', '9', '=', '30'],
    '🌟',
    'Star Total',
  ),
  createMathQuestion(
    'pc-math-014',
    'Build the subtraction for sixty four minus sixteen.',
    ['64', '-', '16', '=', '48'],
    '📦',
    'Crate Counter',
  ),
  createMathQuestion(
    'pc-math-015',
    'Assemble the multiplication for eight times eight.',
    ['8', '×', '8', '=', '64'],
    '🪄',
    'Square Wand',
  ),
  createMathQuestion(
    'pc-math-016',
    'Craft the division for eighty one divided by nine.',
    ['81', '÷', '9', '=', '9'],
    '🎯',
    'Target Quotient',
  ),
  createMathQuestion(
    'pc-math-017',
    'Build the sum for fourteen plus twenty six.',
    ['14', '+', '26', '=', '40'],
    '🚀',
    'Rocket Total',
  ),
  createMathQuestion(
    'pc-math-018',
    'Assemble the subtraction for one hundred minus forty five.',
    ['100', '-', '45', '=', '55'],
    '🏆',
    'Victory Count',
  ),
  createMathQuestion(
    'pc-math-019',
    'Craft the multiplication for seven times nine.',
    ['7', '×', '9', '=', '63'],
    '🪓',
    'Product Axe',
  ),
  createMathQuestion(
    'pc-math-020',
    'Build the division for fifty six divided by seven.',
    ['56', '÷', '7', '=', '8'],
    '🗝️',
    'Key Quotient',
  ),
] as const;

/**
 * Ready-made backup pool for Pixel Craft.
 */
export const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  ...LANGUAGE_QUESTIONS,
  ...MATH_QUESTIONS,
];
