/**
 * Meteor Catcher — fallback question bank.
 *
 * Used when the API returns no matching questions (no network / empty bank).
 * IDs use the string format 'mc-92XX' to avoid colliding with server-assigned
 * numeric IDs, the Pixel Dash fallback range (9001–9050), and the Stack Attack
 * fallback range (9101–9150).
 *
 * All 30 questions are multiple_choice with 3 choices (one correct).
 */

import type { FallbackQuestion } from '../../../domain/types';

function mc(
  id: string,
  name: string,
  choices: [string, string, string],
  correctIndex: 0 | 1 | 2,
): FallbackQuestion {
  return {
    id,
    name,
    type: 'multiple_choice',
    text: name,
    status: 'published',
    content: {
      choices: choices.map((text, i) => ({
        id: `c${i}`,
        text,
        isCorrect: i === correctIndex,
      })),
    },
  };
}

export const FALLBACK_QUESTIONS: FallbackQuestion[] = [
  mc('mc-9201', 'Which planet is closest to the Sun?', ['Mercury', 'Venus', 'Mars'], 0),
  mc('mc-9202', 'How many planets are in our Solar System?', ['7', '8', '9'], 1),
  mc('mc-9203', 'What is the largest planet in the Solar System?', ['Saturn', 'Jupiter', 'Neptune'], 1),
  mc('mc-9204', 'What gas do plants absorb from the air?', ['Oxygen', 'Nitrogen', 'Carbon dioxide'], 2),
  mc('mc-9205', 'How many sides does a hexagon have?', ['5', '6', '7'], 1),
  mc('mc-9206', 'What is the chemical symbol for water?', ['HO', 'H₂O', 'H₃O'], 1),
  mc('mc-9207', 'Which ocean is the largest?', ['Atlantic', 'Indian', 'Pacific'], 2),
  mc('mc-9208', 'What is the capital of France?', ['Lyon', 'Paris', 'Marseille'], 1),
  mc('mc-9209', 'How many bones are in the adult human body?', ['186', '206', '226'], 1),
  mc('mc-9210', 'What is the approximate speed of light (km/s)?', ['200,000', '300,000', '400,000'], 1),
  mc('mc-9211', 'Which element has the symbol "O"?', ['Gold', 'Osmium', 'Oxygen'], 2),
  mc('mc-9212', 'What is the largest continent?', ['Africa', 'Asia', 'Europe'], 1),
  mc('mc-9213', 'How many degrees are in a right angle?', ['45°', '90°', '180°'], 1),
  mc('mc-9214', 'What is the powerhouse of the cell?', ['Nucleus', 'Mitochondria', 'Ribosome'], 1),
  mc('mc-9215', 'What year did World War II end?', ['1943', '1945', '1947'], 1),
  mc('mc-9216', 'What is the square root of 144?', ['10', '12', '14'], 1),
  mc('mc-9217', 'Which planet has the most prominent ring system?', ['Jupiter', 'Saturn', 'Uranus'], 1),
  mc('mc-9218', 'What is the longest river in the world?', ['Amazon', 'Nile', 'Yangtze'], 1),
  mc('mc-9219', 'How many colours are in a rainbow?', ['5', '6', '7'], 2),
  mc('mc-9220', 'What is the chemical formula for table salt?', ['NaCl', 'KCl', 'CaCl₂'], 0),
  mc('mc-9221', 'Who wrote "Romeo and Juliet"?', ['Dickens', 'Shakespeare', 'Chaucer'], 1),
  mc('mc-9222', 'What is the smallest prime number?', ['0', '1', '2'], 2),
  mc('mc-9223', 'How many continents are there?', ['5', '6', '7'], 2),
  mc('mc-9224', 'What is the boiling point of water in Celsius?', ['90°C', '100°C', '110°C'], 1),
  mc('mc-9225', 'Which gas makes up most of Earth\'s atmosphere?', ['Oxygen', 'Nitrogen', 'Carbon dioxide'], 1),
  mc('mc-9226', 'What is 15 × 15?', ['175', '225', '250'], 1),
  mc('mc-9227', 'What is the hardest natural substance?', ['Gold', 'Iron', 'Diamond'], 2),
  mc('mc-9228', 'What force keeps planets in orbit around the Sun?', ['Magnetism', 'Gravity', 'Friction'], 1),
  mc('mc-9229', 'How many chambers does the human heart have?', ['2', '3', '4'], 2),
  mc('mc-9230', 'What is the chemical symbol for gold?', ['Go', 'Au', 'Gd'], 1),
];
