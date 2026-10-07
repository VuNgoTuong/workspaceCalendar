import { baseAPI } from './baseAPI';

export const menuAPI = {
  getMenus: async (params?: any): Promise<any> => {
    return await baseAPI.get<any>('/Menus', { params });
  },
  getMenuDetail: async (id: string): Promise<any> => {
    return await baseAPI.get<any>(`/Menus/${id}`);
  },
  createMenu: async (data: any): Promise<any> => {
    return await baseAPI.post<any>('/Menus', data);
  },
  updateMenu: async (id: string, data: any): Promise<any> => {
    return await baseAPI.put<any>(`/Menus/${id}`, data);
  },
  deleteMenu: async (id: string): Promise<any> => {
    return await baseAPI.delete<any>(`/Menus/${id}`);
  },
};

export default menuAPI;
