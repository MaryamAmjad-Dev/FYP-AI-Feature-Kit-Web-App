const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const nodemailer = require('nodemailer'); // Add this at the top

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'webai'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create users table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created or already exists');
    }
  });
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Insert new user
    const [result] = await db.promise().query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email and password
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error during login' });
  }
});

// Forgot Password endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email and new password are required.' });
  }
  try {
    // Update the user's password in the database
    const [result] = await db.promise().query(
      'UPDATE users SET password = ? WHERE email = ?',
      [newPassword, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Error updating password.' });
  }
});

// Endpoint to log feature usage
app.post('/api/feature-usage', async (req, res) => {
  const { userId, feature } = req.body;
  if (!userId || !feature) {
    return res.status(400).json({ success: false, message: 'Missing userId or feature' });
  }
  try {
    await db.promise().query(
      'INSERT INTO user_feature_usage (user_id, feature) VALUES (?, ?)',
      [userId, feature]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Feature usage log error:', error);
    res.status(500).json({ success: false, message: 'Error logging feature usage' });
  }
});

// GET all feature usage (for analytics or admin, not for regular users)
app.get('/api/feature-usage', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT ufu.id, ufu.feature, ufu.used_at, u.id as user_id, u.name, u.email
       FROM user_feature_usage ufu
       JOIN users u ON ufu.user_id = u.id
       ORDER BY ufu.used_at DESC`
    );
    res.json({ success: true, usage: rows });
  } catch (error) {
    console.error('Feature usage fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching feature usage' });
  }
});

// Contact/Feedback endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  try {
    // Save feedback to contact_messages table
    await db.promise().query(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );

    // (Optional) Email sending logic here...

    res.json({ success: true, message: 'Feedback sent and saved!' });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ success: false, message: 'Error sending feedback.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});