/**
 * Attendance Screen - Mobile
 * Quick check-in/out with GPS location tracking
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Text, ActivityIndicator, Chip } from 'react-native-paper';
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/api';

const AttendanceScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      }
    })();
  }, []);

  // Fetch today's attendance
  const { data: todayAttendance, isLoading } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: attendanceService.getTodayAttendance,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: attendanceService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      Alert.alert('Success', 'Checked in successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to check in');
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: attendanceService.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      Alert.alert('Success', 'Checked out successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to check out');
    },
  });

  const handleCheckIn = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Please enable location permission for check-in');
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});

    checkInMutation.mutate({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      device: 'mobile',
    });
  };

  const handleCheckOut = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Please enable location permission for check-out');
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});

    checkOutMutation.mutate({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      device: 'mobile',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isCheckedOut = todayAttendance?.check_out_time;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Today's Attendance
          </Text>

          <View style={styles.statusContainer}>
            {!isCheckedIn && !isCheckedOut && (
              <Chip icon="clock-outline" style={styles.chip}>
                Not Checked In
              </Chip>
            )}
            {isCheckedIn && (
              <Chip icon="clock-check" style={[styles.chip, styles.chipSuccess]}>
                Checked In
              </Chip>
            )}
            {isCheckedOut && (
              <Chip icon="check-all" style={[styles.chip, styles.chipInfo]}>
                Checked Out
              </Chip>
            )}
          </View>

          <View style={styles.timeContainer}>
            <View style={styles.timeBox}>
              <Text variant="labelLarge">Check In</Text>
              <Text variant="headlineMedium">{formatTime(todayAttendance?.check_in_time)}</Text>
            </View>
            <View style={styles.timeBox}>
              <Text variant="labelLarge">Check Out</Text>
              <Text variant="headlineMedium">{formatTime(todayAttendance?.check_out_time)}</Text>
            </View>
          </View>

          {todayAttendance?.work_hours && (
            <View style={styles.hoursContainer}>
              <Text variant="bodyLarge">
                Work Hours: {todayAttendance.work_hours.toFixed(2)} hrs
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!isCheckedIn && !isCheckedOut && (
              <Button
                mode="contained"
                onPress={handleCheckIn}
                loading={checkInMutation.isPending}
                disabled={checkInMutation.isPending}
                icon="login"
                style={styles.button}
              >
                Check In
              </Button>
            )}

            {isCheckedIn && !isCheckedOut && (
              <Button
                mode="contained"
                onPress={handleCheckOut}
                loading={checkOutMutation.isPending}
                disabled={checkOutMutation.isPending}
                icon="logout"
                style={styles.button}
                buttonColor="#f44336"
              >
                Check Out
              </Button>
            )}
          </View>

          {location && (
            <View style={styles.locationContainer}>
              <Text variant="bodySmall" style={styles.locationText}>
                📍 Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">This Week</Text>
          <Text variant="bodyLarge" style={styles.weekStats}>
            Days Present: 4/5
          </Text>
          <Text variant="bodyLarge" style={styles.weekStats}>
            Total Hours: 32.5 hrs
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  chip: {
    marginVertical: 8,
  },
  chipSuccess: {
    backgroundColor: '#4CAF50',
  },
  chipInfo: {
    backgroundColor: '#2196F3',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  timeBox: {
    alignItems: 'center',
  },
  hoursContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    marginVertical: 8,
  },
  locationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  locationText: {
    textAlign: 'center',
    color: '#666',
  },
  weekStats: {
    marginTop: 8,
  },
});

export default AttendanceScreen;
