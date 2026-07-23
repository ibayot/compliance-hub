import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, TextInput, Button, Text, Switch, Card, Menu } from 'react-native-paper';
import { ticketSettingsApi } from '../../../services/ticketSettingsApi';

interface GlobalConfigModalProps {
  visible: boolean;
  onDismiss: () => void;
  config?: any;
  onSaved: () => void;
}

export default function GlobalConfigModal({ visible, onDismiss, config, onSaved }: GlobalConfigModalProps) {
  const [loading, setLoading] = useState(false);
  
  const [assignmentStrategy, setAssignmentStrategy] = useState('manual');
  const [roundRobinCapHours, setRoundRobinCapHours] = useState('0');
  const [autoCloseDays, setAutoCloseDays] = useState('5');
  
  const [scheduleMode, setScheduleMode] = useState('office');
  const [officeClockin, setOfficeClockin] = useState('08:00');
  const [officeClockout, setOfficeClockout] = useState('17:00');
  const [cwwClockinStart, setCwwClockinStart] = useState('07:00');
  const [cwwClockinEnd, setCwwClockinEnd] = useState('08:00');
  const [cwwClockoutStart, setCwwClockoutStart] = useState('18:00');
  const [cwwClockoutEnd, setCwwClockoutEnd] = useState('19:00');
  
  const [isFlagCeremonyPaused, setIsFlagCeremonyPaused] = useState(false);

  const [strategyMenuVisible, setStrategyMenuVisible] = useState(false);
  const [scheduleMenuVisible, setScheduleMenuVisible] = useState(false);

  useEffect(() => {
    if (config && visible) {
      setAssignmentStrategy(config.assignmentStrategy || 'manual');
      setRoundRobinCapHours(String(config.roundRobinCapHours || 0));
      setAutoCloseDays(String(config.autoCloseDays || 5));
      setScheduleMode(config.scheduleMode || 'office');
      setOfficeClockin(config.officeClockin || '08:00');
      setOfficeClockout(config.officeClockout || '17:00');
      setCwwClockinStart(config.cwwClockinStart || '07:00');
      setCwwClockinEnd(config.cwwClockinEnd || '08:00');
      setCwwClockoutStart(config.cwwClockoutStart || '18:00');
      setCwwClockoutEnd(config.cwwClockoutEnd || '19:00');
      setIsFlagCeremonyPaused(config.isFlagCeremonyPaused || false);
    }
  }, [config, visible]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await ticketSettingsApi.updateGlobalConfig({ 
        assignmentStrategy,
        roundRobinCapHours: parseInt(roundRobinCapHours, 10),
        autoCloseDays: parseInt(autoCloseDays, 10),
        scheduleMode,
        officeClockin,
        officeClockout,
        cwwClockinStart,
        cwwClockinEnd,
        cwwClockoutStart,
        cwwClockoutEnd,
        isFlagCeremonyPaused
      });
      onSaved();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text variant="titleLarge" style={styles.title}>Global Configuration</Text>
          
          <Text variant="titleMedium" style={{ marginTop: 8, marginBottom: 8, fontWeight: 'bold' }}>Routing Configuration</Text>
          
          <Text variant="labelMedium" style={{ marginBottom: 4 }}>Assignment Strategy</Text>
          <Menu
            visible={strategyMenuVisible}
            onDismiss={() => setStrategyMenuVisible(false)}
            anchor={<Button mode="outlined" onPress={() => setStrategyMenuVisible(true)} style={styles.input}>{assignmentStrategy.toUpperCase()}</Button>}
          >
            <Menu.Item onPress={() => { setAssignmentStrategy('manual'); setStrategyMenuVisible(false); }} title="MANUAL" />
            <Menu.Item onPress={() => { setAssignmentStrategy('round_robin'); setStrategyMenuVisible(false); }} title="ROUND ROBIN" />
          </Menu>

          <TextInput
            label="Round Robin Cap (Hours)"
            value={roundRobinCapHours}
            onChangeText={setRoundRobinCapHours}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <TextInput
            label="Auto Close (Days)"
            value={autoCloseDays}
            onChangeText={setAutoCloseDays}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8, fontWeight: 'bold' }}>Work Hours & Schedule</Text>
          
          <Text variant="labelMedium" style={{ marginBottom: 4 }}>Schedule Mode</Text>
          <Menu
            visible={scheduleMenuVisible}
            onDismiss={() => setScheduleMenuVisible(false)}
            anchor={<Button mode="outlined" onPress={() => setScheduleMenuVisible(true)} style={styles.input}>{scheduleMode.toUpperCase()}</Button>}
          >
            <Menu.Item onPress={() => { setScheduleMode('office'); setScheduleMenuVisible(false); }} title="OFFICE" />
            <Menu.Item onPress={() => { setScheduleMode('cww'); setScheduleMenuVisible(false); }} title="CWW" />
          </Menu>

          
          {scheduleMode === 'office' ? (
            <>
              <TextInput label="Office Clock In (HH:mm)" value={officeClockin} onChangeText={setOfficeClockin} mode="outlined" style={styles.input} />
              <TextInput label="Office Clock Out (HH:mm)" value={officeClockout} onChangeText={setOfficeClockout} mode="outlined" style={styles.input} />
            </>
          ) : (
            <>
              <TextInput label="CWW Clock In Start (HH:mm)" value={cwwClockinStart} onChangeText={setCwwClockinStart} mode="outlined" style={styles.input} />
              <TextInput label="CWW Clock In End (HH:mm)" value={cwwClockinEnd} onChangeText={setCwwClockinEnd} mode="outlined" style={styles.input} />
              <TextInput label="CWW Clock Out Start (HH:mm)" value={cwwClockoutStart} onChangeText={setCwwClockoutStart} mode="outlined" style={styles.input} />
              <TextInput label="CWW Clock Out End (HH:mm)" value={cwwClockoutEnd} onChangeText={setCwwClockoutEnd} mode="outlined" style={styles.input} />
            </>
          )}

          <Card style={styles.card}>
            <Card.Content style={styles.switchRow}>
              <Text>Flag Ceremony Paused</Text>
              <Switch 
                value={isFlagCeremonyPaused} 
                onValueChange={() => setIsFlagCeremonyPaused(!isFlagCeremonyPaused)} 
              />
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
  card: {
    marginTop: 8,
    backgroundColor: '#f8fafc'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24
  }
});
