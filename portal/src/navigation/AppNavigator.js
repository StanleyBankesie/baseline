import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import LeaveScreen from '../screens/LeaveScreen';
import CompensationScreen from '../screens/CompensationScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GenericFeatureScreen from '../screens/GenericFeatureScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: Colors.brand[900],
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.brand[700],
        },
        headerTitleStyle: {
          color: '#FFF',
          fontSize: 17,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: Colors.bg.dark,
          borderTopColor: Colors.bg.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.secondary.DEFAULT,
        tabBarInactiveTintColor: Colors.bg.textMuted,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Leave') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Attendance') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Compensation') iconName = focused ? 'cash' : 'cash-outline';
          else if (route.name === 'Menu') iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'OmniSuite ESS' }} />
      <Tab.Screen name="Leave" component={LeaveScreen} options={{ title: 'Time & Leave' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance Clock' }} />
      <Tab.Screen name="Compensation" component={CompensationScreen} options={{ title: 'Payslips & Salary' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'Portal Menu' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.brand[900],
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.brand[700],
        },
        headerTitleStyle: {
          color: '#FFF',
          fontSize: 16,
          fontWeight: '700',
        },
        headerTintColor: Colors.secondary.DEFAULT,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen
        name="Documents"
        options={{ title: 'Official Documents' }}
        children={() => <GenericFeatureScreen title="Official Documents" icon="document-text" endpoint="/documents" emptyMsg="No official company documents uploaded yet." />}
      />
      <Stack.Screen
        name="Policies"
        options={{ title: 'Company Policies' }}
        children={() => <GenericFeatureScreen title="Company Policies" icon="book" endpoint="/policies" emptyMsg="No corporate policies published yet." />}
      />
      <Stack.Screen
        name="Training"
        options={{ title: 'Trainings & Certifications' }}
        children={() => <GenericFeatureScreen title="Assigned Training" icon="school" endpoint="/training" emptyMsg="No pending training modules." />}
      />
      <Stack.Screen
        name="Requests"
        options={{ title: 'HR Helpdesk & Requests' }}
        children={() => <GenericFeatureScreen title="HR Requests" icon="help-buoy" endpoint="/requests" emptyMsg="No active employee requests." />}
      />
      <Stack.Screen
        name="Notifications"
        options={{ title: 'Notifications' }}
        children={() => <GenericFeatureScreen title="Notification Center" icon="notifications" endpoint="/notifications" emptyMsg="No new notifications." />}
      />
      <Stack.Screen
        name="Security"
        options={{ title: 'Security Settings' }}
        children={() => <GenericFeatureScreen title="Account Security" icon="lock-closed" emptyMsg="Your account is secured with standard encryption." />}
      />
    </Stack.Navigator>
  );
}
