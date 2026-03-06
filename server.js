const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Siguraduhin na MONGO_URL ang gamit mo rito
const MONGO_URI = process.env.MONGO_URL;

if (!MONGO_URI) {
    console.error("ERROR: MONGO_URL is not defined in environment variables!");
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("SUCCESS: Connected to Cloud MongoDB!"))
    .catch(err => {
        console.error("DATABASE CONNECTION ERROR DETAILS:");
        console.error(err.message);
    });

// 3. DEFINE USER SCHEMA
const userSchema = new mongoose.Schema({
    name: String,
    descriptor: [Number], 
    logs: [{ 
        time: { type: Date, default: Date.now }, 
        type: { type: String, default: 'Time Log' } 
    }]
});

const User = mongoose.model('User', userSchema);

// HELPER FUNCTION: Face Matching logic
function getFaceDistance(desc1, desc2) {
    return Math.sqrt(desc1.reduce((sum, val, i) => sum + Math.pow(val - (desc2[i] || 0), 2), 0));
}

// 4. API ROUTE: Register
app.post('/register', async (req, res) => {
    try {
        const { name, descriptor } = req.body;
        const newUser = new User({ name, descriptor });
        await newUser.save();
        res.status(201).send({ message: "User registered successfully!" });
    } catch (err) {
        console.error("REGISTER ERROR:", err.message); // Lalabas ito sa Railway logs
        res.status(500).send({ message: "Error saving to database.", error: err.message });
    }
});

// 5. API ROUTE: Verify Face (Scan)
app.post('/verify-face', async (req, res) => {
    try {
        const { descriptor } = req.body;
        const users = await User.find();

        let bestMatch = null;
        let minDistance = 0.6; 

        users.forEach(user => {
            const distance = getFaceDistance(descriptor, user.descriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = user;
            }
        });

        if (bestMatch) {
            bestMatch.logs.push({ type: 'Time In/Out' });
            await bestMatch.save();
            res.status(200).send({ success: true, name: bestMatch.name });
        } else {
            res.status(404).send({ success: false, message: "Face not recognized." });
        }
    } catch (err) {
        console.error("VERIFY ERROR:", err.message);
        res.status(500).send({ message: "Server error during verification." });
    }
});

// 6. API ROUTE: View Logs
app.get('/logs/:identifier', async (req, res) => {
    try {
        const iden = req.params.identifier;
        const query = mongoose.Types.ObjectId.isValid(iden) 
            ? { _id: iden } 
            : { name: { $regex: new RegExp(iden, "i") } };

        const user = await User.findOne(query);

        if (!user) return res.status(404).send({ message: "User not found." });

        res.status(200).json({ name: user.name, id: user._id, logs: user.logs });
    } catch (err) {
        res.status(500).send({ message: "Error retrieving logs." });
    }
});

// 7. START SERVER
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

