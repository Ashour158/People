import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Divider,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  TextFields as TextFieldsIcon,
  MotionPhotosOff as MotionPhotosOffIcon,
  ScreenReader as ScreenReaderIcon,
  Keyboard as KeyboardIcon,
  Focus as FocusIcon,
  ColorLens as ColorLensIcon,
  Settings as SettingsIcon,
  RestartAlt as RestartAltIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useAccessibility } from './AccessibilityProvider';

const AccessibilitySettings: React.FC = () => {
  const { settings, updateSettings, resetSettings, isAccessibilityMode } = useAccessibility();
  const [helpOpen, setHelpOpen] = useState(false);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
  };

  const handleReset = () => {
    resetSettings();
  };

  const getFontSizeValue = (fontSize: string) => {
    switch (fontSize) {
      case 'small': return 0;
      case 'medium': return 1;
      case 'large': return 2;
      case 'extra-large': return 3;
      default: return 1;
    }
  };

  const getFontSizeLabel = (value: number) => {
    switch (value) {
      case 0: return 'Small';
      case 1: return 'Medium';
      case 2: return 'Large';
      case 3: return 'Extra Large';
      default: return 'Medium';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 1 }} />
        <Typography variant="h5">Accessibility Settings</Typography>
        {isAccessibilityMode && (
          <Chip 
            label="Accessibility Mode" 
            color="primary" 
            size="small" 
            sx={{ ml: 2 }}
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Help">
          <IconButton onClick={() => setHelpOpen(true)}>
            <HelpIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Visual Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <VisibilityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Visual Settings</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.highContrast}
                    onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                  />
                }
                label="High Contrast Mode"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.largeText}
                    onChange={(e) => handleSettingChange('largeText', e.target.checked)}
                  />
                }
                label="Large Text"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.colorBlindSupport}
                    onChange={(e) => handleSettingChange('colorBlindSupport', e.target.checked)}
                  />
                }
                label="Color Blind Support"
              />
              
              <Box sx={{ mt: 3 }}>
                <Typography gutterBottom>Font Size</Typography>
                <Slider
                  value={getFontSizeValue(settings.fontSize)}
                  onChange={(_, value) => {
                    const fontSizeMap = ['small', 'medium', 'large', 'extra-large'];
                    handleSettingChange('fontSize', fontSizeMap[value as number]);
                  }}
                  min={0}
                  max={3}
                  step={1}
                  marks={[
                    { value: 0, label: 'Small' },
                    { value: 1, label: 'Medium' },
                    { value: 2, label: 'Large' },
                    { value: 3, label: 'XL' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={getFontSizeLabel}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Interaction Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <KeyboardIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Interaction Settings</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.keyboardNavigation}
                    onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
                  />
                }
                label="Enhanced Keyboard Navigation"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.focusIndicators}
                    onChange={(e) => handleSettingChange('focusIndicators', e.target.checked)}
                  />
                }
                label="Focus Indicators"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.screenReader}
                    onChange={(e) => handleSettingChange('screenReader', e.target.checked)}
                  />
                }
                label="Screen Reader Support"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.reducedMotion}
                    onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                  />
                }
                label="Reduce Motion"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Theme Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ColorLensIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Theme Settings</Typography>
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Actions</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<TextFieldsIcon />}
                  onClick={() => handleSettingChange('largeText', !settings.largeText)}
                >
                  Toggle Large Text
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleSettingChange('highContrast', !settings.highContrast)}
                >
                  Toggle High Contrast
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<MotionPhotosOffIcon />}
                  onClick={() => handleSettingChange('reducedMotion', !settings.reducedMotion)}
                >
                  Toggle Motion
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  color="secondary"
                >
                  Reset All Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Accessibility Status */}
        {isAccessibilityMode && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                Accessibility features are currently active. These settings help make the 
                application more accessible to users with disabilities.
              </Typography>
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md">
        <DialogTitle>Accessibility Help</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            These accessibility settings help make the application more usable for everyone, 
            including users with disabilities.
          </Typography>
          
          <Typography variant="h6" gutterBottom>Visual Settings</Typography>
          <Typography variant="body2" paragraph>
            • <strong>High Contrast Mode:</strong> Increases contrast between text and background colors
            • <strong>Large Text:</strong> Makes text larger and easier to read
            • <strong>Color Blind Support:</strong> Uses colors that are accessible to color-blind users
            • <strong>Font Size:</strong> Adjusts the overall text size in the application
          </Typography>
          
          <Typography variant="h6" gutterBottom>Interaction Settings</Typography>
          <Typography variant="body2" paragraph>
            • <strong>Enhanced Keyboard Navigation:</strong> Improves keyboard navigation and shortcuts
            • <strong>Focus Indicators:</strong> Shows clear focus indicators for keyboard navigation
            • <strong>Screen Reader Support:</strong> Optimizes the application for screen readers
            • <strong>Reduce Motion:</strong> Reduces or eliminates animations and transitions
          </Typography>
          
          <Typography variant="h6" gutterBottom>Theme Settings</Typography>
          <Typography variant="body2" paragraph>
            • <strong>Light Theme:</strong> Uses a light color scheme
            • <strong>Dark Theme:</strong> Uses a dark color scheme
            • <strong>Auto:</strong> Follows your system&apos;s theme preference
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccessibilitySettings;
