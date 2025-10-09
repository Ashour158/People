# HR Management System - Mobile App

## Overview

Cross-platform mobile application built with React Native and Expo for employee self-service.

## Features

### ✅ Implemented
- **Attendance Management**
  - Quick check-in/check-out with GPS location
  - View today's attendance status
  - Weekly attendance summary
  - Real-time location tracking
  
- **Navigation**
  - Bottom tab navigation
  - Stack navigation for each module
  - Material Design UI with React Native Paper

### 🚧 In Development
- Leave management
- Profile management
- Push notifications
- Offline mode
- Biometric authentication

## Tech Stack

- **Framework**: React Native 0.73 + Expo 50
- **Language**: TypeScript
- **UI Library**: React Native Paper (Material Design 3)
- **Navigation**: React Navigation v6
- **State Management**: TanStack Query (React Query)
- **API Client**: Axios
- **Location**: Expo Location
- **Notifications**: Expo Notifications
- **Secure Storage**: Expo Secure Store

## Project Structure

```
mobile-app/
├── src/
│   ├── screens/          # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── AttendanceScreen.tsx
│   │   ├── LeaveScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation configuration
│   │   └── index.tsx
│   ├── services/         # API services
│   │   └── api.ts
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── App.tsx              # App entry point
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Studio

### Installation

1. **Install dependencies**:
   ```bash
   cd mobile-app
   npm install
   ```

2. **Configure environment**:
   Create `.env` file:
   ```
   EXPO_PUBLIC_API_URL=http://your-api-url:8000/api/v1
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Run on device/simulator**:
   - iOS: Press `i` in terminal or `npm run ios`
   - Android: Press `a` in terminal or `npm run android`
   - Web: Press `w` in terminal or `npm run web`

### Running on Physical Device

1. Install Expo Go app from App Store or Play Store
2. Scan QR code from terminal
3. App will load on your device

## Key Features Implementation

### 1. Attendance Check-in with GPS

```typescript
// AttendanceScreen.tsx
const handleCheckIn = async () => {
  const location = await Location.getCurrentPositionAsync({});
  
  await attendanceService.checkIn({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    device: 'mobile',
  });
};
```

### 2. Offline Support (Coming Soon)

```typescript
// Store attendance locally when offline
const storeOfflineAttendance = async (data: AttendanceData) => {
  await AsyncStorage.setItem('pending_attendance', JSON.stringify(data));
};

// Sync when back online
const syncOfflineData = async () => {
  const pendingData = await AsyncStorage.getItem('pending_attendance');
  if (pendingData) {
    await api.post('/attendance/sync', JSON.parse(pendingData));
    await AsyncStorage.removeItem('pending_attendance');
  }
};
```

### 3. Push Notifications Setup

```typescript
// Request notification permissions
const { status } = await Notifications.requestPermissionsAsync();

// Register for push notifications
const token = await Notifications.getExpoPushTokenAsync();

// Handle notifications
Notifications.addNotificationReceivedListener(notification => {
  console.log('Notification received:', notification);
});
```

## API Integration

### Configuration

```typescript
// src/services/api.ts
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Service Pattern

```typescript
export const attendanceService = {
  getTodayAttendance: async () => {
    const { data } = await api.get('/attendance/today');
    return data;
  },
  checkIn: async (payload) => {
    const { data } = await api.post('/attendance/check-in', payload);
    return data;
  },
};
```

## State Management

Using TanStack Query for server state:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['attendance', 'today'],
  queryFn: attendanceService.getTodayAttendance,
});

const checkInMutation = useMutation({
  mutationFn: attendanceService.checkIn,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
  },
});
```

## Styling

Using React Native Paper theme:

```typescript
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4CAF50',
    secondary: '#2196F3',
  },
};
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Building for Production

### Android

```bash
# Build APK
eas build --platform android

# Build AAB for Play Store
eas build --platform android --profile production
```

### iOS

```bash
# Build IPA
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

## Deployment

### Using Expo EAS

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**:
   ```bash
   eas build:configure
   ```

3. **Build app**:
   ```bash
   eas build --platform all
   ```

4. **Submit to stores**:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

## Performance Optimization

- Use React.memo() for expensive components
- Implement FlatList for long lists
- Optimize images with proper compression
- Use Hermes JavaScript engine
- Enable ProGuard for Android
- Code splitting and lazy loading

## Security

- Store sensitive data in Expo Secure Store
- Use HTTPS for all API calls
- Implement certificate pinning
- Add biometric authentication
- Sanitize user inputs
- Implement rate limiting

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:
   ```bash
   expo start -c
   ```

2. **iOS simulator not found**:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app
   ```

3. **Android build fails**:
   ```bash
   cd android && ./gradlew clean
   ```

## Contributing

1. Follow React Native best practices
2. Use TypeScript for type safety
3. Write tests for new features
4. Update documentation

## Roadmap

- [ ] Biometric authentication (Face ID/Touch ID)
- [ ] Offline mode with sync
- [ ] Push notifications
- [ ] Document camera upload
- [ ] Team directory
- [ ] Expense submission
- [ ] Payslip viewing
- [ ] Performance reviews
- [ ] Training modules
- [ ] Employee surveys

## License

MIT License
