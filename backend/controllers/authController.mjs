import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';

//Generate a JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
};

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
    const hashedEmailVerificationToken = hashVerificationToken(rawEmailVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    //Creating the new user
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      isEmailVerified: false,
      emailVerificationToken: hashedEmailVerificationToken,
      emailVerificationExpires: emailVerificationExpires,
      profile: {
        displayName: trimmedName
      }
    });

    //Once email is set up, we will send this url in the email
    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email/${rawEmailVerificationToken}`;

    //Once email is set up, remove verificationUrl from this return message
    return res.status(201).json({
      message: 'User registered successfully',
      verificationUrl,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.profile.displayName,
        isEmailVerified: user.isEmailVerified
      }
    });
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
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    //Check hashed token against the hashed tokens in the database
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: {$gt: new Date()}
    });

    if (!user){
      return res.status(400).json({
        message: 'Invalid or expired verification token.'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully. You can now log in.'
    });    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Internal server error. Please try again.'
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    // Always return the same response to avoid email enumeration
    const genericMessage =
      'If that email exists and still needs verification, a verification link has been sent.';

    if (!user || user.isEmailVerified) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = generateEmailVerificationToken();
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await user.save();

    const verificationUrl =
      `${process.env.BACKEND_URL}/api/auth/verify-email/${rawToken}`;

    // TODO: send verificationUrl by email here

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Internal server error. Please try again.'
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return (res.status(400).json({message: 'Please enter an email and/or password.'}));
    }

    const normalizedEmail = email?.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.profile.displayName
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Internal server error' });
  }
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

function isSymbol(char){
  //Is Punctuation or Symbol but not an emoji
  return /^[\p{P}\p{S}--\p{EPres}\p{ExtPict}]$/v.test(char)
}

const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashVerificationToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};