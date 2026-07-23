import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, TextInput, Button, Text } from 'react-native-paper';
import api from '../../../services/api';

interface ChangePasswordModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ChangePasswordModal({ visible, onDismiss }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isFormValid = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSave = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onDismiss();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text variant="titleLarge" style={styles.title}>Change Password</Text>
          
          <TextInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.actions}>
            <Button onPress={onDismiss} style={{ marginRight: 8 }}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={loading} disabled={!isFormValid}>Save</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold'
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24
  }
});
