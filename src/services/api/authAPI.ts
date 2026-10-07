import { baseAPI } from './baseAPI';

export const authAPI = {
  login: async (credentials: { username?: string; password?: string; domain?: string }): Promise<any> => {
    return await baseAPI.post<any>('/Auth/login', credentials);
  },
  changePassword: async (data: { currentPassword: string; newPassword: string; confirmedPassword: string }): Promise<any> => {
    return await baseAPI.post<any>('/Auth/change-password', data);
  },
  resetPassword: async (userId: string): Promise<any> => {
    return await baseAPI.post<any>('/Auth/reset-password', { userId });
  },
};

export default authAPI;
