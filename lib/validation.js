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

// checks for YYYY-MM-DD (what <input type="date"> sends)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(text) {
    if (!DATE_PATTERN.test(text)) {
        return false;
    }
    // new Date() quietly turns "2026-02-30" into March 2, so check the date didn't change
    const date = new Date(text + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

function validateTask(body) {
    if (!body) {
        body = {};
    }

    const title = asString(body.title).trim();
    const dueDate = asString(body.dueDate).trim();
    const errors = [];

    if (title === '') {
        errors.push({field: 'title', message: 'Please enter a task.'});
    }
    else if (title.length > 100) {
        errors.push({field: 'title', message: 'Task cannot be longer than 100 characters.'});
    }

    // due date is optional, but if there is one it must be a real date
    if (dueDate !== '' && !isRealDate(dueDate)) {
        errors.push({field: 'dueDate', message: 'Please enter a valid date.'});
    }

    // done is optional, but if it was sent it must be true or false (not "yes", 1, etc.)
    if (body.done !== undefined && typeof body.done !== 'boolean') {
        errors.push({field: 'done', message: 'Invalid value for done.'});
    }

    return {
        errors,
        values: {
            title,
            dueDate: dueDate === '' ? null : dueDate,
            done: body.done === true,
        },
    };
}

module.exports = {validateRegistration, validateLogin, validateTask};