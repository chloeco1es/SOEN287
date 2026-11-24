const form = document.querySelector('#register-form');
const errorBox = document.querySelector('#form-error');

const fields = {
    name: document.querySelector('#name'),
    email: document.querySelector('#email'),
    password: document.querySelector('#password'),
    confirmPassword: document.querySelector('#confirm-password'),
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let submittedOnce = false; // only start live-checking after the first submit attempt
let lastMessages = ''; // the error messages currently on screen

// check the form in the browser and return a list of errors (empty list = all good)
// the server checks everything again, so the user gets instant feedback
function validate() {
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const password = fields.password.value;
    const confirmPassword = fields.confirmPassword.value;
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
        errors.push({field: 'email', message: 'Please enter a valid email, like name@example.com.'});
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

    return errors;
}

// show a list of errors in the error box and outline the bad fields in red
function showErrors(errors) {
    // if the messages haven't changed, don't redraw them
    const messages = errors.map((error) => error.message).join('|');
    if (messages === lastMessages)
        return;
    lastMessages = messages;

    // remove the old messages and red outlines
    errorBox.innerHTML = '';
    for (const input of Object.values(fields))
        input.removeAttribute('aria-invalid');

    if (errors.length === 0)
        return;

    const list = document.createElement('ul');
    for (const error of errors) {
        const item = document.createElement('li');
        item.textContent = error.message;
        list.append(item);

        // server errors like "something went wrong" don't belong to a field
        if (fields[error.field]) {
            fields[error.field].setAttribute('aria-invalid', 'true');
        }
    }
    errorBox.append(list);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop the browser's normal submit; send data independently
    submittedOnce = true;

    // check in the browser first
    const errors = validate();
    showErrors(errors);
    if (errors.length > 0) {
        fields[errors[0].field].focus(); // put the cursor in the first bad field
        return;
    }

    // send the form to the server
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: fields.name.value,
                email: fields.email.value,
                password: fields.password.value,
                confirmPassword: fields.confirmPassword.value,
            }),
        });
        const result = await response.json();

        // success: go to the login page
        // otherwise: show the server's errors
        if (response.ok) {
            window.location.href = result.redirect;
        }
        else {
            showErrors(result.errors);
        }
    }
    catch (err) {
        // the server couldn't be reached or sent back something that isn't JSON
        showErrors([{message: 'Something went wrong. Please try again.'}]);
    }
});

// after the first submit, re-check every time the user types
form.addEventListener('input', () => {
    if (submittedOnce) {
        showErrors(validate());
    }
});