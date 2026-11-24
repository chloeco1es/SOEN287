// load the settings from .env (like JWT_SECRET) into process.env
require('dotenv').config();

const express = require('express');
const authRoutes = require('./routes/auth');

const app = express();

// read form data and JSON sent by the browser, and put it in req.body
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// serve everything in public/ (HTML, CSS, browser JS) as-is
app.use(express.static('public'));

// own routes (like POST /register)
app.use(authRoutes);

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