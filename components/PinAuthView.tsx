import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
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
  onPinFailure: (error: string) => void;
  maxAttempts?: number;
  pinLength?: number;
}

const PinAuthView: React.FC<PinAuthViewProps> = ({
  onPinSuccess,
  onPinFailure,
  maxAttempts = 3,
  pinLength = 4,
}) => {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [originalPin, setOriginalPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isSettingNewPin, setIsSettingNewPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if there's an existing PIN in secure storage
  useEffect(() => {
    checkExistingPin();
  }, []);

  const checkExistingPin = async () => {
    const storedPin = await SecureStore.getItemAsync('user_pin');
    if (!storedPin) {
      setIsSettingNewPin(true);
    } else {
      setIsSettingNewPin(false);
    }
  };

  const handlePinInput = async (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');

    if (isConfirming) {
      const newConfirmPin = numericValue.slice(0, pinLength);
      setConfirmPin(newConfirmPin);

      // Auto-submit when PIN is complete
      if (newConfirmPin.length === pinLength) {
        setTimeout(() => {
          handlePinSubmit(newConfirmPin);
        }, 100); // Small delay for visual feedback
      }
    } else {
      const newPin = numericValue.slice(0, pinLength);
      setPin(newPin);

      // Auto-submit when PIN is complete
      if (newPin.length === pinLength) {
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
    if (isSettingNewPin) {
      handleNewPinSetup(submittedPin);
    } else {
      await handlePinAuthentication(submittedPin);
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
      await savePinToSecureStorage(originalPin);
      onPinSuccess();
    }
  };

  const handlePinAuthentication = async (submittedPin?: string) => {
    // Use the submitted PIN or fall back to state
    const pinToCheck = submittedPin || pin;

    // Verify against stored PIN
    const storedPin = await SecureStore.getItemAsync('user_pin');

    if (!storedPin) {
      // No PIN stored, this shouldn't happen in normal flow
      setErrorMessage('No PIN found. Please reset your PIN.');
      setShowError(true);
      return;
    }

    if (pinToCheck === storedPin) {
      onPinSuccess();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        setErrorMessage(`Maximum attempts (${maxAttempts}) exceeded`);
        setShowError(true);
        onPinFailure('Maximum PIN attempts exceeded');
      } else {
        setErrorMessage(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining`);
        setShowError(true);
        setPin('');
      }
    }
  };

  const savePinToSecureStorage = async (pinToSave: string) => {
    // Save the PIN to secure storage
    await SecureStore.setItemAsync('user_pin', pinToSave);
  };

  const handleBackspace = () => {
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
                    style={[styles.numpadButton, { backgroundColor: theme.cardBackground }]}
                    onPress={handleBackspace}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="chevron-left" size={24} color={theme.text} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[styles.numpadButton, { backgroundColor: theme.cardBackground }]}
                  onPress={() => handlePinInput((isConfirming ? confirmPin : pin) + num)}
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

        {showError && (
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