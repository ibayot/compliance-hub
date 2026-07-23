import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Chip, Divider, Title, Paragraph, Button, Avatar, IconButton, Modal, Portal, Menu } from 'react-native-paper';
import { ticketsApi } from '../../services/ticketsApi';
import { ticketSettingsApi } from '../../services/ticketSettingsApi';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';

export default function TicketDetailsScreen({ route, navigation }: any) {
  const { ticketId } = route.params;
  const user = useAuthStore((state) => state.user);
  
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const isAdmin = user?.role === 'super_admin';
  const isTechnician = user?.ticketTechnician === true;

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);
  
  // Data for Modals
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [escalationFocals, setEscalationFocals] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const ticketRes = await ticketsApi.getById(ticketId);
      setTicket(ticketRes);
      setComments(ticketRes.comments || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (isAdmin || isTechnician) {
      ticketSettingsApi.getAvailableUsers().then(setAvailableUsers).catch(console.error);
      ticketSettingsApi.getCategories().then(setCategories).catch(console.error);
      ticketSettingsApi.getIssueTypes().then(setIssueTypes).catch(console.error);
      ticketSettingsApi.getEscalationFocals().then(setEscalationFocals).catch(console.error);
    }
  }, [ticketId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      if (photoUri) {
         const formData = new FormData();
         formData.append('comment', newComment || 'Attached an image');
         formData.append('isInternal', 'false');
         const fileType = photoUri.substring(photoUri.lastIndexOf('.') + 1);
         formData.append('attachment', {
            uri: photoUri,
            name: `photo.${fileType}`,
            type: `image/${fileType}`
         } as any);
         await ticketsApi.addComment(ticketId, formData as any, false, true); 
      } else {
         await ticketsApi.addComment(ticketId, newComment, false, false);
      }
      setNewComment('');
      setPhotoUri(null);
      fetchData(); // Refresh comments
    } catch (e) {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'assigned': return '#ed6c02';
      case 'in_progress': return '#0288d1';
      case 'resolved': return '#2e7d32';
      case 'closed': return '#757575';
      default: return '#757575';
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" />;
  }

  if (!ticket) {
    return <Text style={{ textAlign: 'center', marginTop: 40 }}>Ticket not found.</Text>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Title style={{ flex: 1, fontWeight: 'bold' }}>{ticket.title}</Title>
              <Chip mode="flat" textStyle={{ color: 'white' }} style={[styles.chip, { backgroundColor: getStatusColor(ticket.status) }]}>
                {ticket.status === 'open' ? 'ASSIGNED' : ticket.status.replace('_', ' ').toUpperCase()}
              </Chip>
            </View>
            <Text variant="labelMedium" style={{ color: 'gray', marginBottom: 16 }}>
              {ticket.ticketNumber} • Created {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>

            <Divider style={{ marginVertical: 8 }} />
            
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 8 }}>Description</Text>
            <Paragraph style={{ marginTop: 8 }}>{ticket.description}</Paragraph>

            <Divider style={{ marginVertical: 16 }} />

            <View style={styles.metaRow}>
              <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>Priority:</Text>
              <Text>{ticket.priority}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>Type:</Text>
              <Text>{(ticket.ticketType || '').replace('_', ' ').toUpperCase()}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>Category:</Text>
              <Text>{ticket.category?.name || 'N/A'}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>Issue Type:</Text>
              <Text>{ticket.issueType?.name || 'N/A'}</Text>
            </View>

            {/* Admin Actions */}
            {(isAdmin || isTechnician) && (
              <View style={styles.actionsContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Admin Actions</Text>
                  <Button mode="text" compact onPress={() => setEditModalVisible(true)}>Edit Details</Button>
                </View>
                <View style={styles.actionButtons}>
                  <Button mode="outlined" style={styles.actionBtn} onPress={() => setAssignModalVisible(true)}>Assign</Button>
                  <Button mode="outlined" style={styles.actionBtn} onPress={() => setEscalateModalVisible(true)}>Escalate</Button>
                  <Button mode="outlined" style={styles.actionBtn} onPress={() => setStatusModalVisible(true)}>Update Status</Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Comments Section */}
        <Title style={{ marginTop: 24, marginBottom: 8 }}>Comments</Title>
        
        {comments.map((comment: any) => (
          <Card key={comment.id} style={styles.commentCard}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Avatar.Text size={32} label={comment.author?.firstName?.[0] || 'U'} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ fontWeight: 'bold' }}>{comment.author?.firstName || 'User'} {comment.author?.lastName || ''}</Text>
                  <Text variant="bodySmall" style={{ color: 'gray' }}>{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</Text>
                </View>
              </View>
                <Paragraph>{comment.comment || comment.content}</Paragraph>
                {comment.attachmentPath && (
                  <View style={{ marginTop: 8 }}>
                    <Image 
                      source={{ 
                        uri: `${api.defaults.baseURL}/tickets/comment-attachment/${ticketId}/${comment.attachmentPath.split('/').pop()}`,
                        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
                      }} 
                      style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 4 }} 
                      resizeMode="contain" 
                    />
                  </View>
                )}
            </Card.Content>
          </Card>
        ))}

        {/* Add Comment */}
        <Card style={[styles.commentCard, { marginBottom: 40 }]}>
          <Card.Content>
            {photoUri && (
              <View style={{ marginBottom: 12, position: 'relative' }}>
                <Image source={{ uri: photoUri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                <IconButton 
                  icon="close-circle" 
                  size={20} 
                  iconColor="red" 
                  style={{ position: 'absolute', top: -10, left: 75, backgroundColor: 'white' }} 
                  onPress={() => setPhotoUri(null)} 
                />
              </View>
            )}
            <View style={styles.commentInputWrapper}>
              <TextInput
                style={styles.commentInput}
                multiline
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
              />
              <View style={{ flexDirection: 'row' }}>
                <IconButton icon="camera" size={20} onPress={takePhoto} />
                <IconButton icon="image" size={20} onPress={pickImage} />
              </View>
            </View>
            <Button 
              mode="contained" 
              onPress={handleAddComment} 
              loading={submittingComment}
              disabled={submittingComment || !newComment.trim()}
              style={{ marginTop: 12, alignSelf: 'flex-end' }}
            >
              Submit
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Edit Modal Component Rendered Inline for brevity in this step */}
      <EditTicketModal 
        visible={editModalVisible} 
        onDismiss={() => setEditModalVisible(false)} 
        ticket={ticket} 
        categories={categories}
        issueTypes={issueTypes}
        onSaved={() => { setEditModalVisible(false); fetchData(); }}
      />
      
      {/* Assign Modal */}
      <AssignModal 
        visible={assignModalVisible}
        onDismiss={() => setAssignModalVisible(false)}
        ticketId={ticketId}
        availableUsers={availableUsers}
        onSaved={() => { setAssignModalVisible(false); fetchData(); }}
      />
      
      {/* Escalate Modal */}
      <EscalateModal 
        visible={escalateModalVisible}
        onDismiss={() => setEscalateModalVisible(false)}
        ticketId={ticketId}
        focals={escalationFocals}
        onSaved={() => { setEscalateModalVisible(false); fetchData(); }}
      />
      
      {/* Status Modal */}
      <StatusModal 
        visible={statusModalVisible}
        onDismiss={() => setStatusModalVisible(false)}
        ticketId={ticketId}
        currentStatus={ticket.status}
        onSaved={() => { setStatusModalVisible(false); fetchData(); }}
      />
    </KeyboardAvoidingView>
  );
}

