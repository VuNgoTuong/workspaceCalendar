export const ScheduleCategory = {
  Personal: 1, // Lịch cá nhân
  LeaderRegistration: 2, // Lịch đăng ký lãnh đạo
} as const;

export type ScheduleCategory = (typeof ScheduleCategory)[keyof typeof ScheduleCategory];
