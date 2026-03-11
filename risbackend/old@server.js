const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Serve profile pictures from local storage
app.use('/uploads', express.static('uploads')); // 👈 Add this line

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', auditRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
