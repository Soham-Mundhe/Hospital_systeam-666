import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAEUC4eaL0FjbYXyw67w9z4CLXddONvJ2E",
    authDomain: "pesent666-a8949.firebaseapp.com",
    projectId: "pesent666-a8949",
    storageBucket: "pesent666-a8949.firebasestorage.app",
    messagingSenderId: "690539000065",
    appId: "1:690539000065:web:57f6b9c27b1ba2852c6b00",
    measurementId: "G-T73F0QSE06"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
