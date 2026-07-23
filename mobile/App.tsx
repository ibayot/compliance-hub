import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/useAuthStore';
import AuthStack from './src/navigation/AuthStack';
import AppStack from './src/navigation/AppStack';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F52BA',
    secondary: '#1A1A1A',
    background: '#F3F4F6',
  },
};

export default function App() {
  const { token, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F52BA" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          {token ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
