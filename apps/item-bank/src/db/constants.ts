export const DB_NAME = 'item-bank-db';
export const DB_VERSION = 1;

export const STORE_NAMES = {
  questions: 'questions',
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];
