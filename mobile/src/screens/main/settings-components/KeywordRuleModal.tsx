import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, TextInput, Button, Text, Menu, Chip } from 'react-native-paper';
import { ticketSettingsApi } from '../../../services/ticketSettingsApi';

interface KeywordRuleModalProps {
  visible: boolean;
  onDismiss: () => void;
  rule?: any;
  categories: any[];
  issueTypes: any[];
  onSaved: () => void;
}

export default function KeywordRuleModal({ visible, onDismiss, rule, categories, issueTypes, onSaved }: KeywordRuleModalProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [targetTicketType, setTargetTicketType] = useState('it_support');
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
  const [targetIssueTypeId, setTargetIssueTypeId] = useState<string | null>(null);
  
  const [menuTypeVisible, setMenuTypeVisible] = useState(false);
  const [menuCatVisible, setMenuCatVisible] = useState(false);
  const [menuIssueVisible, setMenuIssueVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rule) {
      setKeywords(rule.keywords || []);
      setTargetTicketType(rule.targetTicketType || 'it_support');
      setTargetCategoryId(rule.targetCategory?.id || rule.targetCategoryId || null);
      setTargetIssueTypeId(rule.targetIssueType?.id || rule.targetIssueTypeId || null);
    } else {
      setKeywords([]);
      setTargetTicketType('it_support');
      setTargetCategoryId(null);
      setTargetIssueTypeId(null);
    }
    setKeywordInput('');
  }, [rule, visible]);

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleSave = async () => {
    if (keywords.length === 0) {
      alert('At least one keyword is required');
      return;
    }
    setLoading(true);
    try {
      const payload = { 
        keywords, 
        targetTicketType,
        targetCategoryId: targetCategoryId || null,
        targetIssueTypeId: targetIssueTypeId || null
      };
      
      if (rule) {
        await ticketSettingsApi.updateKeywordRule(rule.id, payload);
      } else {
        await ticketSettingsApi.createKeywordRule(payload);
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('Failed to save keyword rule');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryName = categories.find(c => c.id === targetCategoryId)?.name || 'Select Category (Optional)';
  const selectedIssueName = issueTypes.find(i => i.id === targetIssueTypeId)?.name || 'Select Issue Type (Optional)';

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text variant="titleLarge" style={styles.title}>
            {rule ? 'Edit Keyword Rule' : 'New Keyword Rule'}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              label="Add Keyword"
              value={keywordInput}
              onChangeText={setKeywordInput}
              mode="outlined"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              onSubmitEditing={addKeyword}
            />
            <Button onPress={addKeyword} style={{ marginLeft: 8, marginTop: 6 }}>Add</Button>
          </View>
          
          <View style={styles.chipContainer}>
            {keywords.map(kw => (
              <Chip key={kw} onClose={() => removeKeyword(kw)} style={styles.chip}>{kw}</Chip>
            ))}
          </View>

          <View style={{ zIndex: 100, marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Target Support Type *</Text>
            <Menu
              visible={menuTypeVisible}
              onDismiss={() => setMenuTypeVisible(false)}
              anchor={<Button mode="outlined" onPress={() => setMenuTypeVisible(true)}>{targetTicketType.replace('_', ' ').toUpperCase()}</Button>}
            >
              <Menu.Item onPress={() => { setTargetTicketType('it_support'); setMenuTypeVisible(false); }} title="IT SUPPORT" />
              <Menu.Item onPress={() => { setTargetTicketType('desktop_support'); setMenuTypeVisible(false); }} title="DESKTOP SUPPORT" />
              <Menu.Item onPress={() => { setTargetTicketType('pantawid_ict_support'); setMenuTypeVisible(false); }} title="PANTAWID ICT" />
            </Menu>
          </View>

          <View style={{ zIndex: 90, marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Target Category</Text>
            <Menu
              visible={menuCatVisible}
              onDismiss={() => setMenuCatVisible(false)}
              anchor={<Button mode="outlined" onPress={() => setMenuCatVisible(true)}>{selectedCategoryName}</Button>}
            >
              <Menu.Item onPress={() => { setTargetCategoryId(null); setMenuCatVisible(false); }} title="None" />
              {categories.map(c => (
                <Menu.Item key={c.id} onPress={() => { setTargetCategoryId(c.id); setMenuCatVisible(false); }} title={c.name} />
              ))}
            </Menu>
          </View>

          <View style={{ zIndex: 80, marginBottom: 12 }}>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Target Issue Type</Text>
            <Menu
              visible={menuIssueVisible}
              onDismiss={() => setMenuIssueVisible(false)}
              anchor={<Button mode="outlined" onPress={() => setMenuIssueVisible(true)}>{selectedIssueName}</Button>}
            >
              <Menu.Item onPress={() => { setTargetIssueTypeId(null); setMenuIssueVisible(false); }} title="None" />
              {issueTypes.filter(i => !targetCategoryId || i.categoryId === targetCategoryId || !i.categoryId).map(i => (
                <Menu.Item key={i.id} onPress={() => { setTargetIssueTypeId(i.id); setMenuIssueVisible(false); }} title={i.name} />
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
    maxHeight: '90%'
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold'
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white'
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 16
  },
  chip: {
    margin: 4
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24
  }
});
