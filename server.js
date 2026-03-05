const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
// Dinagdagan natin ang limit dahil malaki ang face descriptor array
app.use(bodyParser.json({ limit: '50mb' }));

// 1. Connect to MongoDB
// Kapag i-deploy mo na, palitan ang localhost ng iyong MongoDB Atlas URI
mongoose.connect('mongodb://localhost:27017/attendanceDB')
    .then(() => console.log("Connected to MongoDB..."))
    .catch(err => console.error("Could not connect to MongoDB:", err));

// 2. Define User Schema
const userSchema = new mongoose.Schema({
    name: String,
    descriptor: [Number], // Array ng 128 face points
    logs: [{ 
        time: { type: Date, default: Date.now }, 
        type: { type: String, default: 'Time Log' } 
    }]
});

const User = mongoose.model('User', userSchema);

// HELPER FUNCTION: Euclidean Distance para sa face matching
function getFaceDistance(desc1, desc2) {
    return Math.sqrt(desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0));
}

// 3. API Route: Register
app.post('/register', async (req, res) => {
    try {
        const { name, descriptor } = req.body;
        const newUser = new User({ name, descriptor });
        await newUser.save();
        res.status(201).send({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).send({ message: "Error saving to database." });
    }
});

// 4. API Route: Verify Face (Para sa Scan Button)
app.post('/verify-face', async (req, res) => {
    try {
        const { descriptor } = req.body;
        const users = await User.find(); // Kunin lahat ng users sa database

        let bestMatch = null;
        let minDistance = 0.6; // Threshold: mas mababa sa 0.6 ay "Match"

        users.forEach(user => {
            const distance = getFaceDistance(descriptor, user.descriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = user;
            }
        });

        if (bestMatch) {
            // Mag-save ng bagong log para sa nakitang user
            bestMatch.logs.push({ type: 'Time In/Out' });
            await bestMatch.save();
            res.status(200).send({ success: true, name: bestMatch.name });
        } else {
            res.status(404).send({ success: false, message: "Face not recognized." });
        }
    } catch (err) {
        res.status(500).send({ message: "Server error during verification." });
    }
});

// 5. API Route: View Logs by ID or Name (Hiniling mong feature)
app.get('/logs/:identifier', async (req, res) => {
    try {
        const iden = req.params.identifier;
        
        // Hahanapin kung ang identifier ay valid MongoDB ID o Name
        const query = mongoose.Types.ObjectId.isValid(iden) 
            ? { _id: iden } 
            : { name: { $regex: new RegExp(iden, "i") } };

        const user = await User.findOne(query);

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        res.status(200).json({ name: user.name, id: user._id, logs: user.logs });
    } catch (err) {
        res.status(500).send({ message: "Error retrieving logs." });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
