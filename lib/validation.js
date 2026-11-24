// checks for text@text.text with no spaces
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// form values should be text. if it isn't, treat it as empty so .trim() can't crash
function asString(value) {
    if (typeof value === 'string') {
        return value;
    }
    return '';
}

function validateRegistration(body) {
    // if no data was sent at all, use an empty object so the checks below don't crash
    if (!body) {
        body = {};
    }

    const name = asString(body.name).trim();
    const email = asString(body.email).trim().toLowerCase();
    const password = asString(body.password);
    const confirmPassword = asString(body.confirmPassword);
    const errors = [];

    if (name === '') {
        errors.push({field: 'name', message: 'Please enter your name.'});
    }
    else if (name.length > 50) {
        errors.push({field: 'name', message: 'Name cannot be longer than 50 characters.'});
    }

    if (email === '') {
        errors.push({field: 'email', message: 'Please enter your email.'});
    }
    else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
        errors.push({field: 'email', message: 'Please enter a valid email (like name@example.com). Input cannot be longer than 254 characters.'});
    }

    if (password === '') {
        errors.push({field: 'password', message: 'Please choose a password.'});
    } 
    else if (password.length < 8) {
        errors.push({field: 'password', message: 'Password must be at least 8 characters.'});
    }

    if (confirmPassword === '') {
        errors.push({field: 'confirmPassword', message: 'Please confirm your password.'});
    }
    else if (confirmPassword !== password) {
        errors.push({field: 'confirmPassword', message: 'Passwords do not match.'});
    }

    return {errors, values: {name, email, password}};
}

function validateLogin(body) {
    if (!body) {
        body = {};
    }

    const email = asString(body.email).trim().toLowerCase();
    const password = asString(body.password);
    const errors = [];

    if (email === '') {
        errors.push({field: 'email', message: 'Please enter your email.'});
    }

    if (password === '') {
        errors.push({field: 'password', message: 'Please enter your password.'});
    }

    return {errors, values: {email, password}};
}

module.exports = {validateRegistration, validateLogin};