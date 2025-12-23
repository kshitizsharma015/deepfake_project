// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// User provided config
const firebaseConfig = {
    apiKey: "AIzaSyALE2_qkCetLVG9mXCVYShe3l9gqb-UkRA",
    authDomain: "deepfake-7d29a.firebaseapp.com",
    projectId: "deepfake-7d29a",
    storageBucket: "deepfake-7d29a.firebasestorage.app",
    messagingSenderId: "560036416500",
    appId: "1:560036416500:web:2e5372e565e5bd11f547a1",
    measurementId: "G-5X8C5YENQN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
