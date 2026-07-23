import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, Title, Paragraph, ActivityIndicator, useTheme, Avatar } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { ticketsApi } from '../../services/ticketsApi';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isTechnician = user?.ticketTechnician === true;
  const isAdmin = user?.role === 'super_admin';
  const isTicketSettingsFocal = isAdmin || user?.ticketMainFocal === true;

  const [techStats, setTechStats] = useState<any>(null);
  const [slaSummary, setSlaSummary] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const res = await ticketsApi.getDashboardStats();
      setStats(res);

      if (isTechnician) {
        const d = new Date();
        const techRes = await ticketsApi.getAssignedStats(d.getFullYear(), d.getMonth() + 1);
        setTechStats(techRes);
      }

      if (isTicketSettingsFocal) {
        const slaRes = await ticketsApi.getSlaSummary();
        setSlaSummary(slaRes);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const renderStatCard = (title: string, value: string | number, icon: any, color: string, widthDiv = 2) => (
    <Card style={[styles.statCard, { width: (Dimensions.get('window').width / widthDiv) - 24, borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Card.Content style={styles.statContent}>
        <View>
          <Text variant="labelMedium" style={{ color: 'gray' }}>{title}</Text>
          <Text variant="headlineMedium" style={{ color, fontWeight: 'bold' }}>{value || 0}</Text>
        </View>
        <Avatar.Icon size={48} icon={icon} style={{ backgroundColor: color + '20' }} color={color} />
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Title style={styles.greeting}>Welcome back, {user?.firstName || user?.email?.split('@')[0]}!</Title>
        <Paragraph style={styles.subtitle}>Role: {user?.roleCode || user?.role}</Paragraph>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <>
          <Title style={{ marginLeft: 16, marginTop: 8 }}>Ticket Overview</Title>
          <View style={styles.grid}>
            {renderStatCard('Assigned', stats?.open ?? 0, 'ticket-confirmation-outline', '#ed6c02')}
            {renderStatCard('In Progress', stats?.inProgress ?? 0, 'progress-clock', '#0288d1')}
            {renderStatCard('Resolved', stats?.resolved ?? 0, 'check-circle-outline', '#2e7d32')}
            {renderStatCard('Closed', stats?.closed ?? 0, 'close-circle-outline', '#757575')}
          </View>

          {isTechnician && techStats && (
            <>
              <Title style={{ marginLeft: 16, marginTop: 16 }}>My Assigned Tasks (This Month)</Title>
              <View style={styles.grid}>
                <Card style={styles.gridCard} mode="contained">
                  <Card.Content>
                    <Text variant="displaySmall" style={{ color: '#F59E0B' }}>{techStats.assigned}</Text>
                    <Text variant="labelMedium">Assigned</Text>
                  </Card.Content>
                </Card>
                <Card style={styles.gridCard} mode="contained">
                  <Card.Content>
                    <Text variant="displaySmall" style={{ color: '#3B82F6' }}>{techStats.in_progress}</Text>
                    <Text variant="labelMedium">In Progress</Text>
                  </Card.Content>
                </Card>
              </View>
              <View style={styles.grid}>
                <Card style={styles.gridCard} mode="contained">
                  <Card.Content>
                    <Text variant="displaySmall" style={{ color: '#10B981' }}>{techStats.resolved}</Text>
                    <Text variant="labelMedium">Resolved</Text>
                  </Card.Content>
                </Card>
                <Card style={styles.gridCard} mode="contained">
                  <Card.Content>
                    <Text variant="displaySmall" style={{ color: '#6B7280' }}>{techStats.closed}</Text>
                    <Text variant="labelMedium">Closed</Text>
                  </Card.Content>
                </Card>
              </View>
            </>
          )}

          {isTicketSettingsFocal && slaSummary && (
            <>
              <Title style={{ marginLeft: 16, marginTop: 16 }}>Active SLA</Title>
              <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 16 }}>
                <Card style={{ borderLeftColor: '#d32f2f', borderLeftWidth: 4, marginBottom: 8, backgroundColor: '#fff' }}>
                  <Card.Content style={styles.statContent}>
                    <View>
                      <Text variant="labelMedium" style={{ color: 'gray' }}>Breached</Text>
                      <Text variant="headlineMedium" style={{ color: '#d32f2f', fontWeight: 'bold' }}>{slaSummary.breached || 0}</Text>
                    </View>
                    <Avatar.Icon size={48} icon="alert-circle-outline" style={{ backgroundColor: '#d32f2f20' }} color={'#d32f2f'} />
                  </Card.Content>
                </Card>
                <Card style={{ borderLeftColor: '#ed6c02', borderLeftWidth: 4, marginBottom: 8, backgroundColor: '#fff' }}>
                  <Card.Content style={styles.statContent}>
                    <View>
                      <Text variant="labelMedium" style={{ color: 'gray' }}>Nearing Breach</Text>
                      <Text variant="headlineMedium" style={{ color: '#ed6c02', fontWeight: 'bold' }}>{slaSummary.nearing || 0}</Text>
                    </View>
                    <Avatar.Icon size={48} icon="alert-outline" style={{ backgroundColor: '#ed6c0220' }} color={'#ed6c02'} />
                  </Card.Content>
                </Card>
                <Card style={{ borderLeftColor: '#2e7d32', borderLeftWidth: 4, marginBottom: 8, backgroundColor: '#fff' }}>
                  <Card.Content style={styles.statContent}>
                    <View>
                      <Text variant="labelMedium" style={{ color: 'gray' }}>On Track</Text>
                      <Text variant="headlineMedium" style={{ color: '#2e7d32', fontWeight: 'bold' }}>{slaSummary.onTrack || 0}</Text>
                    </View>
                    <Avatar.Icon size={48} icon="check-circle-outline" style={{ backgroundColor: '#2e7d3220' }} color={'#2e7d32'} />
                  </Card.Content>
                </Card>
              </View>
            </>
          )}

          {isAdmin && (
            <Card style={styles.adminCard}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name="shield-account" size={24} color={theme.colors.primary} />
                  <Title style={{ marginLeft: 8 }}>Admin Controls</Title>
                </View>
                <Paragraph>Ticket Configurations are available in the Settings tab.</Paragraph>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16
  },
  greeting: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  subtitle: {
    color: 'gray'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  statCard: {
    width: (Dimensions.get('window').width / 2) - 24,
    margin: 8,
    backgroundColor: '#fff',
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminCard: {
    margin: 16,
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  gridCard: {
    width: (Dimensions.get('window').width / 2) - 24,
    margin: 8,
    backgroundColor: '#fff',
  }
});
