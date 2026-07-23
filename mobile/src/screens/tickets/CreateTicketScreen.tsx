import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Surface, Menu, Text, Divider, IconButton, SegmentedButtons } from 'react-native-paper';
import { ticketsApi } from '../../services/ticketsApi';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function CreateTicketScreen() {
  const [form, setForm] = useState({
    subject: '',
    description: '',
    ticketType: 'it_support',
    priority: 'low',
  });
  const [disposalDetails, setDisposalDetails] = useState({
    equipmentType: '',
    serialNumber: '',
    propertyNumber: '',
    reason: '',
  });
  
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Menus state
  const [menuTypeVisible, setMenuTypeVisible] = useState(false);
  const [menuPriorityVisible, setMenuPriorityVisible] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!form.subject || !form.description) {
      Alert.alert('Error', 'Please fill in subject and description.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('subject', form.subject);
      formData.append('description', form.description);
      formData.append('ticketType', form.ticketType);
      formData.append('priority', form.priority);
      
      // We don't have subcategoryId/categoryId hardcoded anymore because it matches the Dto

      if (form.ticketType === 'desktop_support' && disposalDetails.equipmentType) {
        formData.append('disposalDetails', JSON.stringify(disposalDetails));
      }

      if (selectedImage) {
        // @ts-ignore
        formData.append('attachment', {
          uri: selectedImage.uri,
          name: selectedImage.fileName || `photo_${Date.now()}.jpg`,
          type: selectedImage.mimeType || 'image/jpeg',
        });
      }

      await ticketsApi.create(formData, true);
      
      Alert.alert('Success', 'Ticket created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to create ticket.');
    } finally {
      setLoading(false);
    }
  };

  const isDisposal = form.ticketType === 'desktop_support';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.surface} elevation={2}>
          
          <Text variant="titleMedium" style={styles.sectionTitle}>General Details</Text>
          <TextInput
            label="Subject *"
            mode="outlined"
            value={form.subject}
            onChangeText={(text) => setForm({ ...form, subject: text })}
            style={styles.input}
          />
          <TextInput
            label="Description *"
            mode="outlined"
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Menu
                visible={menuTypeVisible}
                onDismiss={() => setMenuTypeVisible(false)}
                anchor={<Button mode="outlined" onPress={() => setMenuTypeVisible(true)}>{form.ticketType.replace('_', ' ').toUpperCase()}</Button>}>
                <Menu.Item onPress={() => { setForm({ ...form, ticketType: 'it_support' }); setMenuTypeVisible(false); }} title="IT SUPPORT" />
                <Menu.Item onPress={() => { setForm({ ...form, ticketType: 'desktop_support' }); setMenuTypeVisible(false); }} title="DESKTOP SUPPORT" />
                <Menu.Item onPress={() => { setForm({ ...form, ticketType: 'pantawid_ict_support' }); setMenuTypeVisible(false); }} title="PANTAWID ICT" />
              </Menu>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Menu
                visible={menuPriorityVisible}
                onDismiss={() => setMenuPriorityVisible(false)}
                anchor={<Button mode="outlined" onPress={() => setMenuPriorityVisible(true)}>{form.priority.toUpperCase()}</Button>}>
                <Menu.Item onPress={() => { setForm({ ...form, priority: 'low' }); setMenuPriorityVisible(false); }} title="LOW" />
                <Menu.Item onPress={() => { setForm({ ...form, priority: 'medium' }); setMenuPriorityVisible(false); }} title="MEDIUM" />
                <Menu.Item onPress={() => { setForm({ ...form, priority: 'high' }); setMenuPriorityVisible(false); }} title="HIGH" />
                <Menu.Item onPress={() => { setForm({ ...form, priority: 'urgent' }); setMenuPriorityVisible(false); }} title="URGENT" />
              </Menu>
            </View>
          </View>

          {isDisposal && (
            <View style={styles.disposalContainer}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Disposal Details</Text>
              <TextInput
                label="Equipment Type"
                mode="outlined"
                value={disposalDetails.equipmentType}
                onChangeText={(t) => setDisposalDetails({ ...disposalDetails, equipmentType: t })}
                style={styles.input}
              />
              <TextInput
                label="Serial Number"
                mode="outlined"
                value={disposalDetails.serialNumber}
                onChangeText={(t) => setDisposalDetails({ ...disposalDetails, serialNumber: t })}
                style={styles.input}
              />
              <TextInput
                label="Property Number"
                mode="outlined"
                value={disposalDetails.propertyNumber}
                onChangeText={(t) => setDisposalDetails({ ...disposalDetails, propertyNumber: t })}
                style={styles.input}
              />
              <TextInput
                label="Reason for Disposal"
                mode="outlined"
                value={disposalDetails.reason}
                onChangeText={(t) => setDisposalDetails({ ...disposalDetails, reason: t })}
                style={styles.input}
              />
            </View>
          )}

          <Divider style={{ marginVertical: 16 }} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Attachment</Text>
          <View style={styles.attachmentRow}>
            <Button icon="camera" mode="contained-tonal" onPress={() => pickImage(true)} style={{ flex: 1, marginRight: 4 }}>Camera</Button>
            <Button icon="image" mode="contained-tonal" onPress={() => pickImage(false)} style={{ flex: 1, marginLeft: 4 }}>Gallery</Button>
          </View>
          
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              <IconButton icon="close-circle" size={24} iconColor="red" onPress={() => setSelectedImage(null)} style={styles.imageCloseBtn} />
            </View>
          )}

          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            loading={loading}
            style={styles.submitBtn}
          >
            Submit Ticket
          </Button>

        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  scroll: {
    padding: 16,
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'white'
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#334155'
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 10, // For menus
  },
  disposalContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  imageCloseBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white'
  },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: '#0f52ba'
  }
});
