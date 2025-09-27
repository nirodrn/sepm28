// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB437jK903d6P-47Ig0TVlJg73EqDRGyV4",
  authDomain: "sepmzonline.firebaseapp.com",
  databaseURL: "https://sepmzonline-default-rtdb.firebaseio.com",
  projectId: "sepmzonline",
  storageBucket: "sepmzonline.firebasestorage.app",
  messagingSenderId: "948988754779",
  appId: "1:948988754779:web:1a09ac50084a8770c6f87e",
  measurementId: "G-NFVXRXS4X1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
export default firebaseConfig;