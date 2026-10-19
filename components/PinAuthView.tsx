import { useTheme } from '@/context/ThemeContext';
import * as PinStore from '@/utils/pin';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
  pinLength?: number;
  /** Always show the "set a PIN" flow, even if a PIN is already stored. */
  forceSetup?: boolean;
}

const PinAuthView: React.FC<PinAuthViewProps> = ({
  onPinSuccess,
  onPinFailure,
  pinLength = 4,
  forceSetup = false,
}) => {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [originalPin, setOriginalPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSettingNewPin, setIsSettingNewPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Set while a complete PIN is being checked, so extra taps can't submit it twice.
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
      const needsSetup = forceSetup || !(await PinStore.hasPin());
      if (cancelled) return;
      setIsSettingNewPin(needsSetup);
      if (needsSetup) return;

      const lockout = await PinStore.getLockout();
      if (!cancelled && lockout.lockedUntil !== null) {
        setNow(Date.now());
        setLockedUntil(lockout.lockedUntil);
      }
    };

    checkExistingPin();
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
    if (isSubmitting.current || isLocked) return;

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
    try {
      if (isSettingNewPin) {
        await handleNewPinSetup(submittedPin);
      } else {
        await handlePinAuthentication(submittedPin);
      }
    } catch (error) {
      console.error('PIN submission failed:', error);
      setErrorMessage('Something went wrong. Please try again.');
      setShowError(true);
      setPin('');
      setConfirmPin('');
    } finally {
      isSubmitting.current = false;
    }
  };

  const handleNewPinSetup = async (submittedPin?: string) => {
    if (!isConfirming) {
      // Use the submitted PIN or fall back to state
      const pinToStore = submittedPin || pin;
      // Store the original PIN and move to confirmation step
      setOriginalPin(pinToStore);
      setPin(''); // Clear the pin display for confirmation
      setIsConfirming(true);
    } else {
      // Use the submitted PIN or fall back to state
      const pinToConfirm = submittedPin || confirmPin;
      if (pinToConfirm !== originalPin) {
        setErrorMessage('PINs do not match');
        setShowError(true);
        setConfirmPin('');
        setIsConfirming(false);
        return;
      }

      // Save the PIN to secure storage
      await PinStore.setPin(originalPin);
      onPinSuccess();
    }
  };

  const handlePinAuthentication = async (submittedPin?: string) => {
    // Use the submitted PIN or fall back to state
    const pinToCheck = submittedPin || pin;

    if (!(await PinStore.hasPin())) {
      // No PIN stored, this shouldn't happen in normal flow
      setErrorMessage('No PIN found. Please reset your PIN.');
      setShowError(true);
      return;
    }

    const result = await PinStore.attemptPin(pinToCheck);
    if (result.ok) {
      onPinSuccess();
      return;
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

    for (let i = 0; i < pinLength; i++) {
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
              ? (isConfirming ? 'Re-enter your PIN to confirm' : 'Choose a secure PIN for backup access')
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
            onPress={() => Alert.alert('Forgot PIN', 'Contact support to reset your PIN')}
          >
            <Text style={[styles.forgotPinText, { color: theme.accent }]}>
              Forgot PIN?
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