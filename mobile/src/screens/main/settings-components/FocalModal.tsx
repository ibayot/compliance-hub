import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, TextInput, Button, Text, Menu } from 'react-native-paper';
import { ticketSettingsApi } from '../../../services/ticketSettingsApi';

interface FocalModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function FocalModal({ visible, onDismiss, onSaved }: FocalModalProps) {
  const [label, setLabel] = useState('');
  const [ticketType, setTicketType] = useState('it_support');
  const [userId, setUserId] = useState<number | null>(null);
  
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [menuTypeVisible, setMenuTypeVisible] = useState(false);
  const [menuUserVisible, setMenuUserVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      ticketSettingsApi.getAvailableUsers().then(setAvailableUsers).catch(console.error);
      setLabel('');
      setTicketType('it_support');
      setUserId(null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!userId || !label) {
      alert('User and Label are required');
      return;
    }
    setLoading(true);
    try {
      await ticketSettingsApi.createEscalationFocal({ 
        ticketType,
        userId,
        label
      });
      onSaved();
    } catch (e) {
      console.error(e);
      alert('Failed to save focal');
    } finally {
      setLoading(false);
    }
  };

  const selectedUserName = availableUsers.find(u => u.id === userId)?.firstName || 'Select User *';

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text variant="titleLarge" style={styles.title}>Add Escalation Focal</Text>
          
          <TextInput
            label="Label (e.g. IT Head) *"
            value={label}
            onChangeText={setLabel}
            mode="outlined"
            style={styles.input}
          />

          <View style={{ zIndex: 100, marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Support Type *</Text>
            <Menu
              visible={menuTypeVisible}
              onDismiss={() => setMenuTypeVisible(false)}
              anchor={<Button mode="outlined" onPress={() => setMenuTypeVisible(true)}>{ticketType.replace('_', ' ').toUpperCase()}</Button>}
            >
              <Menu.Item onPress={() => { setTicketType('it_support'); setMenuTypeVisible(false); }} title="IT SUPPORT" />
              <Menu.Item onPress={() => { setTicketType('desktop_support'); setMenuTypeVisible(false); }} title="DESKTOP SUPPORT" />
              <Menu.Item onPress={() => { setTicketType('pantawid_ict_support'); setMenuTypeVisible(false); }} title="PANTAWID ICT" />
            </Menu>
          </View>

          <View style={{ zIndex: 90, marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>User *</Text>
            <Menu
              visible={menuUserVisible}
              onDismiss={() => setMenuUserVisible(false)}
              anchor={<Button mode="outlined" onPress={() => setMenuUserVisible(true)}>{selectedUserName}</Button>}
            >
              {availableUsers.map(u => (
                <Menu.Item key={u.id} onPress={() => { setUserId(u.id); setMenuUserVisible(false); }} title={`${u.firstName} ${u.lastName || ''}`} />
              ))}
            </Menu>
          </View>

          <View style={styles.actions}>
            <Button onPress={onDismiss} style={{ marginRight: 8 }}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={loading}>Save</Button>
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
    borderRadius: 8,
    maxHeight: '80%'
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