// --- Modals ---

function EditTicketModal({ visible, onDismiss, ticket, categories, issueTypes, onSaved }: any) {
  const [ticketType, setTicketType] = useState(ticket?.ticketType || 'it_support');
  const [categoryId, setCategoryId] = useState<string | null>(ticket?.category?.id || null);
  const [issueTypeId, setIssueTypeId] = useState<string | null>(ticket?.issueType?.id || null);
  
  const [loading, setLoading] = useState(false);
  const [activePicker, setActivePicker] = useState<'type' | 'category' | 'issue' | null>(null);

  useEffect(() => {
    if (visible) {
      setTicketType(ticket?.ticketType || 'it_support');
      setCategoryId(ticket?.category?.id || null);
      setIssueTypeId(ticket?.issueType?.id || null);
    }
  }, [visible, ticket]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await ticketsApi.updateTicket(ticket.id, {
        ticketType,
        categoryId,
        issueTypeId
      });
      onSaved();
    } catch (e) {
      Alert.alert('Error', 'Failed to update ticket');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryName = categories.find((c: any) => c.id === categoryId)?.name || 'Select Category';
  const selectedIssueName = issueTypes.find((i: any) => i.id === issueTypeId)?.name || 'Select Issue Type';

  const types = [
    { value: 'it_support', label: 'IT SUPPORT' },
    { value: 'desktop_support', label: 'DESKTOP SUPPORT' },
    { value: 'pantawid_ict_support', label: 'PANTAWID ICT' }
  ];

  const filteredIssues = issueTypes.filter((i: any) => categoryId && (i.category?.id === categoryId || i.categoryId === categoryId));

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modalContainer, activePicker ? { maxHeight: '80%' } : undefined]}>
        {!activePicker ? (
          <View>
            <Title style={{ marginBottom: 16 }}>Edit Ticket Details</Title>
            
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Support Type</Text>
            <Button mode="outlined" onPress={() => setActivePicker('type')} style={{ marginBottom: 12 }}>{ticketType.replace('_', ' ').toUpperCase()}</Button>

            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Category</Text>
            <Button mode="outlined" onPress={() => setActivePicker('category')} style={{ marginBottom: 12 }}>{selectedCategoryName}</Button>

            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Issue Type</Text>
            <Button mode="outlined" onPress={() => {
                if (!categoryId) Alert.alert('Notice', 'Please select a category first.');
                else setActivePicker('issue');
            }} style={{ marginBottom: 24 }}>{selectedIssueName}</Button>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onPress={onDismiss} style={{ marginRight: 8 }}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={loading}>Save</Button>
            </View>
          </View>
        ) : (
          <View>
            <Title style={{ marginBottom: 16 }}>Select Option</Title>
            <ScrollView>
                {activePicker === 'type' && types.map(t => (
                    <Button key={t.value} mode="text" onPress={() => { setTicketType(t.value); setCategoryId(null); setIssueTypeId(null); setActivePicker(null); }}>{t.label}</Button>
                ))}
                {activePicker === 'category' && categories.filter((c:any) => {
                    if (ticketType === 'it_support') return c.isIt;
                    if (ticketType === 'desktop_support') return c.isDesktop;
                    if (ticketType === 'pantawid_ict_support') return c.isPantawid;
                    return true;
                }).map((c: any) => (
                    <Button key={c.id} mode="text" onPress={() => { setCategoryId(c.id); setIssueTypeId(null); setActivePicker(null); }}>{c.name}</Button>
                ))}
                {activePicker === 'issue' && filteredIssues.length === 0 && (
                    <Text style={{ textAlign: 'center', padding: 20 }}>No issue types for this category.</Text>
                )}
                {activePicker === 'issue' && filteredIssues.map((i: any) => (
                    <Button key={i.id} mode="text" onPress={() => { setIssueTypeId(i.id); setActivePicker(null); }}>{i.name}</Button>
                ))}
            </ScrollView>
            <Button onPress={() => setActivePicker(null)} style={{ marginTop: 16 }}>Cancel</Button>
          </View>
        )}
      </Modal>
    </Portal>
  );
}

