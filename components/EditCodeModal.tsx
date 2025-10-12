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

  // Update local state when service changes
  React.useEffect(() => {
    if (service) {
      setIssuer(service.otp.issuer);
      setLabel(service.name);
    }
  }, [service]);

  const handleSave = () => {
    if (!service) return;

    const updatedService: Service = {
      ...service,
      name: label,
      otp: {
        ...service.otp,
        issuer: issuer
      }
    };

    onSave(updatedService);
    onClose();
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

  if (!service) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Edit Code</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <ServiceIcon service={service} size={64} editable={true} />
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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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