const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, deleteUser, signOut } = require("firebase/auth");
const { app } = require("../config/firebase"); // Assuming you export 'app' from firebase.js

const auth = getAuth(app);

// Email/Password Registration
const registerWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error registering with email and password:", error.message);
    throw error;
  }
};

// Email/Password Login
const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email and password:", error.message);
    throw error;
  }
};

// Google Sign-In
const signInWithGoogle = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Google Sign-In with popup is not supported in this environment.');
  }
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error.message);
    throw error;
  }
};

const sendPasswordReset = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

const deleteAccount = async (user) => {
  await deleteUser(user);
};

// Sign Out
const logout = async () => {
  await signOut(auth);
};

module.exports = {
  auth,
  registerWithEmailAndPassword,
  signInWithEmail,
  signInWithGoogle,
  logout,
};