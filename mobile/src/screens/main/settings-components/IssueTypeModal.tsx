import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, TextInput, Button, Text, Menu } from 'react-native-paper';
import { ticketSettingsApi } from '../../../services/ticketSettingsApi';

interface IssueTypeModalProps {
  visible: boolean;
  onDismiss: () => void;
  issueType?: any;
  categories: any[];
  onSaved: () => void;
}

export default function IssueTypeModal({ visible, onDismiss, issueType, categories, onSaved }: IssueTypeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slaHours, setSlaHours] = useState('');
  const [allowablePauseHours, setAllowablePauseHours] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (issueType) {
      setName(issueType.name || '');
      setDescription(issueType.description || '');
      setSlaHours(issueType.slaHours ? String(issueType.slaHours) : '');
      setAllowablePauseHours(issueType.allowablePauseHours ? String(issueType.allowablePauseHours) : '');
      setCategoryId(issueType.category?.id || issueType.categoryId || null);
    } else {
      setName('');
      setDescription('');
      setSlaHours('');
      setAllowablePauseHours('');
      setCategoryId(null);
    }
  }, [issueType, visible]);

  const handleSave = async () => {
    if (!name) {
      alert('Name is required');
      return;
    }
    setLoading(true);
    try {
      const payload = { 
        name, 
        description, 
        categoryId: categoryId || null,
        slaHours: slaHours ? parseFloat(slaHours) : null,
        allowablePauseHours: allowablePauseHours ? parseFloat(allowablePauseHours) : null
      };
      
      if (issueType) {
        await ticketSettingsApi.updateIssueType(issueType.id, payload);
      } else {
        await ticketSettingsApi.createIssueType(payload);
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('Failed to save issue type');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryName = categories.find(c => c.id === categoryId)?.name || 'Select Category (Optional)';

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text variant="titleLarge" style={styles.title}>
            {issueType ? 'Edit Issue Type' : 'New Issue Type'}
          </Text>
          
          <TextInput
            label="Issue Type Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          <View style={{ zIndex: 100, marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Category</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<Button mode="outlined" onPress={() => setMenuVisible(true)}>{selectedCategoryName}</Button>}
            >
              <Menu.Item onPress={() => { setCategoryId(null); setMenuVisible(false); }} title="None" />
              {categories.map(c => (
                <Menu.Item key={c.id} onPress={() => { setCategoryId(c.id); setMenuVisible(false); }} title={c.name} />
              ))}
            </Menu>
          </View>

          <TextInput
            label="SLA Hours (Optional)"
            value={slaHours}
            onChangeText={setSlaHours}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <TextInput
            label="Allowable Pause Hours (Optional)"
            value={allowablePauseHours}
            onChangeText={setAllowablePauseHours}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

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
    maxHeight: '85%'
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
