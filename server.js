require('dotenv').config();
const express = require('express');
const connectDB = require('./config/mongodb');
const firebase = require('./config/firebase');
const cors = require('cors');

// Connect to MongoDB
connectDB();

const app = express();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors({ origin: '*' }));

// Serve static files from the 'test' directory
// app.use(express.static('test'));

// Define Routes
// app.get('/', (req, res) => res.sendFile(__dirname + '/test/index.html'));
app.use('/api', require('./routes/auth'));
app.use('/v2/api', require('./routes/authV2'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));