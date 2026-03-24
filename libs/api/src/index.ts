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
  reorderQuestions,
  uploadQuestionAudio,
  deleteQuestionAudio,
  publishQuestion,
  rejectQuestion,
  exportQuestions,
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
export { getTags, createTag, deleteTag } from './tags';
export type { Tag } from './tags';
export { getProfile, updateProfile, changePassword } from './profile';
export type { UserProfile, UpdateProfileData, ChangePasswordData } from './profile';
export { getUsers, createUser, activateUser, deactivateUser, updateUser, getAuditLogs, getUserItemBanks, assignItemBankToUser, removeItemBankFromUser } from './admin';
export type { AdminUser, AdminUsersPage, GetUsersParams, CreateUserData, UpdateUserData, AuditLog, GetAuditLogsParams } from './admin';
export { saveGameSession, getMyStats, getLeaderboard } from './gameSessions';
export type { GameSessionData, MyStats, LeaderboardEntry, GameId } from './gameSessions';
export { getAnalyticsOverview } from './analytics';
export type {
  AnalyticsOverview,
  TopPlayer,
  QuestionTypeBreakdown,
  GameSessionCount,
} from './analytics';
export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from './notifications';
export type { Notification } from './notifications';
export {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  assignQuestionsToCategory,
  removeQuestionFromCategory,
} from './categories';
export type {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  AssignQuestionsData,
} from './categories';
export {
  getCourses,
  createCourse,
  getCourse,
  updateCourse,
  deleteCourse,
  createActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  getCourseAssignments,
  assignUser,
  unassignUser,
  uploadMedia,
} from './courses';
export type {
  Course,
  CourseSummary,
  CoursesPage,
  Activity,
  ActivityType,
  CourseStatus,
  CreateCourseData,
  UpdateCourseData,
  CreateActivityData,
  UpdateActivityData,
  GetCoursesParams,
  CourseAssignment,
  AssignUserData,
} from './courses';
