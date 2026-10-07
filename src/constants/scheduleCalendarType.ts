export const ScheduleCalendarType = {
  Personal: 1, // Lịch cá nhân
  LeaderRegistration: 2, // Đăng ký lịch lãnh đạo
  LeaderApproval: 3, // Phê duyệt lịch
  Invitation: 4, // Lịch mời tham dự
} as const;

export type ScheduleCalendarType = (typeof ScheduleCalendarType)[keyof typeof ScheduleCalendarType];
