const form = document.querySelector('#login-form');
const errorBox = document.querySelector('#form-error');

const fields = {
    email: document.querySelector('#email'),
    password: document.querySelector('#password'),
};

let submittedOnce = false;

function validate() {
    const errors = [];

    if (fields.email.value.trim() === '') {
        errors.push({field: 'email', message: 'Please enter your email.'});
    }
    if (fields.password.value === '') {
        errors.push({field: 'password', message: 'Please enter your password.'});
    }

    return errors;
}

function showErrors(errors) {
    errorBox.innerHTML = '';
    for (const input of Object.values(fields)) {
        input.removeAttribute('aria-invalid');
    }

    if (errors.length === 0) {
        return;
    }

    const list = document.createElement('ul');
    for (const error of errors) {
        const item = document.createElement('li');
        item.textContent = error.message;
        list.append(item);

        if (fields[error.field]) {
            fields[error.field].setAttribute('aria-invalid', 'true');
        }
    }
    errorBox.append(list);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submittedOnce = true;

    const errors = validate();
    showErrors(errors);
    if (errors.length > 0) {
        fields[errors[0].field].focus();
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: fields.email.value,
                password: fields.password.value,
            }),
        });
        const result = await response.json();

        if (response.ok) {
            window.location.href = result.redirect;
        }
        else {
            showErrors(result.errors);
            fields.password.value = ''; // clear the password after a failed attempt
        }
    }
    catch (err) {
        showErrors([{message: 'Something went wrong. Please try again.'}]);
    }
});

form.addEventListener('input', () => {
    if (submittedOnce) {
        showErrors(validate());
    }
});