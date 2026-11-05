const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session'); 
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// 1. Session Setup
app.use(session({
    secret: 'chaithanya_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

// 2. MongoDB Connection
const dbURI = 'mongodb+srv://chethankumarm009_db_user:Chkm0309@cluster0.yhpufzr.mongodb.net/'; 

mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB ಯಶಸ್ವಿಯಾಗಿ ಕನೆಕ್ಟ್ ಆಗಿದೆ!'))
    .catch((err) => console.log('❌ MongoDB ಕನೆಕ್ಷನ್ ಎರರ್:', err));

// 3. Student Schema (ಇದೇ ನೀವು ವಿದ್ಯಾರ್ಥಿಗಳನ್ನು ಸೇವ್ ಮಾಡಲು ಬಳಸುತ್ತಿರುವ ಮಾಡೆಲ್)
const studentSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true },
    password: { type: String, required: true }
});
const Student = mongoose.model('Student', studentSchema);

// ಪ್ರಶ್ನೆಗಳ ಡೇಟಾಬೇಸ್ ವಿನ್ಯಾಸ
const questionSchema = new mongoose.Schema({
    testName: String, 
    q: String,        
    options: [String], 
    ans: Number,      
    explanation: String 
});
const Question = mongoose.model('Question', questionSchema);

// 1. ಟೆಸ್ಟ್ ಮಾಹಿತಿಯ ವಿನ್ಯಾಸ 
const testDetailSchema = new mongoose.Schema({
    testId: String, 
    title: String,  
    qCount: Number, 
    time: Number,   
    marks: Number   
});
const TestDetail = mongoose.model('TestDetail', testDetailSchema);

