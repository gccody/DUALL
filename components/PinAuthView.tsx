import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { eraseAllServices } from '@/storage/vault';
import * as PinStore from '@/utils/pin';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';

interface PinAuthViewProps {
  onPinSuccess: () => void;
  /** Called when too many wrong PINs trigger a lockout. */
  onPinFailure?: (error: string) => void;
  /** Always show the "set a PIN" flow, even if a PIN is already stored. */
  forceSetup?: boolean;
  /** Called after "Forgot PIN?" erased all codes, before the new PIN is set. */
  onDataErased?: () => void;
  /**
   * With `forceSetup`, shows a Cancel button that calls this. The stored PIN
   * is only replaced once the new one is confirmed, so cancelling keeps it.
   */
  onCancel?: () => void;
}

const PinAuthView: React.FC<PinAuthViewProps> = ({
  onPinSuccess,
  onPinFailure,
  forceSetup = false,
  onDataErased,
  onCancel,
}) => {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [originalPin, setOriginalPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSettingNewPin, setIsSettingNewPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The stored PIN's length when entering it, the chosen one when setting a
  // PIN. Null until known; input is ignored until then.
  const [pinLength, setPinLength] = useState<number | null>(null);
  // Set while a complete PIN is being checked or saved (hashing it blocks the
  // JS thread for a moment), so extra taps can't change or resubmit it.
  const isSubmitting = useRef(false);

  const isLocked = lockedUntil !== null;

  const startLockout = (until: number) => {
    setNow(Date.now());
    setLockedUntil(until);
  };

  // Check if there's an existing PIN in secure storage, and restore any lockout
  useEffect(() => {
    let cancelled = false;

    const checkExistingPin = async () => {
      const storedLength = forceSetup ? null : await PinStore.getPinLength();
      if (cancelled) return;
      const needsSetup = storedLength === null;
      setIsSettingNewPin(needsSetup);
      setPinLength(storedLength ?? PinStore.DEFAULT_PIN_LENGTH);
      if (needsSetup) return;

      const lockout = await PinStore.getLockout();
      if (!cancelled && lockout.lockedUntil !== null) {
        setNow(Date.now());
        setLockedUntil(lockout.lockedUntil);
      }
    };

    checkExistingPin().catch((error) => {
      console.error('Failed to read the stored PIN:', error);
      if (cancelled) return;
      setErrorMessage('Could not load your PIN. Please restart the app.');
      setShowError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [forceSetup]);

  // Tick the lockout countdown and re-enable the keypad when it ends
  useEffect(() => {
    if (lockedUntil === null) return;

    const interval = setInterval(() => {
      const current = Date.now();
      if (current >= lockedUntil) {
        setLockedUntil(null);
      } else {
        setNow(current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handlePinInput = async (value: string) => {
    if (isSubmitting.current || isLocked || pinLength === null) return;

    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');

    if (isConfirming) {
      const newConfirmPin = numericValue.slice(0, pinLength);
      setConfirmPin(newConfirmPin);

      // Auto-submit when PIN is complete
      if (newConfirmPin.length === pinLength) {
        isSubmitting.current = true;
        setTimeout(() => {
          handlePinSubmit(newConfirmPin);
        }, 100); // Small delay for visual feedback
      }
    } else {
      const newPin = numericValue.slice(0, pinLength);
      setPin(newPin);

      // Auto-submit when PIN is complete
      if (newPin.length === pinLength) {
        isSubmitting.current = true;
        setTimeout(() => {
          handlePinSubmit(newPin);
        }, 100); // Small delay for visual feedback
      }
    }

    // Clear error when user starts typing
    if (showError) {
      setShowError(false);
      setErrorMessage('');
    }
  };

  const handlePinSubmit = async (submittedPin?: string) => {
    let succeeded = false;
    try {
      succeeded = isSettingNewPin
        ? await handleNewPinSetup(submittedPin)
        : await handlePinAuthentication(submittedPin);
    } catch (error) {
      console.error('PIN submission failed:', error);
      setErrorMessage('Something went wrong. Please try again.');
      setShowError(true);
      setPin('');
      setConfirmPin('');
    } finally {
      // After success the parent closes this view; keep ignoring input until then.
      if (!succeeded) isSubmitting.current = false;
    }
  };

  /** Returns true once the new PIN is saved. */
  const handleNewPinSetup = async (submittedPin?: string): Promise<boolean> => {
    if (!isConfirming) {
      // Use the submitted PIN or fall back to state
      const pinToStore = submittedPin || pin;
      // Store the original PIN and move to confirmation step
      setOriginalPin(pinToStore);
      setPin(''); // Clear the pin display for confirmation
      setIsConfirming(true);
      return false;
    }

    // Use the submitted PIN or fall back to state
    const pinToConfirm = submittedPin || confirmPin;
    if (pinToConfirm !== originalPin) {
      setErrorMessage('PINs do not match');
      setShowError(true);
      setConfirmPin('');
      setIsConfirming(false);
      return false;
    }

    // Overwrites any existing PIN in one write; it stays valid until this succeeds.
    await PinStore.setPin(originalPin);
    onPinSuccess();
    return true;
  };

  /** Returns true if the PIN was correct. */
  const handlePinAuthentication = async (submittedPin?: string): Promise<boolean> => {
    // Use the submitted PIN or fall back to state
    const pinToCheck = submittedPin || pin;

    if (!(await PinStore.hasPin())) {
      // No PIN stored, this shouldn't happen in normal flow
      setErrorMessage('No PIN found. Please reset your PIN.');
      setShowError(true);
      return false;
    }

    const result = await PinStore.attemptPin(pinToCheck);
    if (result.ok) {
      onPinSuccess();
      return true;
    }

    setPin('');
    const { failures, lockedUntil: lockoutEnd } = result.lockout;
    if (lockoutEnd !== null) {
      setShowError(false);
      setErrorMessage('');
      startLockout(lockoutEnd);
      onPinFailure?.('Too many incorrect PIN attempts');
    } else {
      const remaining = PinStore.attemptsBeforeLockout(failures);
      setErrorMessage(`Invalid PIN. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining`);
      setShowError(true);
    }
    return false;
  };

  const startNewPinSetup = () => {
    setLockedUntil(null);
    setShowError(false);
    setErrorMessage('');
    setPin('');
    setConfirmPin('');
    setOriginalPin('');
    setIsConfirming(false);
    setIsSettingNewPin(true);
    setPinLength(PinStore.DEFAULT_PIN_LENGTH);
  };

  // While choosing a new PIN, switches between the allowed lengths.
  const otherPinLength = PinStore.PIN_LENGTHS.find((length) => length !== pinLength);

  const switchPinLength = () => {
    if (isSubmitting.current || otherPinLength === undefined) return;
    setPinLength(otherPinLength);
    setPin('');
    setShowError(false);
    setErrorMessage('');
  };

  const eraseAndReset = async () => {
    try {
      await eraseAllServices();
    } catch (error) {
      // Never drop the PIN unless the codes it protects are really gone.
      console.error('Failed to erase data:', error);
      Alert.alert('Error', 'Failed to erase your codes. Your PIN has not been reset.');
      return;
    }

    try {
      await PinStore.clearPin();
    } catch (error) {
      // Setting the new PIN below overwrites the old one anyway.
      console.error('Failed to clear PIN:', error);
    }
    startNewPinSetup();
    onDataErased?.();
  };

  const confirmEraseAndReset = () => {
    Alert.alert(
      'Forgot PIN',
      'Your PIN cannot be recovered. The only way to reset it is to erase all codes stored in this app. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          isPreferred: true
        },
        {
          text: 'Erase & Reset',
          style: 'destructive',
          onPress: eraseAndReset
        }
      ],
    );
  };

  const handleForgotPin = async () => {
    if (isSubmitting.current) return;

    // Biometrics may only stand in for the PIN if the user has allowed them.
    if (!settings.useBiometrics) {
      confirmEraseAndReset();
      return;
    }

    let canUseBiometrics = false;
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      canUseBiometrics = hasHardware && isEnrolled;
    } catch (error) {
      console.error('Failed to check biometrics:', error);
    }

    if (!canUseBiometrics) {
      confirmEraseAndReset();
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to reset your PIN'
      });
      if (result.success) {
        await PinStore.resetFailures();
        startNewPinSetup();
        return;
      }
      if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
        return;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
    // Biometrics are unusable right now; erasing is the only remaining option.
    confirmEraseAndReset();
  };

  const handleCancel = () => {
    // Once the new PIN is being saved, let that finish instead.
    if (isSubmitting.current) return;
    onCancel?.();
  };

  const handleBackspace = () => {
    if (isSubmitting.current || isLocked) return;

    if (isConfirming) {
      setConfirmPin(confirmPin.slice(0, -1));
    } else {
      setPin(pin.slice(0, -1));
    }

    if (showError) {
      setShowError(false);
      setErrorMessage('');
    }
  };

  const renderPinDots = () => {
    const currentPin = isConfirming ? confirmPin : pin;
    const dots = [];

    for (let i = 0; i < (pinLength ?? 0); i++) {
      const isFilled = i < currentPin.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            {
              backgroundColor: isFilled ? theme.accent : theme.border,
              borderColor: theme.border,
            },
          ]}
        />
      );
    }

    return <View style={styles.pinDotsContainer}>{dots}</View>;
  };

  const renderNumpad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', '⌫']
    ];

    return (
      <View style={styles.numpadContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numpadRow}>
            {row.map((num, colIndex) => {
              if (num === '') {
                return <View key={colIndex} style={styles.emptyButton} />;
              }

              if (num === '⌫') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[styles.numpadButton, { backgroundColor: theme.cardBackground }, isLocked && styles.numpadButtonDisabled]}
                    onPress={handleBackspace}
                    disabled={isLocked}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="chevron-left" size={24} color={theme.text} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[styles.numpadButton, { backgroundColor: theme.cardBackground }, isLocked && styles.numpadButtonDisabled]}
                  onPress={() => handlePinInput((isConfirming ? confirmPin : pin) + num)}
                  disabled={isLocked}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.numpadText, { color: theme.text }]}>{num}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <FontAwesome name="lock" size={60} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>
            {isSettingNewPin
              ? (isConfirming ? 'Confirm Your PIN' : 'Set a PIN')
              : 'Enter PIN'
            }
          </Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            {isSettingNewPin
              ? (isConfirming ? 'Re-enter your PIN to confirm' : `Choose a ${pinLength}-digit PIN for backup access`)
              : 'Use your PIN as an alternative to biometric authentication'
            }
          </Text>
        </View>

        {renderPinDots()}

        {isLocked && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.danger }]}>
              Too many incorrect attempts. Try again in {formatCountdown(lockedUntil - now)}.
            </Text>
          </View>
        )}

        {showError && !isLocked && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.danger }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {renderNumpad()}

        {!isSettingNewPin && (
          <TouchableOpacity
            style={styles.forgotPinButton}
            onPress={handleForgotPin}
          >
            <Text style={[styles.forgotPinText, { color: theme.accent }]}>
              Forgot PIN?
            </Text>
          </TouchableOpacity>
        )}

        {isSettingNewPin && !isConfirming && otherPinLength !== undefined && (
          <TouchableOpacity
            style={styles.forgotPinButton}
            onPress={switchPinLength}
          >
            <Text style={[styles.forgotPinText, { color: theme.accent }]}>
              Use a {otherPinLength}-digit PIN
            </Text>
          </TouchableOpacity>
        )}

        {isSettingNewPin && forceSetup && onCancel && (
          <TouchableOpacity
            style={styles.forgotPinButton}
            onPress={handleCancel}
          >
            <Text style={[styles.forgotPinText, { color: theme.accent }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

/** Formats a remaining duration as m:ss, rounding up so it never shows 0:00 while locked. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: height * 0.1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    // Keeps the layout steady before the PIN length is known.
    minHeight: 20,
    marginBottom: 30,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 8,
    borderWidth: 2,
  },
  numpadContainer: {
    marginBottom: 30,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  numpadButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  numpadButtonDisabled: {
    opacity: 0.4,
  },
  emptyButton: {
    width: 70,
    height: 70,
    marginHorizontal: 10,
  },
  numpadText: {
    fontSize: 28,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPinButton: {
    alignSelf: 'center',
    marginTop: 20,
  },
  forgotPinText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PinAuthView;