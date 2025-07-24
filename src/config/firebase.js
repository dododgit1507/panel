import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDz15tG8lKGGtFjz429orKu6FRmNXdTBpY",
  authDomain: "invitacion-stefan.firebaseapp.com",
  projectId: "invitacion-stefan",
  storageBucket: "invitacion-stefan.firebasestorage.app",
  messagingSenderId: "252044553728",
  appId: "1:252044553728:web:243c6e67c7b2e58bd9b2e5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);