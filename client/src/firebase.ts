import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyADLr-TwnkPshZXAm6nXg4ifFauWY-MA5k",
  authDomain: "campusmart-489520.firebaseapp.com",
  projectId: "campusmart-489520",
  storageBucket: "campusmart-489520.firebasestorage.app",
  messagingSenderId: "990290742199",
  appId: "1:990290742199:web:5e245741559dd2a6197632",
  measurementId: "G-7SP544H8TC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