function AssignModal({ visible, onDismiss, ticketId, onSaved }: any) {
  const [userId, setUserId] = useState<number | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (visible) {
          ticketsApi.getTechnicians().then(setTechnicians).catch(() => {});
      }
  }, [visible]);

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await ticketsApi.assign(ticketId, userId);
      onSaved();
    } catch (e) {
      Alert.alert('Error', 'Failed to assign ticket');
    } finally {
      setLoading(false);
    }
  };

  const selectedName = technicians.find((u: any) => u.id === userId)?.firstName || 'Select Technician';

  return (
    <Portal>
      <Modal visible={visible && !pickerVisible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <Title style={{ marginBottom: 16 }}>Assign Ticket</Title>
        <Button mode="outlined" onPress={() => setPickerVisible(true)} style={{ marginBottom: 24 }}>{selectedName}</Button>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button onPress={onDismiss} style={{ marginRight: 8 }}>Cancel</Button>
          <Button mode="contained" onPress={handleSave} loading={loading} disabled={!userId}>Assign</Button>
        </View>
      </Modal>
      
      <Modal visible={pickerVisible} onDismiss={() => setPickerVisible(false)} contentContainerStyle={[styles.modalContainer, { maxHeight: '80%' }]}>
        <Title style={{ marginBottom: 16 }}>Select Technician</Title>
        <ScrollView>
            {technicians.map((u: any) => (
                <Button key={u.id} mode="text" onPress={() => { setUserId(u.id); setPickerVisible(false); }}>
                    {u.firstName} {u.lastName || ''}
                </Button>
            ))}
        </ScrollView>
        <Button onPress={() => setPickerVisible(false)} style={{ marginTop: 16 }}>Cancel</Button>
      </Modal>
    </Portal>
  );
}

