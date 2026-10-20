import { useDangerActions } from '@/hooks/useDangerActions';
import { Alert, type AlertButton } from 'react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/context/VaultContext', () => ({
  useVault: () => ({ services: [], status: 'ready', clear: jest.fn() }),
}));
jest.mock('expo-secure-store', () => require('@/testing/secureStoreMock').secureStoreMock);

type MockModule = typeof import('@/testing/secureStoreMock');
const mock: MockModule = require('@/testing/secureStoreMock');

/** The buttons of the most recent Alert.alert call. */
function lastAlertButtons(): AlertButton[] {
  const calls = jest.mocked(Alert.alert).mock.calls;
  return calls[calls.length - 1][2] ?? [];
}

beforeEach(() => {
  mock.resetSecureStore();
  mockPush.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('resetPin', () => {
  test('asks for confirmation before doing anything', () => {
    useDangerActions().resetPin();

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mock.log).toEqual([]);
  });

  test('cancelling leaves everything as it was', () => {
    useDangerActions().resetPin();
    lastAlertButtons().find((button) => button.style === 'cancel')?.onPress?.();

    expect(mockPush).not.toHaveBeenCalled();
    expect(mock.log).toEqual([]);
  });

  test('confirming opens PIN setup without clearing the current PIN', async () => {
    mock.secureStore.set('user_pin_hash', 'existing-record');

    useDangerActions().resetPin();
    await lastAlertButtons().find((button) => button.text === 'Reset')?.onPress?.();

    expect(mockPush).toHaveBeenCalledWith('/pin-setup');
    expect(mock.secureStoreMock.deleteItemAsync).not.toHaveBeenCalled();
    expect(mock.secureStore.get('user_pin_hash')).toBe('existing-record');
    // No "PIN reset" message until the new PIN is actually saved.
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });
});