// 2. ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಎಲ್ಲಾ ಟೆಸ್ಟ್‌ಗಳ ಮಾಹಿತಿಯನ್ನು ಕಳುಹಿಸುವ API
app.get('/api/test-details', async (req, res) => {
    try {
        const tests = await TestDetail.find({}); 
        res.json({ success: true, tests: tests });
    } catch (error) {
        console.error("Test details fetch error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 4. Result Schema 
const resultSchema = new mongoose.Schema({
    studentEmail: { type: String, required: true },
    testName: { type: String, required: true },
    score: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    timeTaken: { type: String, required: true },
    attemptDate: { type: Date, default: Date.now }, 
    userAnswers: { type: Array } 
});
const Result = mongoose.model('Result', resultSchema);

// 4.5. Contact Schema 
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    submittedDate: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// ============================================
// 5. ಹೊಸ SIGN UP ಪ್ರಕ್ರಿಯೆ (OTP ಮತ್ತು WELCOME EMAIL)
// ============================================

// 5.1: ವಿದ್ಯಾರ್ಥಿ Sign Up ಮಾಡುವಾಗ OTP ಕಳುಹಿಸುವ API
app.post('/send-signup-otp', async (req, res) => {
    const { email } = req.body;
    
    // 1. ಈ ಇಮೇಲ್ ಐಡಿಯಿಂದ ಈಗಾಗಲೇ ಯಾರಾದರೂ ಅಕೌಂಟ್ ಮಾಡಿದ್ದಾರೆಯೇ ಎಂದು ಚೆಕ್ ಮಾಡುವುದು
    const existingStudent = await Student.findOne({ email: email });
    if (existingStudent) {
        return res.json({ success: false, message: "ಈ ಇಮೇಲ್ ಐಡಿ ಈಗಾಗಲೇ ರಿಜಿಸ್ಟರ್ ಆಗಿದೆ! ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಮಾಡಿ." });
    }

    // 2. 6-ಅಂಕಿಯ OTP ಸೃಷ್ಟಿ
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[email] = otp; // ನಾವು Forgot password ಗೆ ಬಳಸಿದ ಅದೇ ಸ್ಟೋರೇಜ್ ಬಳಸಬಹುದು

    const mailOptions = {
        from: 'support.ccacademy@gmail.com', // ನಿಮ್ಮ ಅಕಾಡೆಮಿ ಇಮೇಲ್
        to: email,
        subject: 'Email Verification OTP - Chaithanya Career Academy',
        text: `ನಮಸ್ಕಾರ,\n\nಹೊಸ ಖಾತೆ ಸೃಷ್ಟಿಸಲು ನಿಮ್ಮ OTP: ${otp} \n\nದಯವಿಟ್ಟು ಇದನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ OTP ಕಳುಹಿಸಲಾಗಿದೆ!" });
    } catch (error) {
        console.error("Signup OTP Error:", error);
        res.json({ success: false, message: "ಇಮೇಲ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ." });
    }
});

// 5.2: OTP ಪರಿಶೀಲಿಸಿ, ಡೇಟಾಬೇಸ್‌ಗೆ ಸೇವ್ ಮಾಡಿ, 'Welcome Email' ಕಳುಹಿಸುವ API
app.post('/verify-signup-otp', async (req, res) => {
    const { name, email, password, otp } = req.body;

    // 1. OTP ಸರಿಯಾಗಿದೆಯೇ ಎಂದು ಪರಿಶೀಲನೆ
    if (otpStorage[email] && otpStorage[email] === otp) {
        try {
            // 2. ಹೊಸ ವಿದ್ಯಾರ್ಥಿಯ ಮಾಹಿತಿಯನ್ನು MongoDB ಗೆ ಸೇವ್ ಮಾಡುವುದು
            const newStudent = new Student({
                name: name,
                email: email,
                password: password
            });
            await newStudent.save();
            
            delete otpStorage[email]; // ಕೆಲಸ ಮುಗಿದ ಮೇಲೆ OTP ಡಿಲೀಟ್ ಮಾಡಿ

            // 3. ಯಶಸ್ವಿಯಾಗಿ ಅಕೌಂಟ್ ಸೃಷ್ಟಿಯಾದ ನಂತರ 'Welcome Email' ಕಳುಹಿಸುವುದು (HTML ವಿನ್ಯಾಸದೊಂದಿಗೆ)
            const welcomeMailOptions = {
                from: 'support.ccacademy@gmail.com',
                to: email,
                subject: 'Welcome to Chaithanya Career Academy! 🎉',
                html: `
                    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #007bff;">ಸ್ವಾಗತ, ${name}! 🎉</h2>
                        <p>Chaithanya Career Academy ಗೆ ನಿಮ್ಮ ಖಾತೆ ಯಶಸ್ವಿಯಾಗಿ ಸೃಷ್ಟಿಯಾಗಿದೆ.</p>
                        <p>KSET ಮತ್ತು ಇತರ ಸ್ಪರ್ಧಾತ್ಮಕ ಪರೀಕ್ಷೆಗಳ ತಯಾರಿಗಾಗಿ ನಮ್ಮ Mock Test ಗಳನ್ನು ಇಂದೇ ಬಳಸಲು ಪ್ರಾರಂಭಿಸಿ.</p>
                        <br>
                        <a href="http://localhost:3000/login.html" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">ಈಗ ಲಾಗಿನ್ ಮಾಡಿ</a>
                        <br><br>
                        <p style="font-size: 12px; color: #777;">ಆಲ್ ದಿ ಬೆಸ್ಟ್,<br>Chaithanya Career Academy Team</p>
                    </div>
                `
            };

            await transporter.sendMail(welcomeMailOptions);

            res.json({ success: true, message: "ಅಭಿನಂದನೆಗಳು! ಖಾತೆ ಯಶಸ್ವಿಯಾಗಿ ಸೃಷ್ಟಿಯಾಗಿದೆ." });
        } catch (error) {
            console.error("Database Error:", error);
            res.json({ success: false, message: "ಡೇಟಾ ಸೇವ್ ಮಾಡುವಾಗ ದೋಷ ಉಂಟಾಗಿದೆ." });
        }
    } else {
        res.json({ success: false, message: "ನೀವು ನಮೂದಿಸಿದ OTP ತಪ್ಪಾಗಿದೆ!" });
    }
});

// 6. Login Route
app.post('/login', async (req, res) => {
    try {
        const checkUser = await Student.findOne({ email: req.body.email });
        if (checkUser && checkUser.password === req.body.password) {
            req.session.userEmail = checkUser.email;
            req.session.userName = checkUser.name;
            
            // ವಿದ್ಯಾರ್ಥಿ ಬಂದ ಪುಟಕ್ಕೆ (ಅಥವಾ ಮುಖಪುಟಕ್ಕೆ) ಕಳುಹಿಸುವ ಲಾಜಿಕ್
            const redirectTo = req.query.redirect || '/index.html'; 
            res.redirect(redirectTo);
        } else {
            res.send('<h2 style="color:red; text-align:center;">❌ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ!</h2><div style="text-align:center;"><a href="/login.html">ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ</a></div>');
        }
    } catch (error) {
        res.send('ಕ್ಷಮಿಸಿ, ಸರ್ವರ್ ಎರರ್.');
    }
});

// 7. Save Result Route 
app.post('/save-result', async (req, res) => {
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
    req.session.destroy(); 
    res.redirect('/'); 
});

// ನಿರ್ದಿಷ್ಟ ಟೆಸ್ಟ್‌ನ ಪ್ರಶ್ನೆಗಳನ್ನು ಪಡೆಯುವ API
app.get('/api/questions/:testName', async (req, res) => {
    try {
        const testName = req.params.testName;
        const questionsList = await Question.find({ testName: testName });
        res.json({ success: true, questions: questionsList });
    } catch (error) {
        console.error("Questions fetch error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
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

/* =======================================
   FORGOT PASSWORD & NODEMAILER SETUP 
======================================== */

// 1. ಇಮೇಲ್ ಕಳುಹಿಸಲು ಸೆಟಪ್ 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'support.ccacademy@gmail.com', // ನಿಮ್ಮ ಅಕಾಡೆಮಿಯ ಜಿಮೇಲ್ ಐಡಿ
        pass: 'rmfvorkmugbdsahn' // 16-ಅಕ್ಷರಗಳ App Password
    }
});

// 2. ತಾತ್ಕಾಲಿಕವಾಗಿ OTP ಸೇವ್ ಮಾಡಲು 
const otpStorage = {};

// 3. OTP ಸೃಷ್ಟಿಸಿ ಇಮೇಲ್‌ಗೆ ಕಳುಹಿಸುವ API
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    
    // ವಿದ್ಯಾರ್ಥಿಯ ಖಾತೆ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇದೆಯೇ ಎಂದು ಮೊದಲು ಚೆಕ್ ಮಾಡುವುದು
    const checkStudent = await Student.findOne({ email: email });
    if (!checkStudent) {
        return res.json({ success: false, message: "ಈ ಇಮೇಲ್ ಐಡಿಯಲ್ಲಿ ಯಾವುದೇ ಖಾತೆ ಇಲ್ಲ! ದಯವಿಟ್ಟು Sign Up ಮಾಡಿ." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[email] = otp; 

    const mailOptions = {
        from: 'support.ccacademy@gmail.com',
        to: email,
        subject: 'Password Reset OTP - Chaithanya Career Academy',
        text: `ನಮಸ್ಕಾರ,\n\nನಿಮ್ಮ ಖಾತೆಯ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಲು OTP: ${otp} \n\nದಯವಿಟ್ಟು ಇದನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.\n\nಧನ್ಯವಾದಗಳು,\nChaithanya Career Academy`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ OTP ಕಳುಹಿಸಲಾಗಿದೆ! (ದಯವಿಟ್ಟು Spam ಫೋಲ್ಡರ್ ಕೂಡ ಚೆಕ್ ಮಾಡಿ)" });
    } catch (error) {
        console.error("Email Error:", error);
        res.json({ success: false, message: "ಇಮೇಲ್ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ." });
    }
});

// 4. OTP ಪರಿಶೀಲಿಸಿ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಡೇಟಾಬೇಸ್‌ಗೆ ಸೇವ್ ಮಾಡುವ API
app.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (otpStorage[email] && otpStorage[email] === otp) {
      try {
            // *** ಇಲ್ಲಿ Student.updateOne ಬಳಸಲಾಗಿದೆ ***
            await Student.updateOne({ email: email }, { $set: { password: newPassword } });
            
            delete otpStorage[email]; 
            res.json({ success: true, message: "ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಗಿದೆ! ಈಗ ಲಾಗಿನ್ ಮಾಡಿ." });
        } catch (error) {
            console.error("Database Update Error:", error);
            res.json({ success: false, message: "ಡೇಟಾಬೇಸ್ ಎರರ್ ಸಂಭವಿಸಿದೆ." });
        }
    } else {
        res.json({ success: false, message: "ನೀವು ನಮೂದಿಸಿದ OTP ತಪ್ಪಾಗಿದೆ!" });
    }
});

// 1. Video Schema (ಮಂಗೋಡಿಬಿಯಲ್ಲಿ ವಿಡಿಯೋ ಸೇವ್ ಮಾಡಲು)
const videoSchema = new mongoose.Schema({
    title: String,
    videoId: String, // ಉದಾಹರಣೆಗೆ: YouTube ಲಿಂಕ್‌ನಲ್ಲಿ 'v=' ಮುಂದಿರುವ ಕೋಡ್ (ex: dQw4w9WgXcQ)
    category: String // ಉದಾಹರಣೆಗೆ: 'paper1', 'paper2', 'fda'
});
const Video = mongoose.model('Video', videoSchema);

// 2. Fetch Videos API (ಫ್ರಂಟ್‌ಎಂಡ್‌ಗೆ ವಿಡಿಯೋ ಕಳುಹಿಸಲು)
app.get('/api/videos', async (req, res) => {
    try {
        const category = req.query.category; 
        const videos = await Video.find({ category: category });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch videos" });
    }
});

// 3. Add Video API (ಅಡ್ಮಿನ್ ಪೇಜ್‌ನಿಂದ ವಿಡಿಯೋ ಸೇವ್ ಮಾಡಲು)
app.post('/api/add-video', async (req, res) => {
    try {
        const { title, url, category } = req.body;
        
        // YouTube ಲಿಂಕ್‌ನಿಂದ Video ID ತೆಗೆಯುವ ಲಾಜಿಕ್ (ಉದಾ: v=dQw4w9WgXcQ)
        let videoId = '';
        if (url.includes('v=')) {
            videoId = url.split('v=')[1].substring(0, 11);
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].substring(0, 11);
        }

        if (!videoId) {
            return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
        }

        const newVideo = new Video({ title, videoId, category });
        await newVideo.save();
        
        res.json({ success: true, message: 'Video saved successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error saving video' });
    }
});

// 4. ಎಲ್ಲಾ ವಿಡಿಯೋಗಳನ್ನು ಅಡ್ಮಿನ್ ಪೇಜ್‌ಗೆ ತರುವ API
app.get('/api/all-videos', async (req, res) => {
    try {
        const videos = await Video.find({}).sort({ _id: -1 }); // ಹೊಸ ವಿಡಿಯೋಗಳು ಮೊದಲು ಕಾಣಲು
        res.json({ success: true, videos: videos });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching videos" });
    }
});

// 5. ವಿಡಿಯೋ ಡಿಲೀಟ್ ಮಾಡುವ API
app.delete('/api/delete-video/:id', async (req, res) => {
    try {
        const videoId = req.params.id;
        await Video.findByIdAndDelete(videoId);
        res.json({ success: true, message: "ವಿಡಿಯೋ ಯಶಸ್ವಿಯಾಗಿ ಡಿಲೀಟ್ ಆಗಿದೆ!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "ಡಿಲೀಟ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ" });
    }
});

// 9. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`); 
});