import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import api from '../../services/api';
import { ticketsApi } from '../../services/ticketsApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';

type RootStackParamList = {
  MainTabs: undefined;
  CreateTicket: undefined;
  TicketDetails: { ticketId: number };
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'super_admin';
  const isTechnician = user?.ticketTechnician === true;

  const fetchTickets = async () => {
    try {
      const res = await ticketsApi.getAll();
      setTickets(res.data || res || []);
    } catch (e) {
      console.error('Failed to fetch tickets', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTickets();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'assigned':
        return '#ed6c02'; // MUI Warning
      case 'in_progress': 
        return '#0288d1'; // MUI Info
      case 'resolved': 
        return '#2e7d32'; // MUI Success
      case 'closed': 
        return '#757575'; // MUI Action
      default: 
        return '#757575';
    }
  };

  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={{ color: 'gray', marginTop: 4 }}>
                {item.ticketNumber} • {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Chip 
                mode="flat" 
                textStyle={{ color: '#fff', fontSize: 12, marginVertical: 0, marginHorizontal: 8 }}
                style={{ backgroundColor: getStatusColor(item.status), height: 24, padding: 0, marginBottom: (isAdmin || isTechnician) ? 4 : 0 }}
              >
                {item.status === 'open' ? 'ASSIGNED' : item.status.replace('_', ' ').toUpperCase()}
              </Chip>
              {(isAdmin || isTechnician) && (
                <Text 
                  style={{ color: '#0288d1', fontSize: 12, fontWeight: 'bold', paddingRight: 4, marginTop: 8 }}
                  onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}
                >
                  MANAGE 
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 24 }} animating={true} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No tickets found.</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTicket')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'white'
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    color: 'gray'
  }
});
