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
            const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'profile_images' });
            const isImageAbusive = await checkImageForAbuse(result.secure_url);
            if (isImageAbusive) {
                return res.status(400).json({ message: "Inappropriate content detected in profile image", status: 400 });
            }
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
  const { email } = req.body;
  try {
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

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `${req.protocol}://${req.get('host')}/api/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.GMAIL,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
             <p>Please click on the following link, or paste this into your browser to complete the process:</p>
             <p><a href="${resetLink}">${resetLink}</a></p>
             <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    });

    res.status(200).json({ message: 'Password reset email sent' });
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

    // Reset attempts and unlock account
    user.textVerificationAttempts = 0;
    user.textVerificationLockedUntil = undefined;
    user.textVerificationCode = undefined;
    user.textVerificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully', status: 200 });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



const updateAccountDetails = async (req, res) => {
  const { username, firstName, surname, email } = req.body;
  const userId = req.user.id; // Assuming user ID is available from authentication middleware
  let profileImage = null;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for duplicate username or email if they are being changed
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (firstName) user.firstName = firstName;
    if (surname) user.surname = surname;

    // Handle profile image upload and abuse check
    if (req.file) {
      const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'profile_images' });
      const isImageAbusive = await checkImageForAbuse(result.secure_url);
      if (isImageAbusive) {
        return res.status(400).json({ message: "Inappropriate content detected in profile image", status: 400 });
      }
      profileImage = result.secure_url;
    }

    await user.save();
    res.status(200).json({ message: 'Account details updated successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming user ID is available from authentication middleware
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optionally delete profile image from Cloudinary
        if (user.profileImageUrl) {
            const publicId = user.profileImageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        }

        await user.deleteOne();

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.status(200).json({ message: 'Password has been reset' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  sendTextVerificationCode,
  verifyTextCode,
  requestPasswordReset,
  resetPassword,
  updateAccountDetails,
  deleteAccount,
};