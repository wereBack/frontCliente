// Mock de Keycloak para tests
const keycloakMock = {
  authenticated: false,
  token: 'mock-token',
  tokenParsed: {
    name: 'Test User',
    preferred_username: 'testuser',
    realm_access: { roles: ['user'] },
    resource_access: {},
  },
  init: async () => true,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  updateToken: async () => true,
  onTokenExpired: null as (() => void) | null,
}

export default keycloakMock

