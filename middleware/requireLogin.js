const jwt = require('jsonwebtoken');

// pages get redirected to the login page; API requests (from fetch) get a 401 JSON error instead
function sendToLogin(req, res) {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({errors: [{message: 'Please log in again.'}]});
    }
    return res.redirect('/login.html');
}

// runs before a protected route: only lets the request through if the user is logged in
function requireLogin(req, res, next) {
    const token = req.cookies.token;

    // no cookie: not logged in
    if (!token) {
        return sendToLogin(req, res);
    }

    try {
        // check the token's signature and expiry, throw an error if either is bad
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId; // later routes use this to find only this user's data
        next(); // all good, continue to the route
    }
    catch (err) {
        // token was fake, changed, or expired
        res.clearCookie('token');
        return sendToLogin(req, res);
    }
}

module.exports = requireLogin;