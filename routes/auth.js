const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {readJSON, writeJSON} = require('../lib/store');
const {validateRegistration} = require('../lib/validation');

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

module.exports = router;