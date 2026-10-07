export const clearAuthCookie = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
};

export const clearAuthSession = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("tokenExpiration");
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const saveAuthCookie = (token: string, refreshToken: string, tokenExpiration: string) => {
  localStorage.setItem('kc_token', token);
  localStorage.setItem('kc_refreshToken', refreshToken);
  localStorage.setItem('kc_tokenExpiration', tokenExpiration);
};

export const getAuthCookie = () => {
  return {
    token: localStorage.getItem('kc_token'),
    refreshToken: localStorage.getItem('kc_refreshToken'),
  };
};

export const setLocalStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};
