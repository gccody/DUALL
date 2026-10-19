import ServiceIcon from '@/components/accounts/ServiceIcon';
import { useTheme } from '@/context/ThemeContext';
import { useVault } from '@/context/VaultContext';
import { useAccountRoute } from '@/hooks/useAccountRoute';
import { Service } from '@/types';
import { reportSaveError } from '@/utils/reportSaveError';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/** Sheet for renaming an account, changing its icon or deleting it. */
export default function EditAccountScreen() {
  const { service, close } = useAccountRoute();
  if (!service) return null;
  return <EditAccountForm service={service} close={close} />;
}

interface EditAccountFormProps {
  service: Service;
  close: () => void;
}

function EditAccountForm({ service, close }: EditAccountFormProps) {
  const { theme } = useTheme();
  const { updateService, deleteService } = useVault();
  const router = useRouter();
  // Seeded once: a later change to the service (an icon pick) keeps the edits in progress.
  const [issuer, setIssuer] = useState(service.otp.issuer);
  const [label, setLabel] = useState(service.name);

  const handleSave = () => {
    close();
    updateService(service.uid, { name: label, otp: { issuer } }).catch(reportSaveError);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Code',
      `Are you sure you want to delete ${service.otp.issuer}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            close();
            deleteService(service.uid).catch(reportSaveError);
          },
        },
      ]
    );
  };

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }];

  return (
    <View>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Edit Code</Text>
        <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel="Close">
          <FontAwesome name="times" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ServiceIcon
            service={service}
            size={64}
            onPress={() => router.push({ pathname: '/account/[uid]/icon', params: { uid: service.uid } })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Issuer</Text>
          <TextInput
            style={inputStyle}
            value={issuer}
            onChangeText={setIssuer}
            placeholder="Enter issuer name"
            placeholderTextColor={theme.subText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Label</Text>
          <TextInput
            style={inputStyle}
            value={label}
            onChangeText={setLabel}
            placeholder="Enter label"
            placeholderTextColor={theme.subText}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.danger }]} onPress={handleDelete}>
            <FontAwesome name="trash" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent }]} onPress={handleSave}>
            <FontAwesome name="check" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 32,
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
