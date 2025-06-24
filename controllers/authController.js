const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const transporter = require('../config/email');
const { checkTextForAbuse, checkImageForAbuse } = require('../utils/geminiAbuse');

const register = async (req, res) => {
    const { email, password, username, firstName, surname } = req.body;
    let profileImage = null;

    try {
        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: "Email or username already exists", status: 400 });
        }

        // Validate text content for abuse
        const isTextAbusive = await checkTextForAbuse(`${username} ${firstName} ${surname}`);
        if (isTextAbusive) {
            return res.status(400).json({ message: "Inappropriate content detected in user details", status: 400 });
        }

        // Handle profile image upload and abuse check
        if (req.file) {
            const imageBuffer = req.file.buffer;
            const isImageAbusive = await checkImageForAbuse(imageBuffer);
            if (isImageAbusive) {
                return res.status(400).json({ message: "Inappropriate content detected in profile image", status: 400 });
            }
            const result = await cloudinary.uploader.upload(req.file.path, { folder: 'profile_images' });
            profileImage = result.secure_url;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = jwt.sign({ email }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

        // Create new user
        user = new User({
            email,
            password: hashedPassword,
            username,
            firstName,
            surname,
            profileImage,
            verificationToken
        });

        await user.save();

        // Send verification email
        const verificationLink = `${req.protocol}://${req.get('host')}/api/verify?token=${verificationToken}`;
        await transporter.sendMail({
            from: process.env.GMAIL,
            to: email,
            subject: 'Verify Your Email',
            html: `<p>Please verify your email by clicking on this link: <a href="${verificationLink}">${verificationLink}</a></p>`
        });

        res.status(201).json({ message: "Registration successful. Please verify your email.", status: 201 });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user || !user.isVerified) {
            return res.status(401).json({ message: "Invalid credentials or unverified email", status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials or unverified email", status: 401 });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.status(200).json({ message: "Login successful", token, status: 200 });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token", status: 400 });
        }

        user.isVerified = true;
        user.verificationToken = undefined; // Remove the token after verification
        await user.save();

        res.status(200).json({ message: "Email verified successfully. You can now log in.", status: 200 });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const sendTextVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.textVerificationCode = code;
    user.textVerificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Text Verification Code',
      html: `<p>Your verification code is: <b>${code}</b></p><p>This code will expire in 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const verifyTextCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if account is locked due to too many attempts
    if (user.textVerificationLockedUntil && user.textVerificationLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.textVerificationLockedUntil - Date.now()) / (60 * 1000));
      return res.status(429).json({
        message: `Too many failed attempts. Please try again in ${minutesLeft} minutes`,
        status: 429
      });
    }

    // Check if code is valid
    if (user.textVerificationCode !== code) {
      // Increment attempts counter
      user.textVerificationAttempts += 1;
      
      // If too many attempts (5), lock the account for 30 minutes
      if (user.textVerificationAttempts >= 5) {
        user.textVerificationLockedUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
        user.textVerificationAttempts = 0; // Reset counter
        await user.save();
        return res.status(429).json({
          message: 'Too many failed attempts. Account locked for 30 minutes',
          status: 429
        });
      }
      
      await user.save();
      return res.status(400).json({
        message: 'Invalid verification code',
        attemptsLeft: 5 - user.textVerificationAttempts,
        status: 400
      });
    }

    // Check if code has expired
    if (user.textVerificationCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code has expired', status: 400 });
    }

    // Successful verification
    user.textVerificationCode = undefined;
    user.textVerificationCodeExpires = undefined;
    user.textVerificationAttempts = 0;
    user.isTextVerified = true;
    await user.save();

    res.status(200).json({ message: 'Text verification successful', status: 200 });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', status: 500 });
  }
};

const updateProfile = async (req, res) => {
    try {
        // Implement JWT authentication here
        // For now, assuming user is authenticated and user ID is available from req.user.id

        if (!req.file) {
            return res.status(400).json({ message: 'No profile image uploaded.' });
        }

        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'profile_images',
            width: 150,
            height: 150,
            crop: 'fill'
        });

        // Use Gemini API to check for abuse or sexual content
        const moderationResult = await checkImageForAbuse(result.secure_url);
        if (moderationResult) {
            // Optionally delete the uploaded image from Cloudinary if it's abusive
            await cloudinary.uploader.destroy(result.public_id);
            return res.status(400).json({ message: 'Image contains inappropriate content.' });
        }

        // Update user's profileImageUrl in MongoDB
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Optionally delete old image from Cloudinary
        if (user.profileImageUrl) {
            const publicId = user.profileImageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        }

        user.profileImageUrl = result.secure_url;
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', profileImageUrl: user.profileImageUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        // User ID is available from req.user.id due to auth middleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optionally delete profile image from Cloudinary
        if (user.profileImageUrl) {
            const publicId = user.profileImageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        }

        await user.remove();

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    verifyEmail,
    sendTextVerificationCode,
    verifyTextCode,
    updateProfile,
    deleteAccount
};