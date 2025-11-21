// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk",
  authDomain: "bundling-63c10.firebaseapp.com",
  projectId: "bundling-63c10",
  storageBucket: "bundling-63c10.appspot.com",
  messagingSenderId: "201745088336",
  appId: "1:201745088336:web:c76c1f46364a8a072fb655",
  measurementId: "G-X0G5QE3TB1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
export { firestore, app };
