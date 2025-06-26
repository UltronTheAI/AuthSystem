const express = require('express');
const router = express.Router();
const { 
  registerWithEmailAndPassword, 
  signInWithEmail,
  sendPasswordReset,
  deleteAccount,
  logout
} = require('../utils/firebaseAuth');
const { getAuth, GoogleAuthProvider, signInWithCredential } = require("firebase/auth");
const { app } = require("../config/firebase");
const auth = getAuth(app);

// Email/Password Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await registerWithEmailAndPassword(email, password);
    res.status(201).json({ 
      message: 'Registration successful',
      user: {
        uid: user.uid,
        email: user.email
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Email/Password Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await signInWithEmail(email, password);
    res.status(200).json({ 
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email
      }
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Google Sign-In
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body; // Expecting the ID token from the frontend
    const googleCredential = GoogleAuthProvider.credential(credential);
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;
    res.status(200).json({
      message: 'Google sign-in successful',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Password Reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    await sendPasswordReset(email);
    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Account
router.post('/delete-account', async (req, res) => {
  try {
    // In a real application, you would verify the user's identity before deleting their account.
    // For example, re-authenticate them or require a password confirmation.
    const user = auth.currentUser; // Get the currently signed-in user
    if (!user) {
      return res.status(401).json({ message: 'No user signed in' });
    }
    await deleteAccount(user);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Sign Out
router.post('/logout', async (req, res) => {
  try {
    await logout();
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;