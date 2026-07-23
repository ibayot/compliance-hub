import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme, Divider } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [savedBioCreds, setSavedBioCreds] = useState<{email: string, password: string} | null>(null);

  // MFA States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [tempToken, setTempToken] = useState('');

  const login = useAuthStore((state) => state.login);
  const deviceToken = useAuthStore((state) => state.deviceToken);
  const theme = useTheme();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '1096738596660-f4qslm2phtk3v64k445h6l5g500mptlq.apps.googleusercontent.com',
    iosClientId: '1096738596660-9t9324h3r7o042lhl3aov1i4359q57i3.apps.googleusercontent.com',
    androidClientId: '1096738596660-5a0d33e5v3l7424v7a1s5l4f4m3g7m7g.apps.googleusercontent.com',
  });

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);

      const creds = await SecureStore.getItemAsync('biometricCreds');
      if (creds) {
        setSavedBioCreds(JSON.parse(creds));
      }
    })();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google-login', { idToken });
      
      if (res.data?.mfaRequired) {
        setTempToken(res.data.tempToken);
        setMfaRequired(true);
        if (res.data.testModeCode) {
           Alert.alert('Test Mode MFA', `Your MFA Code is: ${res.data.testModeCode}`);
        }
        return;
      }

      if (res.data && res.data.accessToken) {
        const userObj = res.data.user || { id: '1', email, role: 'user' };
        await login(res.data.accessToken, userObj, res.data.deviceToken);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Google Login Failed', e.response?.data?.message || 'Error authenticating with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (loginEmail: any = email, loginPassword: any = password) => {
    // If an event object is accidentally passed, fallback to state variables
    const finalEmail = (typeof loginEmail === 'string' ? loginEmail : email).trim().toLowerCase();
    const finalPassword = typeof loginPassword === 'string' ? loginPassword : password;

    if (!finalEmail || !finalPassword) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: finalEmail, password: finalPassword }, {
        headers: deviceToken ? { 'x-device-token': deviceToken } : {}
      });
      
      if (res.data?.mfaRequired) {
        setTempToken(res.data.tempToken);
        setMfaRequired(true);
        if (res.data.testModeCode) {
           Alert.alert('Test Mode MFA', `Your MFA Code is: ${res.data.testModeCode}`);
        }
        return;
      }

      if (res.data && res.data.accessToken) {
        const userObj = res.data.user || { id: '1', email: loginEmail, role: 'admin' };
        await login(res.data.accessToken, userObj, res.data.deviceToken);

        // Prompt for biometric setup if hardware supported and not already saved
        if (isBiometricSupported && !savedBioCreds) {
          Alert.alert(
            'Enable Biometrics',
            'Would you like to enable Biometric Login for faster access?',
            [
              { text: 'No Thanks', style: 'cancel' },
              { 
                text: 'Enable', 
                onPress: async () => {
                  const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'Setup Biometric Login' });
                  if (auth.success) {
                    await SecureStore.setItemAsync('biometricCreds', JSON.stringify({ email: loginEmail, password: loginPassword }));
                    Alert.alert('Success', 'Biometrics enabled!');
                  }
                }
              }
            ]
          );
        }
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Login Failed', e.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!savedBioCreds) return;
    const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'Biometric Login' });
    if (auth.success) {
      handleLogin(savedBioCreds.email, savedBioCreds.password);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode) {
      Alert.alert('Error', 'Please enter the MFA code');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/mfa/verify', {
        tempToken,
        code: mfaCode,
        rememberDevice: true
      });
      if (res.data && res.data.accessToken) {
        const userObj = res.data.user || { id: '1', email, role: 'admin' };
        await login(res.data.accessToken, userObj, res.data.deviceToken);

        if (isBiometricSupported && !savedBioCreds) {
          Alert.alert(
            'Enable Biometrics',
            'Would you like to enable FaceID / TouchID for faster logins?',
            [
              { text: 'No Thanks', style: 'cancel' },
              { 
                text: 'Enable', 
                onPress: async () => {
                  const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'Setup Biometric Login' });
                  if (auth.success) {
                    await SecureStore.setItemAsync('biometricCreds', JSON.stringify({ email, password }));
                  }
                }
              }
            ]
          );
        }
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Verification Failed', e.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineMedium" style={{ textAlign: 'center', marginBottom: 24, fontWeight: 'bold' }}>
          Compliance Hub
        </Text>
        
        {mfaRequired ? (
          <>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
              Please enter the 6-digit verification code sent to your email.
            </Text>
            <TextInput
              label="MFA Code"
              mode="outlined"
              value={mfaCode}
              onChangeText={setMfaCode}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Button 
              mode="contained" 
              onPress={handleVerifyMfa} 
              loading={loading}
              style={styles.button}
            >
              Verify Code
            </Button>
            <Button 
              mode="text" 
              onPress={() => setMfaRequired(false)} 
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              Back to Login
            </Button>
          </>
        ) : (
          <>
            <TextInput
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label="Password"
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
            />
            <Button 
              mode="contained" 
              onPress={() => handleLogin()} 
              loading={loading}
              style={styles.button}
            >
              Login
            </Button>
            
            {isBiometricSupported && savedBioCreds && (
              <Button 
                mode="text" 
                icon="face-recognition"
                onPress={handleBiometricLogin} 
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                Biometric Login
              </Button>
            )}

            <Divider style={{ marginVertical: 20 }} />

            <Button 
              mode="outlined" 
              icon="google"
              onPress={() => promptAsync()} 
              disabled={loading || !request}
              style={styles.button}
            >
              Sign in with Google
            </Button>
          </>
        )}
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6'
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'white'
  },
  input: {
    marginBottom: 16
  },
  button: {
    marginTop: 8,
    paddingVertical: 4
  }
});
