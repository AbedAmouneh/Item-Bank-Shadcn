module.exports = {
  displayName: 'auth',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/auth',
  // Stub @item-bank/api to prevent import.meta.env parse errors under Jest's
  // CommonJS transform. Tests that need real API behaviour mock at module level.
  moduleNameMapper: {
    '^@item-bank/api$': '<rootDir>/src/__mocks__/@item-bank/api.ts',
  },
};
