import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';
import emojiRegex from 'emoji-regex';
import transporter from '../utils/mailer.mjs';


//JWT Tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      type: 'access',
      tokenVersion: user.tokenVersion ?? 0
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '5m'}
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      type: 'refresh',
      tokenVersion: user.tokenVersion ?? 0
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'}
  );
};

const getRefreshCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, getRefreshCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    ...getRefreshCookieOptions(),
    maxAge: undefined
  });
};

const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

//Helper functions for validation

function isLowerCaseUnicode(char) {
  return /^\p{Ll}$/u.test(char);
}

function isUpperCaseUnicode(char) {
  return /^\p{Lu}$/u.test(char)
}

function isNumber(char){
  return /^\p{Nd}$/u.test(char)
}

const emojiRe = emojiRegex();

function isSymbol(char) {
  return /[\p{P}\p{S}]/u.test(char) && !emojiRe.test(char)
}

//Register a new user
export const registerUser = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({message: 'Email, password, and display name are required'});
    }

    //Password validation by backend
    if (password.length < 8) {
      return (res.status(400).json({message: 'Passwords must be at least 8 characters long.'}))
    }

    let flagSymbols = false;
    let flagNumber = false;
    let flagUpper = false;
    let flagLower = false;
    for (let i = 0; i < password.length; i++){
      if (!flagLower){
        if (isLowerCaseUnicode(password[i])) flagLower = true;
      }
      if (!flagUpper){
        if (isUpperCaseUnicode(password[i])) flagUpper = true;
      }
      if (!flagNumber){
        if (isNumber(password[i])) flagNumber = true;
      }
      if (!flagSymbols){
        if (isSymbol(password[i])) flagSymbols = true;
      }

      if (flagLower && flagUpper && flagNumber && flagSymbols){
        break;
      }
    }

    if (!flagLower){
      return (res.status(400).json({message: 'Passwords must contain a lower case letter.'}));
    }
    if (!flagUpper){
      return (res.status(400).json({message: 'Passwords must contain an upper case letter.'}));
    }
    if (!flagNumber){
      return (res.status(400).json({message: 'Passwords must contain a number.'}));
    }
    if (!flagSymbols){
      return (res.status(400).json({message: 'Passwords must contain a symbol.'}));
    }
    

    //Preparing to add user
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = displayName.trim();

    //Ensuring there are no duplicates
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    //Hashing password and email verification token
    const passwordHash = await bcrypt.hash(password, 10);
    const rawEmailVerificationToken = generateEmailVerificationToken();
    const hashedEmailVerificationToken = hashToken(rawEmailVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    //Creating the new user
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      emailVerificationToken: hashedEmailVerificationToken,
      emailVerificationExpires: emailVerificationExpires,
      isEmailVerified: false,
      refreshTokenHash: null,
      refreshTokenExpires: null,
      tokenVersion: 0,
      profile: {
        displayName: trimmedName
      }
    });

    //Once email is set up, we will send this url in the email
    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email/${rawEmailVerificationToken}`;

    // Generate the verification email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Taskademia Account Email Verification",
      html: `
      <div style="font-family: Arial, sans-serif; text-align: center;">
        <h2>Welcome to Taskademia!</h2>
        <p>Click the button below to verify your account:</p>
        <a href="${verificationUrl}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
           Verify My Account
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If the button doesn't work, copy this link: <br>
          ${verificationUrl}
        </p>
      </div>
    `
    };

    // Send the email after generating it
    try {
      await transporter.sendMail(mailOptions);

      // Send the final success response here
      return res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: user._id,
          email: user.email,
          displayName: user.profile.displayName,
          isEmailVerified: user.isEmailVerified
        }
      });

    } catch (error) {
      console.error('Email delivery failed:', error);
      // Optional: Delete the user so they can try registering again
      // await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'User created, but verification email failed to send.' });
    }
  } catch (error) {
    console.error(error)

    if (error.code === 11000){
      return res.status(400).json({message: 'User already exists.'});
    }

    return res.status(500).json({message:"Internal server error. Please try again."});
  }
};

//Verifying user's email
export const verifyEmail = async (req, res) => {
  try{
    //Token received from URL accessed
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({message: 'Verification token is required.'});
    }

    //hash it
    const hashedToken = hashToken(token);

    //Check hashed token against the hashed tokens in the database
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: {$gt: Date.now()}
    });

    if (!user){
      return res.status(400).json({
        message: 'Invalid or expired verification token.'
      });
    }

    // update user status
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.status = 'active';

    //Save changes to database
    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully. You can now log in.'
    });    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Internal server error during verification.'
    });
  }
};

//To resend a verification email (like if it expired)
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    // Always return the same response to avoid giving away user identities
    const genericMessage = 'If that email exists and still needs verification, a verification link has been sent.';

    if (!user || user.isEmailVerified) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = generateEmailVerificationToken();
    const hashedToken = hashToken(rawToken);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    //Save changes to database
    await user.save();

    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email/${rawToken}`;

    // send verificationUrl by email here
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Taskademia Account Email Verification (Resend)",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>Verify your account</h2>
          <p>You requested a new verification link. Click below:</p>
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify My Account</a>
        </div>
      `
    };

    // Send the email after generating it
    try {
      await transporter.sendMail(mailOptions);
      // Return success response to the client
      return res.status(200).json({ message: genericMessage });
    } catch (error) {
      console.error('Email delivery failed:', error);
      // Optionally delete the created user or allow them to "resend"
      return res.status(500).json({ error: "Could not send verification email." });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


//Login for existing user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return (res.status(400).json({message: 'Please enter an email and/or password.'}));
    }

    //Search for user's email
    const normalizedEmail = email?.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    //If user is not found
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    //If user is not yet verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    //Does the stored hashed password match the password sent from frontend
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.profile.displayName
      },
      accessToken
    });
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const refreshAccessToken = async (req, res) =>{
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({message: 'Refresh token missing.'});
    }

    let decoded;

    try{
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(401).json({message: 'Invalid or expired refresh token.'});
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({message: 'Invalid token type.'});
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({message: 'User not found.'});
    }

    if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) {
      return res.status(401).json({message: 'Refresh token revoked.'});
    }

    if (!user.refreshTokenHash || !user.refreshTokenExpires) {
      return res.status(401).json({message: 'Refresh token not recognized.'});
    }

    if (user.refreshTokenExpires <= new Date()) {
      return res.status(401).json({ message: 'Stored refresh token expired' });
    }

    const incomingHash = hashToken(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      return res.status(401).json({ message: 'Refresh token mismatch' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshTokenHash = hashToken(newRefreshToken);
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();
    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({message: 'Internal server error.'});
  }
};

export const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.id);

        if (user) {
          user.refreshTokenHash = null;
          user.refreshTokenExpires = null;
          await user.save();
        }
      } catch {
        // ignore invalid cookie on logout
      }
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Optional: current user
export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.profile?.displayName
    }
  });
};