// libs/api/src/index.ts
export { apiRequest, setCsrfToken, clearCsrfToken } from './client';
export { login, getMe, logout, refreshToken } from './auth';
export type { ApiUser, LoginResponse } from './auth';
export {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitForReview,
  uploadImage,
  uploadImageBase64,
} from './questions';
export type {
  Question,
  QuestionsPage,
  GetQuestionsParams,
  CreateQuestionData,
  UpdateQuestionData,
} from './questions';
export {
  getItemBanks,
  getItemBank,
  createItemBank,
  updateItemBank,
  deleteItemBank,
} from './itemBanks';
export type { ItemBank, ItemBanksPage, GetItemBanksParams } from './itemBanks';
export { getTags, createTag } from './tags';
export type { Tag } from './tags';
export { getProfile, updateProfile, changePassword } from './profile';
export type { UserProfile, UpdateProfileData, ChangePasswordData } from './profile';
export { getUsers, createUser, activateUser, deactivateUser } from './admin';
export type { AdminUser, AdminUsersPage, GetUsersParams, CreateUserData } from './admin';