function StatusModal({ visible, onDismiss, ticketId, currentStatus, onSaved }: any) {
  const [status, setStatus] = useState(currentStatus);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await ticketsApi.updateTicket(ticketId, { status });
      onSaved();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <Title style={{ marginBottom: 16 }}>Update Status</Title>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setMenuVisible(true)} style={{ marginBottom: 24 }}>{status.replace('_', ' ').toUpperCase()}</Button>}
        >
          <Menu.Item onPress={() => { setStatus('open'); setMenuVisible(false); }} title="ASSIGNED" />
          <Menu.Item onPress={() => { setStatus('in_progress'); setMenuVisible(false); }} title="IN PROGRESS" />
          <Menu.Item onPress={() => { setStatus('resolved'); setMenuVisible(false); }} title="RESOLVED" />
          <Menu.Item onPress={() => { setStatus('closed'); setMenuVisible(false); }} title="CLOSED" />
        </Menu>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button onPress={onDismiss} style={{ marginRight: 8 }}>Cancel</Button>
          <Button mode="contained" onPress={handleSave} loading={loading}>Update</Button>
        </View>
      </Modal>
    </Portal>
  );
}

function EscalateModal({ visible, onDismiss, ticketId, focals, onSaved }: any) {
  const [escalatedToFocalId, setEscalatedToFocalId] = useState<number | null>(null);
  const [justification, setJustification] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!escalatedToFocalId || !justification.trim()) {
      Alert.alert('Validation', 'Focal and Justification are required.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('escalatedToFocalId', escalatedToFocalId.toString());
      formData.append('justification', justification);
      
      if (photoUri) {
        const fileType = photoUri.substring(photoUri.lastIndexOf('.') + 1);
        formData.append('proofFiles', {
          uri: photoUri,
          name: `proof.${fileType}`,
          type: `image/${fileType}`
        } as any);
      }
      
      await ticketsApi.escalate(ticketId, formData);
      onSaved();
    } catch (e) {
      Alert.alert('Error', 'Failed to escalate ticket');
    } finally {
      setLoading(false);
    }
  };

  const selectedName = focals.find((f: any) => f.id === escalatedToFocalId)?.label || 'Select Focal (e.g. IT Head)';

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modalContainer, menuVisible ? { maxHeight: '80%' } : undefined]}>
        <Title style={{ marginBottom: 16 }}>Escalate Ticket</Title>
        
        {!menuVisible ? (
          <View>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Select Focal</Text>
            <Button mode="outlined" onPress={() => setMenuVisible(true)} style={{ marginBottom: 16 }}>{selectedName}</Button>
            
            <TextInput
              style={styles.commentInput}
              multiline
              placeholder="Justification for escalation..."
              value={justification}
              onChangeText={setJustification}
            />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8, flexWrap: 'wrap' }}>
              <Button icon="camera" mode="outlined" onPress={takePhoto} style={{ marginRight: 8, marginBottom: 8 }}>Camera</Button>
              <Button icon="image" mode="outlined" onPress={pickImage} style={{ marginBottom: 8 }}>Gallery</Button>
              {photoUri && <Text style={{ marginLeft: 8, color: 'green' }}>✓ Attached</Text>}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onPress={onDismiss} style={{ marginRight: 8 }}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={loading} disabled={!escalatedToFocalId || !justification.trim()}>Escalate</Button>
            </View>
          </View>
        ) : (
          <View>
            <Title style={{ marginBottom: 16 }}>Select Focal</Title>
            <ScrollView>
              {focals.map((f: any) => {
                const userName = f.user ? `${f.user.firstName} ${f.user.lastName || ''}` : 'Unknown User';
                return <Button key={f.id} mode="text" onPress={() => { setEscalatedToFocalId(f.id); setMenuVisible(false); }}>{`${f.label} (${userName})`}</Button>;
              })}
            </ScrollView>
            <Button onPress={() => setMenuVisible(false)} style={{ marginTop: 16 }}>Cancel</Button>
          </View>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  chip: {
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  actionsContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    marginRight: 8,
    marginBottom: 8,
  },
  commentCard: {
    marginBottom: 12,
    backgroundColor: 'white'
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingRight: 4
  },
  commentInput: {
    flex: 1,
    padding: 12,
    minHeight: 60,
    maxHeight: 120,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  }
});
