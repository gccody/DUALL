import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ServiceIcon from './ServiceIcon';

interface EditCodeModalProps {
  visible: boolean;
  service: Service | null;
  onClose: () => void;
  onSave: (updatedService: Service) => void;
  onDelete: (serviceUid: string) => void;
}

export default function EditCodeModal({
  visible,
  service,
  onClose,
  onSave,
  onDelete
}: EditCodeModalProps) {
  const { theme } = useTheme();
  const [issuer, setIssuer] = useState(service?.otp.issuer || '');
  const [label, setLabel] = useState(service?.name || '');
  const [currentService, setCurrentService] = useState(service);

  // Update local state when service changes
  React.useEffect(() => {
    if (service) {
      setIssuer(service.otp.issuer);
      setLabel(service.name);
      setCurrentService(service);
    }
  }, [service]);

  const handleSave = () => {
    if (!currentService) return;

    const updatedService: Service = {
      ...currentService,
      name: label,
      otp: {
        ...currentService.otp,
        issuer: issuer
      }
    };

    onSave(updatedService);
    onClose();
  };

  const handleIconSelected = async (domain: string, icon: any, updatedService?: Service) => {
    if (updatedService) {
      setCurrentService(updatedService);
    }
  };

  const handleDelete = () => {
    if (!service) return;

    Alert.alert(
      'Delete Code',
      `Are you sure you want to delete ${service.otp.issuer}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(service.uid);
            onClose();
          }
        }
      ]
    );
  };

  if (!service || !currentService) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Edit Code</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FontAwesome name="times" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <ServiceIcon
              service={currentService || service}
              size={64}
              editable={true}
              onIconSelected={handleIconSelected}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.subText }]}>Issuer</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Enter issuer name"
              placeholderTextColor={theme.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.subText }]}>Label</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              value={label}
              onChangeText={setLabel}
              placeholder="Enter label"
              placeholderTextColor={theme.subText}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton, { backgroundColor: theme.danger }]}
              onPress={handleDelete}
            >
              <FontAwesome name="trash" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: theme.accent }]}
              onPress={handleSave}
            >
              <FontAwesome name="check" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});