// load the settings from .env (like JWT_SECRET) into process.env
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const path = require('path');
const requireLogin = require('./middleware/requireLogin');
const app = express();
const taskRoutes = require('./routes/tasks');

// read form data and JSON sent by the browser, and put it in req.body
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// read cookies sent by the browser and put them in req.cookies
app.use(cookieParser());

// serve everything in public/ (HTML, CSS, browser JS) as-is
app.use(express.static('public'));

// own routes (like POST /register)
app.use(authRoutes);

// task API: requireLogin runs first, so every task route knows who the user is
app.use('/api/tasks', requireLogin, taskRoutes);

// the dashboard is only sent if requireLogin lets the request through
app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// error handler: any error in a route ends up here instead of crashing the server
// Express knows this is an error handler because it has 4 parameters
app.use((err, req, res, next) => {
    // someone sent broken JSON
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({errors: [{message: 'Invalid request.'}]});
    }

    // anything else: log the details, but only show the user a general message
    console.error(err);
    res.status(500).json({errors: [{message: 'Something went wrong. Please try again.'}]});
});

// use the port from .env if there is one, otherwise 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});