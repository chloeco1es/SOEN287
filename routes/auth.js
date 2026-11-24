const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {readJSON, writeJSON} = require('../lib/store');
const jwt = require('jsonwebtoken');
const {validateRegistration, validateLogin} = require('../lib/validation');

const router = express.Router();

router.post('/register', async (req, res) => {
    // check the form data on the server (don't trust the browser alone)
    const {errors, values} = validateRegistration(req.body);
    if (errors.length > 0) {
        return res.status(400).json({errors}); // 400: bad input
    }

    // make sure nobody already registered with this email
    const users = await readJSON('users', []);
    const existingUser = users.find((user) => user.email === values.email);
    if (existingUser) {
        return res.status(409).json({ // 409: conflict; this already exists
            errors: [{field: 'email', message: 'An account with this email already exists.'}],
        });
    }

    // hash the password
    const passwordHash = await bcrypt.hash(values.password, 10);

    // add the new user to the list and save it
    users.push({
        id: crypto.randomUUID(),
        name: values.name,
        email: values.email,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),
    });
    await writeJSON('users', users);

    res.status(201).json({ok: true, redirect: '/login.html'}); // 201: created
});

router.post('/login', async (req, res) => {
    // check the form data on the server
    const {errors, values} = validateLogin(req.body);
    if (errors.length > 0) {
        return res.status(400).json({errors});
    }

    // find the user with this email
    const users = await readJSON('users', []);
    const user = users.find((user) => user.email === values.email);

    // same message whether the email or the password is wrong, so nobody can use this form to find out which emails have accounts
    const loginFailed = {errors: [{message: 'Incorrect email or password.'}]};

    if (!user) {
        return res.status(401).json(loginFailed); // 401: not logged in
    }

    // compare the typed password with the saved hash
    const passwordMatches = await bcrypt.compare(values.password, user.passwordHash);
    if (!passwordMatches) {
        return res.status(401).json(loginFailed);
    }

    // make a signed token that says "this is user <id>", valid for 2 hours
    const token = jwt.sign({userId: user.id}, process.env.JWT_SECRET, {expiresIn: '2h'});

    // store the token in a cookie the browser sends back automatically
    res.cookie('token', token, {
        httpOnly: true, // browser JavaScript can't read it
        sameSite: 'lax', // not sent when other sites post forms to this one
        secure: process.env.NODE_ENV === 'production', // HTTPS only once deployed
        maxAge: 2 * 60 * 60 * 1000, // 2 hours, in milliseconds
    });

    res.json({ok: true, redirect: '/dashboard'});
});

module.exports = router;