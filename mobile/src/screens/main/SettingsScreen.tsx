import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Title, Button, List, Divider, TextInput, IconButton, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { ticketSettingsApi } from '../../services/ticketSettingsApi';

import CategoryModal from './settings-components/CategoryModal';
import IssueTypeModal from './settings-components/IssueTypeModal';
import KeywordRuleModal from './settings-components/KeywordRuleModal';
import FocalModal from './settings-components/FocalModal';
import GlobalConfigModal from './settings-components/GlobalConfigModal';
import ChangePasswordModal from './settings-components/ChangePasswordModal';

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation<any>();
  const [hasBiometrics, setHasBiometrics] = useState(false);
  
  const isAdmin = user?.role === 'super_admin';

  // State for Settings
  const [categories, setCategories] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [keywordRules, setKeywordRules] = useState<any[]>([]);
  const [focals, setFocals] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Modal Visibility State
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<any>(null);

  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [activeIssue, setActiveIssue] = useState<any>(null);

  const [keywordModalVisible, setKeywordModalVisible] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState<any>(null);

  const [focalModalVisible, setFocalModalVisible] = useState(false);
  const [globalConfigModalVisible, setGlobalConfigModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  useEffect(() => {
    checkBiometrics();
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const checkBiometrics = async () => {
    const creds = await SecureStore.getItemAsync('biometricCreds');
    setHasBiometrics(!!creds);
  };

  const fetchSettings = async () => {
    setLoadingConfig(true);
    try {
      const [cats, issues, rules, focalsRes, config] = await Promise.all([
        ticketSettingsApi.getCategories(),
        ticketSettingsApi.getIssueTypes(),
        ticketSettingsApi.getKeywordRules(),
        ticketSettingsApi.getEscalationFocals(),
        ticketSettingsApi.getGlobalConfig()
      ]);
      setCategories(cats);
      setIssueTypes(issues);
      setKeywordRules(rules);
      setFocals(focalsRes);
      setGlobalConfig(config);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleDisableBiometrics = async () => {
    Alert.alert(
      'Disable Biometrics',
      'Are you sure you want to disable biometric login for this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('biometricCreds');
            setHasBiometrics(false);
            Alert.alert('Success', 'Biometric login disabled.');
          }
        }
      ]
    );
  };

  const renderRow = (title: string, onEdit: () => void, onDelete: () => void) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 16 }}>
      <Text style={{ flex: 1, paddingRight: 8 }}>{title}</Text>
      <View style={{ flexDirection: 'row' }}>
        <IconButton icon="pencil" size={20} iconColor="#0F52BA" onPress={onEdit} style={{ margin: 0 }} />
        <IconButton icon="delete" size={20} iconColor="red" onPress={onDelete} style={{ margin: 0 }} />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Account Settings</Title>
          <List.Item
            title="Profile Information"
            description={`${user?.firstName || ''} ${user?.lastName || ''}\n${user?.email}`}
            descriptionNumberOfLines={2}
            left={props => <List.Icon {...props} icon="account-circle" />}
          />
          <Divider />
          <List.Item
            title="Role"
            description={(user?.roleCode || user?.role || 'Unknown').replace('_', ' ').toUpperCase()}
            left={props => <List.Icon {...props} icon="shield-account" />}
          />
          <Divider />
          <List.Item
            title="Change Password"
            description="Update your current account password"
            left={props => <List.Icon {...props} icon="lock-reset" />}
            onPress={() => setChangePasswordModalVisible(true)}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Help & Resources</Title>
          <Button 
            mode="outlined" 
            icon="book-open-page-variant" 
            onPress={() => navigation.navigate('UserManual')}
            style={{ marginTop: 16 }}
          >
            View User Manual
          </Button>
        </Card.Content>
      </Card>

      {isAdmin && (
        <Card style={styles.adminCard}>
          <Card.Content style={{ paddingBottom: 0 }}>
            <Title style={{ color: '#0F52BA', marginBottom: 8 }}>Admin Panel</Title>
            
            <List.Item
              title="System Users"
              description="Manage users and reset passwords"
              left={props => <List.Icon {...props} icon="account-group" />}
              onPress={() => navigation.navigate('AdminUsers')}
              style={{ paddingLeft: 0, paddingRight: 0 }}
            />
            <Divider style={{ marginVertical: 8 }} />

            <Title style={{ color: '#0F52BA', marginBottom: 8, marginTop: 8 }}>Ticket Settings</Title>
            
            {loadingConfig ? (
              <ActivityIndicator style={{ margin: 24 }} />
            ) : (
              <List.Section>
                <List.Accordion title="Global Configuration" left={props => <List.Icon {...props} icon="cog" />}>
                  <View style={{ padding: 16 }}>
                    <Text variant="labelMedium">Assignment Strategy</Text>
                    <Text variant="bodyLarge" style={{ marginBottom: 8 }}>{(globalConfig?.assignmentStrategy || 'MANUAL').toUpperCase()}</Text>
                    <Text variant="labelMedium">Schedule Mode</Text>
                    <Text variant="bodyLarge" style={{ marginBottom: 12 }}>{(globalConfig?.scheduleMode || 'OFFICE').toUpperCase()}</Text>
                    
                    <Button icon="pencil" mode="outlined" onPress={() => setGlobalConfigModalVisible(true)}>Edit Configuration</Button>
                  </View>
                </List.Accordion>

                <List.Accordion title="Categories Management" left={props => <List.Icon {...props} icon="shape-outline" />}>
                  <Button icon="plus" onPress={() => { setActiveCategory(null); setCatModalVisible(true); }}>Add Category</Button>
                  {categories.map((c: any) => (
                    <React.Fragment key={c.id}>
                      {renderRow(c.name, () => { setActiveCategory(c); setCatModalVisible(true); }, () => ticketSettingsApi.deleteCategory(c.id).then(fetchSettings))}
                    </React.Fragment>
                  ))}
                </List.Accordion>

                <List.Accordion title="Issue Types" left={props => <List.Icon {...props} icon="alert-circle-outline" />}>
                  <Button icon="plus" onPress={() => { setActiveIssue(null); setIssueModalVisible(true); }}>Add Issue Type</Button>
                  {issueTypes.map((i: any) => (
                    <React.Fragment key={i.id}>
                      {renderRow(i.name, () => { setActiveIssue(i); setIssueModalVisible(true); }, () => ticketSettingsApi.deleteIssueType(i.id).then(fetchSettings))}
                    </React.Fragment>
                  ))}
                </List.Accordion>

                <List.Accordion title="Keyword Rules" left={props => <List.Icon {...props} icon="key-variant" />}>
                  <Button icon="plus" onPress={() => { setActiveKeyword(null); setKeywordModalVisible(true); }}>Add Keyword Rule</Button>
                  {keywordRules.map((k: any) => (
                    <React.Fragment key={k.id}>
                      {renderRow(k.keywords?.join(', ') || 'Unnamed Rule', () => { setActiveKeyword(k); setKeywordModalVisible(true); }, () => ticketSettingsApi.deleteKeywordRule(k.id).then(fetchSettings))}
                    </React.Fragment>
                  ))}
                </List.Accordion>

                <List.Accordion title="Escalation Focals" left={props => <List.Icon {...props} icon="account-tie" />}>
                  <Button icon="plus" onPress={() => setFocalModalVisible(true)}>Add Focal</Button>
                  {focals.map((f: any) => (
                    <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 16 }}>
                      <Text>{`${f.user ? (f.user.firstName + ' ' + (f.user.lastName || '')) : 'Unknown'} (${f.label})`}</Text>
                      <IconButton icon="delete" size={20} iconColor="red" onPress={() => ticketSettingsApi.deleteEscalationFocal(f.id).then(fetchSettings)} />
                    </View>
                  ))}
                </List.Accordion>
              </List.Section>
            )}
          </Card.Content>
        </Card>
      )}

      <Card style={[styles.card, { borderColor: '#FCA5A5', borderWidth: 1 }]}>
        <Card.Content>
          <Title style={{ color: '#EF4444' }}>Session Options</Title>
          {hasBiometrics && (
            <Button 
              mode="outlined" 
              textColor="#EF4444"
              style={{ borderColor: '#EF4444', marginTop: 16 }}
              icon="face-recognition"
              onPress={handleDisableBiometrics}
            >
              Disable Biometric Login
            </Button>
          )}
          <Button 
            mode="contained" 
            buttonColor="#EF4444"
            icon="logout"
            onPress={logout}
            style={{ marginTop: 16 }}
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>

      <View style={{ height: 40 }} />

      <CategoryModal
        visible={catModalVisible}
        onDismiss={() => setCatModalVisible(false)}
        category={activeCategory}
        onSaved={() => { setCatModalVisible(false); fetchSettings(); }}
      />
      <IssueTypeModal
        visible={issueModalVisible}
        onDismiss={() => setIssueModalVisible(false)}
        issueType={activeIssue}
        categories={categories}
        onSaved={() => { setIssueModalVisible(false); fetchSettings(); }}
      />
      <KeywordRuleModal
        visible={keywordModalVisible}
        onDismiss={() => setKeywordModalVisible(false)}
        rule={activeKeyword}
        categories={categories}
        issueTypes={issueTypes}
        onSaved={() => { setKeywordModalVisible(false); fetchSettings(); }}
      />
      <FocalModal
        visible={focalModalVisible}
        onDismiss={() => setFocalModalVisible(false)}
        onSaved={() => { setFocalModalVisible(false); fetchSettings(); }}
      />
      <GlobalConfigModal
        visible={globalConfigModalVisible}
        onDismiss={() => setGlobalConfigModalVisible(false)}
        config={globalConfig}
        onSaved={() => { setGlobalConfigModalVisible(false); fetchSettings(); }}
      />
      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onDismiss={() => setChangePasswordModalVisible(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6'
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white'
  },
  adminCard: {
    marginBottom: 16,
    backgroundColor: '#EBF5FF',
    borderColor: '#BFDBFE',
    borderWidth: 1
  }
});
