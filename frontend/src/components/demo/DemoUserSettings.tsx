import { useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, CardHeader, Chip, Grid, InputAdornment, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { APP_COLOR_THEMES, APP_LAYOUT_PRESETS, AppColorTheme, AppLayoutPreset } from '@/lib/appearance';

const sampleProfile = {
  phoneNumber: '9000000000', sex: 'Prefer not to say', unit: 'Demo Unit',
  position: 'Staff', positionFull: 'Demo Staff', designation: '',
};
const profileKey = 'demo-requester-profile';

function loadProfile() {
  try {
    const value = JSON.parse(sessionStorage.getItem(profileKey) ?? 'null');
    return value && typeof value === 'object' ? { ...sampleProfile, ...value } as typeof sampleProfile : sampleProfile;
  } catch {
    return sampleProfile;
  }
}

export default function DemoUserSettings() {
  const [form, setForm] = useState(loadProfile);
  const { mode, colorTheme, layoutPreset, setAppearance } = useThemeMode();
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">Settings</Typography>
      <Tabs value={0} aria-label="Settings sections"><Tab label="Profile & Preferences" /></Tabs>
      <WorkspaceLayout kind="settings">
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack spacing={1} alignItems="center" py={1}>
                <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main' }}>DU</Avatar>
                <Typography variant="h6">Demo User</Typography>
                <Chip label={form.unit} size="small" />
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Profile Information" subheader="Edit sample contact, unit and position details for the presentation." />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField label="Phone Number" value={form.phoneNumber} fullWidth
                  onChange={event => setForm({ ...form, phoneNumber: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">+63</InputAdornment> }}
                  inputProps={{ inputMode: 'numeric', maxLength: 10 }} /></Grid>
                <Grid item xs={12} md={4}><TextField select label="Sex" value={form.sex} fullWidth onChange={event => setForm({ ...form, sex: event.target.value })}>
                  {['Male', 'Female', 'Other', 'Prefer not to say'].map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Unit/Section" value={form.unit} fullWidth onChange={event => setForm({ ...form, unit: event.target.value })}>
                  {['Demo Unit', 'Demo Operations'].map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField></Grid>
                {([{ key: 'position', label: 'Position', size: 4 }, { key: 'positionFull', label: 'Position Full', size: 8 },
                  { key: 'designation', label: 'Designation', size: 12 }] as const).map(field =>
                  <Grid item xs={12} md={field.size} key={field.key}>
                    <TextField label={field.label} value={form[field.key]} fullWidth
                      onChange={event => setForm({ ...form, [field.key]: event.target.value })} inputProps={{ maxLength: 100 }} />
                  </Grid>
                )}
              </Grid>
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button variant="contained" disabled={form.phoneNumber.length !== 10} onClick={() => {
                  try {
                    sessionStorage.setItem(profileKey, JSON.stringify(form));
                    enqueueSnackbar('Demo profile saved for this browser session.', { variant: 'success' });
                  } catch {
                    enqueueSnackbar('Could not save the demo profile for this session.', { variant: 'error' });
                  }
                }}>Save Profile Information</Button>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Appearance & Workspace" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField select label="Color Mode" fullWidth value={mode}
                  onChange={event => setAppearance({ mode: event.target.value as 'light' | 'dark', colorTheme, layoutPreset })}>
                  <MenuItem value="light">Light</MenuItem><MenuItem value="dark">Dark</MenuItem>
                </TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Color Theme" fullWidth value={colorTheme}
                  onChange={event => setAppearance({ mode, colorTheme: event.target.value as AppColorTheme, layoutPreset })}>
                  {APP_COLOR_THEMES.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Layout Preset" fullWidth value={layoutPreset}
                  onChange={event => setAppearance({ mode, colorTheme, layoutPreset: event.target.value as AppLayoutPreset })}>
                  {APP_LAYOUT_PRESETS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </TextField></Grid>
              </Grid>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Change Password" subheader="The presentation shows the fields without collecting passwords." />
            <CardContent>
              <Stack spacing={2}>
                {['Current Password', 'New Password', 'Confirm New Password'].map(label =>
                  <TextField key={label} label={label} disabled type="password" fullWidth />,
                )}
                <Box><Button variant="contained" disabled>Update Password</Button></Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </WorkspaceLayout>
    </Stack>
  );
}
