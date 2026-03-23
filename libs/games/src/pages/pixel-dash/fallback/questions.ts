/**
 * Pixel Dash — fallback question bank.
 *
 * Used when useFallbackQuestions falls back to offline content (no network /
 * no matching questions in the live bank). IDs start at 9001 to avoid
 * colliding with any server-assigned numeric IDs.
 *
 * All 50 questions are multiple_choice with 3 choices (one correct).
 */

import type { Question } from '@item-bank/api';

function mc(
  id: number,
  name: string,
  choices: [string, string, string],
  correctIndex: 0 | 1 | 2,
): Question {
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

export const FALLBACK_QUESTIONS: Question[] = [
  mc(9001, 'What is the capital of France?', ['Berlin', 'Paris', 'Madrid'], 1),
  mc(9002, 'Which planet is closest to the Sun?', ['Venus', 'Earth', 'Mercury'], 2),
  mc(9003, 'How many sides does a hexagon have?', ['5', '6', '7'], 1),
  mc(9004, 'What gas do plants absorb from the air?', ['Oxygen', 'Nitrogen', 'Carbon dioxide'], 2),
  mc(9005, 'Which ocean is the largest?', ['Atlantic', 'Indian', 'Pacific'], 2),
  mc(9006, 'What is 7 × 8?', ['54', '56', '64'], 1),
  mc(9007, 'Which country has the most natural lakes?', ['Russia', 'Canada', 'Brazil'], 1),
  mc(9008, "What is the chemical symbol for gold?", ['Ag', 'Gd', 'Au'], 2),
  mc(9009, 'How many bones are in the adult human body?', ['196', '206', '216'], 1),
  mc(9010, 'Which instrument has 88 keys?', ['Organ', 'Piano', 'Harpsichord'], 1),
  mc(9011, 'What is the hardest natural substance?', ['Quartz', 'Corundum', 'Diamond'], 2),
  mc(9012, 'Which animal is the fastest on land?', ['Lion', 'Cheetah', 'Greyhound'], 1),
  mc(9013, 'How many continents are there?', ['6', '7', '8'], 1),
  mc(9014, 'What colour is chlorophyll?', ['Yellow', 'Green', 'Blue'], 1),
  mc(9015, 'Who wrote "Romeo and Juliet"?', ['Marlowe', 'Dickens', 'Shakespeare'], 2),
  mc(9016, 'Which element has atomic number 1?', ['Helium', 'Hydrogen', 'Lithium'], 1),
  mc(9017, 'What is the square root of 144?', ['11', '12', '13'], 1),
  mc(9018, 'Which country invented paper?', ['Egypt', 'Japan', 'China'], 2),
  mc(9019, 'How many strings does a standard guitar have?', ['4', '5', '6'], 2),
  mc(9020, 'What is the powerhouse of the cell?', ['Nucleus', 'Mitochondria', 'Ribosome'], 1),
  mc(9021, 'What language do Brazilians primarily speak?', ['Spanish', 'English', 'Portuguese'], 2),
  mc(9022, 'Which planet has the most moons?', ['Jupiter', 'Saturn', 'Uranus'], 1),
  mc(9023, 'What is the boiling point of water in Celsius?', ['90°C', '100°C', '110°C'], 1),
  mc(9024, 'Which blood type is the universal donor?', ['A+', 'O-', 'AB+'], 1),
  mc(9025, 'How many letters are in the English alphabet?', ['24', '25', '26'], 2),
  mc(9026, 'What is the longest river in the world?', ['Amazon', 'Nile', 'Yangtze'], 1),
  mc(9027, 'How many players are on a standard soccer team?', ['10', '11', '12'], 1),
  mc(9028, 'Which organ pumps blood through the body?', ['Lungs', 'Brain', 'Heart'], 2),
  mc(9029, 'What is the chemical symbol for water?', ['HO', 'H2O', 'H3O'], 1),
  mc(9030, 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter'], 1),
  mc(9031, 'What is 15% of 200?', ['25', '30', '35'], 1),
  mc(9032, 'In which year did World War II end?', ['1943', '1945', '1947'], 1),
  mc(9033, 'What is the smallest country in the world?', ['Monaco', 'Vatican City', 'San Marino'], 1),
  mc(9034, 'How many hours are in a week?', ['160', '168', '172'], 1),
  mc(9035, 'Which gas makes up most of the atmosphere?', ['Oxygen', 'Argon', 'Nitrogen'], 2),
  mc(9036, 'What is the capital of Japan?', ['Osaka', 'Tokyo', 'Kyoto'], 1),
  mc(9037, 'How many degrees are in a right angle?', ['45', '90', '180'], 1),
  mc(9038, 'Which vitamin is produced by sunlight?', ['Vitamin A', 'Vitamin C', 'Vitamin D'], 2),
  mc(9039, 'What is the fastest bird in level flight?', ['Peregrine falcon', 'Swift', 'Eagle'], 1),
  mc(9040, 'Which element makes up about 78% of air?', ['Oxygen', 'Nitrogen', 'Carbon'], 1),
  mc(9041, 'How many teeth does an adult human have?', ['28', '32', '36'], 1),
  mc(9042, 'What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra'], 2),
  mc(9043, 'Which number is a prime?', ['9', '15', '17'], 2),
  mc(9044, 'What is the currency of Japan?', ['Won', 'Yuan', 'Yen'], 2),
  mc(9045, 'How many chambers does the human heart have?', ['2', '3', '4'], 2),
  mc(9046, 'Which planet has a ring system visible from Earth?', ['Uranus', 'Saturn', 'Neptune'], 1),
  mc(9047, 'What is the main ingredient in glass?', ['Quartz sand', 'Clay', 'Limestone'], 0),
  mc(9048, 'How many sides does a pentagon have?', ['4', '5', '6'], 1),
  mc(9049, 'What does DNA stand for?', ['Deoxyribonucleic acid', 'Diribose nucleic acid', 'Dynamic nuclear array'], 0),
  mc(9050, 'Which city hosted the first modern Olympic Games?', ['Rome', 'Athens', 'Paris'], 1),
];
