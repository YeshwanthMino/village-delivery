import '@testing-library/jest-native/extend-expect';

// Reanimated 4 pulls in react-native-worklets, whose native module throws when
// instantiated outside a real RN runtime. Without these mocks any component that
// transitively imports VillageBottomSheet fails at *import* time, which takes out
// most of the sheet-based UI.
// react-native-worklets ships its mock only under lib/, with no root-level shim
// (unlike reanimated, which has mock.js at the package root).
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Components rendered outside a <SafeAreaProvider> (i.e. any component test)
// otherwise throw from useSafeAreaInsets.
// The shipped mock is a default export that re-spreads the real module.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
