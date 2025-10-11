import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { LoadingSpinner } from './components';
import { authService } from './services/AuthService';
import { sqliteService } from './data/SQLiteService';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize SQLite database
        await sqliteService.initialize();
        
        // Check authentication state
        const user = authService.getCurrentUser();
        if (user) {
          // User is authenticated, app will navigate to Main
        } else {
          // User is not authenticated, app will show Auth screen
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <LoadingSpinner text="Initializing FamilyHub..." />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppNavigator />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
