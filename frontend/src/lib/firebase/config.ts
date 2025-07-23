/**
 * Firebase Configuration for Engunity AI
 * Handles Firebase initialization and service connections
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4zK8ZUZ7kISL7wlBUR512fH-jbbPDpX8",
  authDomain: "engunity-6b76f.firebaseapp.com",
  databaseURL: "https://engunity-6b76f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "engunity-6b76f",
  storageBucket: "engunity-6b76f.firebasestorage.app",
  messagingSenderId: "338999975234",
  appId: "1:338999975234:web:dc4fedef9c01f398377cdb",
  measurementId: "G-LSN58XMV0H"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
let analytics: Analytics | null = null;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

// Initialize services with proper error handling
try {
  // Analytics (only in browser environment)
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }

  // Authentication
  auth = getAuth(app);
  
  // Firestore
  firestore = getFirestore(app);
  
  // Storage
  storage = getStorage(app);

  // Connect to emulators in development
  if (process.env.NODE_ENV === 'development') {
    // Only connect to emulators if not already connected
    if (!auth.config.emulator) {
      try {
        connectAuthEmulator(auth, "http://localhost:9099");
      } catch (error) {
        console.log('Auth emulator connection failed:', error);
      }
    }

    // Firestore emulator
    if (!firestore._settings?.host?.includes('localhost')) {
      try {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      } catch (error) {
        console.log('Firestore emulator connection failed:', error);
      }
    }

    // Storage emulator
    if (!storage._host?.includes('localhost')) {
      try {
        connectStorageEmulator(storage, 'localhost', 9199);
      } catch (error) {
        console.log('Storage emulator connection failed:', error);
      }
    }
  }

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

// Export Firebase services
export { 
  app as firebaseApp,
  analytics,
  auth,
  firestore,
  storage
};

// Export Firebase configuration for reference
export { firebaseConfig };

// Helper function to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
  return !!app && !!auth && !!firestore && !!storage;
};

// Firebase connection status
export const getFirebaseStatus = () => ({
  app: !!app,
  auth: !!auth,
  firestore: !!firestore,
  storage: !!storage,
  analytics: !!analytics,
  initialized: isFirebaseInitialized()
});