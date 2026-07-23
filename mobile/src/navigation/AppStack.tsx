import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import CreateTicketScreen from '../screens/tickets/CreateTicketScreen';
import TicketDetailsScreen from '../screens/tickets/TicketDetailsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import UserManualScreen from '../screens/main/UserManualScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="CreateTicket" 
        component={CreateTicketScreen} 
        options={{ title: 'Create Ticket', headerBackTitle: 'Tickets' }} 
      />
      <Stack.Screen 
        name="TicketDetails" 
        component={TicketDetailsScreen} 
        options={{ title: 'Ticket Details', headerBackTitle: 'Tickets' }} 
      />
      <Stack.Screen 
        name="AdminUsers" 
        component={AdminUsersScreen} 
        options={{ title: 'System Users', headerBackTitle: 'Settings' }} 
      />
      <Stack.Screen 
        name="UserManual" 
        component={UserManualScreen} 
        options={{ title: 'User Manual', headerBackTitle: 'Back' }} 
      />
    </Stack.Navigator>
  );
}
