/**
 * Stack Attack — fallback question bank.
 *
 * Used when the API returns no matching questions (no network / empty bank).
 * IDs start at 9101 to avoid colliding with server-assigned numeric IDs or the
 * Pixel Dash fallback range (9001–9050).
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
  mc(9101, 'How many sides does a triangle have?', ['2', '3', '4'], 1),
  mc(9102, 'What colour do you get when mixing red and blue?', ['Green', 'Purple', 'Orange'], 1),
  mc(9103, 'Which planet is known as the Blue Planet?', ['Mars', 'Neptune', 'Earth'], 2),
  mc(9104, 'How many hours are in a day?', ['12', '20', '24'], 2),
  mc(9105, 'What is the largest continent?', ['Africa', 'Asia', 'Europe'], 1),
  mc(9106, 'Which gas do humans exhale?', ['Oxygen', 'Nitrogen', 'Carbon dioxide'], 2),
  mc(9107, 'How many legs does a spider have?', ['6', '8', '10'], 1),
  mc(9108, 'What is the capital of Germany?', ['Munich', 'Hamburg', 'Berlin'], 2),
  mc(9109, 'Which metal is liquid at room temperature?', ['Lead', 'Mercury', 'Tin'], 1),
  mc(9110, 'How many planets are in the Solar System?', ['7', '8', '9'], 1),
  mc(9111, 'What do bees produce?', ['Silk', 'Wax and honey', 'Venom only'], 1),
  mc(9112, 'Which ocean lies between Europe and America?', ['Pacific', 'Arctic', 'Atlantic'], 2),
  mc(9113, 'What is the chemical symbol for iron?', ['Ir', 'In', 'Fe'], 2),
  mc(9114, 'How many minutes are in an hour?', ['30', '60', '90'], 1),
  mc(9115, 'Which country is home to the Amazon rainforest?', ['Colombia', 'Peru', 'Brazil'], 2),
  mc(9116, 'What is 9 × 9?', ['72', '81', '90'], 1),
  mc(9117, 'Which sense does the nose provide?', ['Taste', 'Smell', 'Touch'], 1),
  mc(9118, 'Who painted the Mona Lisa?', ['Michelangelo', 'Raphael', 'Leonardo da Vinci'], 2),
  mc(9119, 'How many zeros are in one million?', ['5', '6', '7'], 1),
  mc(9120, 'What is the tallest mountain on Earth?', ['K2', 'Kangchenjunga', 'Mount Everest'], 2),
  mc(9121, 'Which instrument has strings and is played with a bow?', ['Guitar', 'Violin', 'Ukulele'], 1),
  mc(9122, 'What does a thermometer measure?', ['Pressure', 'Temperature', 'Humidity'], 1),
  mc(9123, 'How many days are in a leap year?', ['364', '365', '366'], 2),
  mc(9124, 'Which bird is the symbol of peace?', ['Eagle', 'Dove', 'Sparrow'], 1),
  mc(9125, 'What is the freezing point of water in Celsius?', ['-10°C', '0°C', '10°C'], 1),
  mc(9126, 'How many colors are in a rainbow?', ['5', '6', '7'], 2),
  mc(9127, 'Which country has the Eiffel Tower?', ['Italy', 'Spain', 'France'], 2),
  mc(9128, 'What is the longest bone in the human body?', ['Spine', 'Humerus', 'Femur'], 2),
  mc(9129, 'How many keys does a standard piano have?', ['72', '88', '96'], 1),
  mc(9130, 'Which planet rotates on its side?', ['Neptune', 'Uranus', 'Saturn'], 1),
  mc(9131, 'What does photosynthesis produce?', ['Carbon dioxide', 'Glucose and oxygen', 'Water only'], 1),
  mc(9132, 'How many weeks are in a year?', ['48', '52', '56'], 1),
  mc(9133, 'Which language is the most spoken worldwide?', ['English', 'Mandarin Chinese', 'Spanish'], 1),
  mc(9134, 'What is 2 to the power of 10?', ['512', '1024', '2048'], 1),
  mc(9135, 'Which animal is known as the Ship of the Desert?', ['Elephant', 'Camel', 'Horse'], 1),
  mc(9136, 'What is the capital of Canada?', ['Toronto', 'Vancouver', 'Ottawa'], 2),
  mc(9137, 'How many bones does an adult shark have?', ['0', '22', '100'], 0),
  mc(9138, 'Which planet has the longest day?', ['Mercury', 'Venus', 'Mars'], 1),
  mc(9139, 'What is the primary ingredient in bread?', ['Flour', 'Sugar', 'Butter'], 0),
  mc(9140, 'How many chambers does the human heart have?', ['2', '3', '4'], 2),
  mc(9141, 'Which country invented the printing press?', ['China', 'Germany', 'England'], 1),
  mc(9142, 'What force keeps planets in orbit?', ['Magnetism', 'Gravity', 'Friction'], 1),
  mc(9143, 'How many strings does a violin have?', ['3', '4', '6'], 1),
  mc(9144, 'Which element is abbreviated Na?', ['Nitrogen', 'Sodium', 'Nickel'], 1),
  mc(9145, 'How many faces does a cube have?', ['4', '5', '6'], 2),
  mc(9146, 'What is the national language of Brazil?', ['Spanish', 'Portuguese', 'English'], 1),
  mc(9147, 'Which is the smallest planet in the Solar System?', ['Mars', 'Mercury', 'Pluto'], 1),
  mc(9148, 'How many grams are in a kilogram?', ['100', '500', '1000'], 2),
  mc(9149, 'Which animal has a black and white striped coat?', ['Cheetah', 'Jaguar', 'Zebra'], 2),
  mc(9150, 'What is the sum of angles in a triangle?', ['90°', '180°', '270°'], 1),
];
