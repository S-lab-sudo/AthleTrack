require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchRoutes=require('./routes/matchRoutes')
const playerRoutes=require('./routes/playerRoutes')
const { log } = require('./utils/logger');

const app = express();

// Middleware
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());

// Database connection
const connectDB = async () => {
    try {
        log(`Connecting to MongoDB with URI: ${process.env.MONGO_URI}`);
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined');
        }
        await mongoose.connect(process.env.MONGO_URI);
        log('MongoDB connected successfully');
    } catch (error) {
        log(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/match',matchRoutes)
app.use('/api/player', playerRoutes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    log(`Server is running on port ${PORT}`);
});