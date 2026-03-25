/**
 * Categories API functions.
 *
 * Categories are a hierarchical classification system for questions.
 * Admins manage the category tree; any authenticated user can assign
 * their own questions to categories.
 */

import { apiRequest } from './client';

/** Server response envelope shared across all endpoints. */
interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** A category node in the tree (may have nested children). */
export interface Category {
  id: number;
  name: string;
  children: Category[];
}

/** Payload for creating a new category. */
export interface CreateCategoryData {
  name: string;
  /** Omit for a root-level category. */
  parent_id?: number;
}

/** Payload for renaming an existing category. */
export interface UpdateCategoryData {
  name: string;
}

/** Payload for assigning questions to a category. */
export interface AssignQuestionsData {
  question_ids: number[];
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Fetch the full category tree.
 *
 * Returns root categories, each with a nested `children` array.
 * Available to all authenticated users.
 */
export async function getCategories(): Promise<Category[]> {
  const envelope = await apiRequest<Envelope<Category[]>>('/categories');
  return envelope.data;
}

/**
 * Create a new category. Admin-only.
 *
 * @param data - Category name and optional parent ID.
 */
export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const envelope = await apiRequest<Envelope<Category>>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Rename an existing category. Admin-only.
 *
 * @param id   - Category ID.
 * @param data - New name.
 */
export async function updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
  const envelope = await apiRequest<Envelope<Category>>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Delete a category. Admin-only.
 *
 * The server rejects deletion if the category has subcategories or
 * assigned questions (returns 409 Conflict).
 *
 * @param id - Category ID.
 */
export async function deleteCategory(id: number): Promise<void> {
  await apiRequest<unknown>(`/categories/${id}`, { method: 'DELETE' });
}

/**
 * Assign questions to a category.
 *
 * Any authenticated user may call this, but only for questions they own.
 * Admins may assign any questions.
 *
 * @param categoryId  - Target category ID.
 * @param questionIds - IDs of questions to assign.
 */
export async function assignQuestionsToCategory(
  categoryId: number,
  data: AssignQuestionsData
): Promise<void> {
  await apiRequest<unknown>(`/categories/${categoryId}/questions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove a single question from a category.
 *
 * Non-admins can only remove their own questions.
 *
 * @param categoryId - Category ID.
 * @param questionId - Question ID to remove.
 */
export async function removeQuestionFromCategory(
  categoryId: number,
  questionId: number
): Promise<void> {
  await apiRequest<unknown>(`/categories/${categoryId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}
