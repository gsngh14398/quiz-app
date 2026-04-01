// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZW80gLD7RznjhZMn5jku7Bzu81TJcLwU",
  authDomain: "quiz-app-1f8c6.firebaseapp.com",
  projectId: "quiz-app-1f8c6",
  storageBucket: "quiz-app-1f8c6.firebasestorage.app",
  messagingSenderId: "312950459654",
  appId: "1:312950459654:web:dc679714042fd3896aa287",
  measurementId: "G-9VHQDJGCTS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
