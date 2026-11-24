require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');

const app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(express.static('public'));
app.use(authRoutes);

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({errors: [{message: 'Invalid request.'}]});
    }
    console.error(err);
    res.status(500).json({errors: [{message: 'Something went wrong. Please try again.'}]});
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});