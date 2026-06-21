const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ extended: false }));
app.use(helmet());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/kyu_hostel', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
// Routes
app.use('/api/users',   require('./routes/api/users'));
app.use('/api/auth',    require('./routes/api/auth'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/hostels', require('./routes/api/hostels'));
app.use('/api/upload', require('./routes/api/upload'));

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
