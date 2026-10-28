const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session'); 
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// 1. Session Setup
app.use(session({
    secret: 'chaithanya_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // <--- 24 ಗಂಟೆಗಳ ಕಾಲ ಲಾಗಿನ್ ಸೇವ್ ಆಗಿರಲು ಇದನ್ನು ಸೇರಿಸಿ
}));

// 2. MongoDB Connection
const dbURI = 'mongodb+srv://chethankumarm009_db_user:Chkm0309@cluster0.yhpufzr.mongodb.net/'; 

mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB ಯಶಸ್ವಿಯಾಗಿ ಕನೆಕ್ಟ್ ಆಗಿದೆ!'))
    .catch((err) => console.log('❌ MongoDB ಕನೆಕ್ಷನ್ ಎರರ್:', err));

// 3. Student Schema
const studentSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true },
    password: { type: String, required: true }
});
const Student = mongoose.model('Student', studentSchema);

// 4. Result Schema (userAnswers ಸೇರಿಸಲಾಗಿದೆ)
const resultSchema = new mongoose.Schema({
    studentEmail: { type: String, required: true },
    testName: { type: String, required: true },
    score: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    timeTaken: { type: String, required: true },
    attemptDate: { type: Date, default: Date.now }, 
    userAnswers: { type: Array } // <--- ಉತ್ತರಗಳಿಗಾಗಿ
});
const Result = mongoose.model('Result', resultSchema);

// 4.5. Contact Schema (ವಿದ್ಯಾರ್ಥಿಗಳ ಸಂದೇಶಗಳಿಗಾಗಿ)
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    submittedDate: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// 5. Sign Up Route
app.post('/signup', async (req, res) => {
    try {
        const newStudent = new Student({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        });
        await newStudent.save();
        res.send('<h2 style="color:green; text-align:center;">ಅಭಿನಂದನೆಗಳು! ಖಾತೆ ಸೃಷ್ಟಿಯಾಗಿದೆ.</h2><div style="text-align:center;"><a href="/login.html">ಈಗ ಲಾಗಿನ್ ಮಾಡಿ</a></div>');
    } catch (error) {
        res.send('ಕ್ಷಮಿಸಿ, ಡೇಟಾ ಸೇವ್ ಮಾಡುವಾಗ ಎರರ್ ಬಂದಿದೆ.');
    }
});

// 6. Login Route
app.post('/login', async (req, res) => {
    try {
        const checkUser = await Student.findOne({ email: req.body.email });
        if (checkUser && checkUser.password === req.body.password) {
            req.session.userEmail = checkUser.email;
            req.session.userName = checkUser.name;
            res.redirect('/test-dashboard.html');
        } else {
            res.send('<h2 style="color:red; text-align:center;">❌ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ!</h2><div style="text-align:center;"><a href="/login.html">ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ</a></div>');
        }
    } catch (error) {
        res.send('ಕ್ಷಮಿಸಿ, ಸರ್ವರ್ ಎರರ್.');
    }
});

// 7. Save Result Route (ಇದೀಗ ಕೇವಲ ಒಂದೇ ಬಾರಿ ಇದೆ!)
app.post('/save-result', async (req, res) => {
    console.log("ಫ್ರಂಟ್‌ಎಂಡ್‌ನಿಂದ ಬಂದ ಡೇಟಾ:", req.body); 

    if (!req.session.userEmail) return res.status(401).json({ message: 'ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ!' });
    
    try {
        const newResult = new Result({
            studentEmail: req.session.userEmail,
            testName: req.body.testName,
            score: req.body.score,
            maxMarks: req.body.maxMarks,
            timeTaken: req.body.timeTaken,
            attemptDate: new Date(),
            userAnswers: req.body.userAnswers 
        });
        
        await newResult.save();
        console.log("ಡೇಟಾಬೇಸ್‌ಗೆ ಯಶಸ್ವಿಯಾಗಿ ಸೇವ್ ಆಯಿತು!");
        res.json({ message: 'ಯಶಸ್ವಿಯಾಗಿ ಸೇವ್ ಆಗಿದೆ!', success: true });
    } catch (error) {
        console.error("ಡೇಟಾಬೇಸ್ ಸೇವ್ ಎರರ್:", error);
        res.status(500).json({ message: 'ಫಲಿತಾಂಶ ಸೇವ್ ಮಾಡುವಾಗ ಎರರ್.' });
    }
});

// 8. Get Results Route
app.get('/get-my-results', async (req, res) => {
    if (!req.session.userEmail) return res.status(401).send('Unauthorized');
    
    try {
        const myResults = await Result.find({ studentEmail: req.session.userEmail });
        res.json(myResults);
    } catch (error) {
        res.status(500).send('Error loading results');
    }
});
// ವಿದ್ಯಾರ್ಥಿ ಲಾಗಿನ್ ಆಗಿದ್ದಾರೆಯೇ ಎಂದು ಚೆಕ್ ಮಾಡಲು
app.get('/check-login', (req, res) => {
    if (req.session.userEmail) {
        res.json({ loggedIn: true, userName: req.session.userName });
    } else {
        res.json({ loggedIn: false });
    }
});

// ಲಾಗ್ ಔಟ್ (Logout) ಮಾಡಲು
app.get('/logout', (req, res) => {
    req.session.destroy(); // ಸೆಷನ್ ಅಳಿಸಿಹಾಕುವುದು
    res.redirect('/'); // ಮುಖಪುಟಕ್ಕೆ ಕಳುಹಿಸುವುದು
});

// Contact Us ಫಾರ್ಮ್‌ನಿಂದ ಸಂದೇಶ ಸ್ವೀಕರಿಸುವ ಲಾಜಿಕ್
app.post('/submit-contact', async (req, res) => {
    try {
        const newContact = new Contact({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message
        });
        await newContact.save();
        
        // ಸಂದೇಶ ತಲುಪಿದ ತಕ್ಷಣ ವಿದ್ಯಾರ್ಥಿಗೆ ತೋರಿಸುವ ಮೆಸೇಜ್
        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h2 style="color: #28a745;">✅ ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ!</h2>
                <p>ನಮ್ಮ ತಂಡ ಆದಷ್ಟು ಬೇಗ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುತ್ತದೆ.</p>
                <br>
                <a href="/index.html" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ</a>
            </div>
        `);
    } catch (error) {
        console.error("Contact Form Error:", error);
        res.send('<h2 style="color: red; text-align: center;">ಕ್ಷಮಿಸಿ, ಸಂದೇಶ ಕಳುಹಿಸುವಾಗ ದೋಷ ಉಂಟಾಗಿದೆ.</h2>');
    }
});

// 9. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`); 
});