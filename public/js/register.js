const form = document.querySelector('#register-form');
const errorBox = document.querySelector('#form-error');

const fields = {
    name: document.querySelector('#name'),
    email: document.querySelector('#email'),
    password: document.querySelector('#password'),
    confirmPassword: document.querySelector('#confirm-password'),
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // regex

let submittedOnce = false;
let lastShown = '';

function validate() {
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const password = fields.password.value;
    const confirmPassword = fields.confirmPassword.value;
    const errors = [];

    if (name === '')
        errors.push({ field: 'name', message: 'Please enter your name.' });
    else if (name.length > 50)
        errors.push({ field: 'name', message: 'Name must be 50 characters or fewer.' });

    if (email === '')
        errors.push({ field: 'email', message: 'Please enter your email.' });
    else if (email.length > 254 || !EMAIL_PATTERN.test(email))
        errors.push({ field: 'email', message: 'Please enter a valid email, like name@example.com.' });

    if (password === '')
        errors.push({ field: 'password', message: 'Please choose a password.' });
    else if (password.length < 8)
        errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });

    if (confirmPassword === '')
        errors.push({ field: 'confirmPassword', message: 'Please confirm your password.' });
    else if (confirmPassword !== password)
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });

    return errors;
}

function showErrors(errors) {
    const summary = errors.map((error) => error.message).join('|');
    if (summary === lastShown)
        return;
    lastShown = summary;

    // clear the old messages and red borders
    errorBox.replaceChildren();
    for (const input of Object.values(fields)) {
        input.removeAttribute('aria-invalid');
    }

    if (errors.length === 0)
        return;

    const list = document.createElement('ul');
    for (const error of errors) {
        const item = document.createElement('li');
        item.textContent = error.message;
        list.append(item);
        fields[error.field].setAttribute('aria-invalid', 'true');
    }
    errorBox.append(list);
}

form.addEventListener('submit', (event) => {
    submittedOnce = true;
    const errors = validate();
    showErrors(errors);

    if (errors.length > 0) {
        event.preventDefault();
        fields[errors[0].field].focus();
    }
});

form.addEventListener('input', () => {
    if (submittedOnce) showErrors(validate());
});