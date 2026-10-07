import Keycloak from 'keycloak-js';

let keycloak: Keycloak;

export const getKeycloak = () => keycloak;

export const initKeycloak = () => {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: import.meta.env.VITE_PUBLIC_KEYCLOAK_SERVER_ORIGIN,
      realm: import.meta.env.VITE_PUBLIC_KEYCLOAK_REALM_NAME,
      clientId: import.meta.env.VITE_PUBLIC_KEYCLOAK_CLIENT_ID,
    });
  }

  return keycloak;
};
