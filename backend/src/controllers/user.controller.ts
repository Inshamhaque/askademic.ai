import { Request, Response } from 'express';
import * as userService from '../services/userService.js';

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const result = await userService.signup({ name, email, password });
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      message: 'User created successfully',
      sessionToken: result.sessionToken,
      user: result.user
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await userService.signin({ email, password });
    
    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.status(200).json({
      message: 'Login successful',
      sessionToken: result.sessionToken,
      user: result.user
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const signout = async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token is required' });
    }

    await userService.signout(sessionToken);
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
