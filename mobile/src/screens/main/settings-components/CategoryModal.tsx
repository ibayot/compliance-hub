import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, TextInput, Button, Text, Switch, Card } from 'react-native-paper';
import { ticketSettingsApi } from '../../../services/ticketSettingsApi';

interface CategoryModalProps {
  visible: boolean;
  onDismiss: () => void;
  category?: any;
  onSaved: () => void;
}

export default function CategoryModal({ visible, onDismiss, category, onSaved }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isIt, setIsIt] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPantawid, setIsPantawid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setIsIt(category.isIt || false);
      setIsDesktop(category.isDesktop || false);
      setIsPantawid(category.isPantawid || false);
    } else {
      setName('');
      setDescription('');
      setIsIt(false);
      setIsDesktop(false);
      setIsPantawid(false);
    }
  }, [category, visible]);

  const handleSave = async () => {
    if (!name) {
      alert('Name is required');
      return;
    }
    if (!isIt && !isDesktop && !isPantawid) {
      alert('At least one support type must be selected');
      return;
    }
    setLoading(true);
    try {
      const payload = { name, description, isIt, isDesktop, isPantawid };
      if (category) {
        await ticketSettingsApi.updateCategory(category.id, payload);
      } else {
        await ticketSettingsApi.createCategory(payload);
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text variant="titleLarge" style={styles.title}>
            {category ? 'Edit Category' : 'New Category'}
          </Text>
          
          <TextInput
            label="Category Name *"
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
            numberOfLines={3}
            style={styles.input}
          />

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 12 }}>Support Types (Select at least one)</Text>
              
              <View style={styles.switchRow}>
                <Text>IT Support</Text>
                <Switch value={isIt} onValueChange={setIsIt} />
              </View>
              <View style={styles.switchRow}>
                <Text>Desktop Support</Text>
                <Switch value={isDesktop} onValueChange={setIsDesktop} />
              </View>
              <View style={styles.switchRow}>
                <Text>Pantawid ICT Support</Text>
                <Switch value={isPantawid} onValueChange={setIsPantawid} />
              </View>
            </Card.Content>
          </Card>

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
  card: {
    marginTop: 8,
    backgroundColor: '#f8fafc'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24
  }
});
