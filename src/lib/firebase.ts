
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile, // Added for updating Auth user profile
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
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Added Storage functions
import { getFunctions } from 'firebase/functions';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfigValues.apiKey || !firebaseConfigValues.projectId) {
  throw new Error(
    "Firebase API Key or Project ID is missing. " +
    "Please ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set in your .env file. " +
    "The application cannot connect to Firebase without them."
  );
}

const firebaseConfig: FirebaseOptions = firebaseConfigValues;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialize Firebase Storage
const functions = getFunctions(app); 

export { 
  app, 
  auth, 
  db, 
  storage, 
  functions, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile, // Export updateProfile for Auth
  type FirebaseUser,
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
  onSnapshot,
  // Export Storage functions if needed directly by components, though often wrapped
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL
};
