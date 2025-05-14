import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  type User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  Timestamp, 
  query, 
  orderBy, 
  where, 
  deleteDoc, 
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Perform checks for essential Firebase configuration variables
if (!firebaseConfigValues.apiKey) {
  throw new Error(
    "Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing. " +
    "Please ensure it is set in your .env file. " +
    "The application cannot connect to Firebase without it."
  );
}

if (!firebaseConfigValues.projectId) {
  throw new Error(
    "Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing. " +
    "Please ensure it is set in your .env file. " +
    "The application cannot connect to Firebase without it."
  );
}

const firebaseConfig: FirebaseOptions = firebaseConfigValues;

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const googleAuthProvider = new GoogleAuthProvider();

export { 
  app, 
  auth, 
  db, 
  storage, // Added storage to exports
  googleAuthProvider, 
  // Auth methods
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type FirebaseUser,
  // Firestore methods
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  Timestamp, 
  query, 
  orderBy, 
  where, 
  deleteDoc, 
  updateDoc,
  writeBatch,
};
