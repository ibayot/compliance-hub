import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Title, Button, Searchbar, ActivityIndicator, IconButton, Avatar } from 'react-native-paper';
import api from '../../services/api';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resettingId, setResettingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Assuming GET /users exists for super_admin
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (userId: number, email: string) => {
    Alert.alert(
      'Reset Password',
      `Are you sure you want to reset the password for ${email} to default?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            setResettingId(userId);
            try {
              await api.post(`/users/${userId}/reset-password`);
              Alert.alert('Success', 'Password has been reset to default.');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to reset password');
            } finally {
              setResettingId(null);
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(u => 
    (u.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.row}>
        <Avatar.Text size={40} label={(item.firstName?.[0] || 'U') + (item.lastName?.[0] || '')} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.firstName} {item.lastName}</Text>
          <Text variant="bodyMedium" style={{ color: 'gray' }}>{item.email}</Text>
          <Text variant="labelSmall" style={{ color: '#0F52BA', marginTop: 2 }}>{item.roleCode || item.role}</Text>
        </View>
        <Button 
          mode="outlined" 
          icon="lock-reset" 
          onPress={() => handleResetPassword(item.id, item.email)}
          loading={resettingId === item.id}
          disabled={resettingId !== null}
        >
          Reset
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search users..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No users found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16
  },
  searchbar: {
    marginBottom: 16,
    backgroundColor: 'white'
  },
  card: {
    marginBottom: 12,
    backgroundColor: 'white'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});
