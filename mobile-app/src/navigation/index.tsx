/**
 * Mobile Navigation Structure
 * Bottom tab navigation with stack navigators for each tab
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Dashboard' }} />
  </Stack.Navigator>
);

const AttendanceStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AttendanceHome" component={AttendanceScreen} options={{ title: 'Attendance' }} />
  </Stack.Navigator>
);

const LeaveStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="LeaveHome" component={LeaveScreen} options={{ title: 'Leave' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string = 'home';

        if (route.name === 'Dashboard') {
          iconName = 'view-dashboard';
        } else if (route.name === 'Attendance') {
          iconName = 'clock-check';
        } else if (route.name === 'Leave') {
          iconName = 'calendar-check';
        } else if (route.name === 'Profile') {
          iconName = 'account';
        }

        return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4CAF50',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    <Tab.Screen name="Attendance" component={AttendanceStack} />
    <Tab.Screen name="Leave" component={LeaveStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

const Navigation = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
