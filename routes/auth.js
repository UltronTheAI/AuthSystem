const express = require('express');
const multer = require('multer');
const { register, login, verifyEmail, sendTextVerificationCode, verifyTextCode, updateProfile, deleteAccount } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure the client sends the image file with the field name 'profileImage' for these routes.

router.post('/register', upload.single('profileImage'), register);
router.get('/verify', verifyEmail);
router.post('/login', login);
router.post('/text-verify', sendTextVerificationCode);
router.post('/verify-text', verifyTextCode);

router.put('/update-profile', auth, upload.single('profileImage'), updateProfile);

router.delete('/delete-account', auth, deleteAccount);

module.exports = router;
