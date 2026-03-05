const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. Connect to MongoDB (Replace with your Atlas URI)
mongoose.connect('mongodb://localhost:27017/attendanceDB');

// 2. Define User Schema
const userSchema = new mongoose.Schema({
    name: String,
    descriptor: Array, // Stores the 128 face points
    logs: [{ time: { type: Date, default: Date.now }, type: String }] // Time In/Out history
});

const User = mongoose.model('User', userSchema);

// 3. API Route: Register
app.post('/register', async (req, res) => {
    const { name, descriptor } = req.body;
    const newUser = new User({ name, descriptor });
    await newUser.save();
    res.send({ message: "User registered successfully!" });
});

// 4. API Route: Time In
app.post('/time-in', async (req, res) => {
    const { name } = req.body;
    await User.findOneAndUpdate({ name }, { $push: { logs: { type: 'Time In' } } });
    res.send({ message: `Time In recorded for ${name}` });
});

app.listen(3000, () => console.log('Server running on port 3000'));