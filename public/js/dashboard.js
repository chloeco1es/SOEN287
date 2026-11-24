// elements from dashboard.html
const taskList = document.querySelector('#task-list');
const emptyMessage = document.querySelector('#empty-message');
const listError = document.querySelector('#list-error');

// the user's tasks, as last sent by the server
let tasks = [];

// build one <li> for one task
function createTaskItem(task) {
    const item = document.createElement('li');
    item.className = 'task';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title; // textContent, not innerHTML: "<script>" shows up as plain text
    item.append(title);

    // only show a due date if the task has one
    if (task.dueDate) {
        const due = document.createElement('time');
        due.className = 'task-due';
        due.dateTime = task.dueDate; // machine-readable date (i.e. 2026-12-01)
        due.textContent = 'Due ' + task.dueDate;
        item.append(due);
    }

    return item;
}

// redraw the whole list from the tasks array
function renderTasks() {
    taskList.innerHTML = ''; // remove the old items
    for (const task of tasks) {
        taskList.append(createTaskItem(task));
    }

    // hide "No tasks yet" when there is at least one task
    emptyMessage.hidden = tasks.length > 0;
}

// ask the server for this user's tasks
async function loadTasks() {
    listError.textContent = ''; // clear any old error

    try {
        const response = await fetch('/api/tasks');

        // login expired: requireLogin sent back 401, so go log in again
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        const result = await response.json();
        if (!response.ok) {
            listError.textContent = result.errors[0].message;
            return;
        }

        tasks = result.tasks;
        renderTasks();
    }
    catch (err) {
        // the server is down, or it sent something that isn't JSON
        listError.textContent = 'Could not load your tasks. Please refresh the page.';
    }
}

// ----- Add A Task -----

const taskForm = document.querySelector('#task-form');
const formError = document.querySelector('#form-error');
const addButton = taskForm.querySelector('button[type="submit"]');

const fields = {
    title: document.querySelector('#title'),
    dueDate: document.querySelector('#dueDate'),
};

let submittedOnce = false;

// same rules as validateTask on the server, so the user gets instant feedback
function validate() {
    const errors = [];
    const title = fields.title.value.trim();

    if (title === '') {
        errors.push({field: 'title', message: 'Please enter a task.'});
    }
    else if (title.length > 100) {
        errors.push({field: 'title', message: 'Task cannot be longer than 100 characters.'});
    }

    return errors;
}

// same idea as in login.js: list the messages and mark the bad inputs
function showErrors(errors) {
    formError.innerHTML = '';
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
    formError.append(list);
}

taskForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop the browser from reloading the page
    submittedOnce = true;

    const errors = validate();
    showErrors(errors);
    if (errors.length > 0) {
        fields[errors[0].field].focus();
        return;
    }

    addButton.disabled = true; // stop double-clicks from adding the task twice

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: fields.title.value,
                dueDate: fields.dueDate.value, // '' if no date was picked; the server turns that into null
            }),
        });

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        const result = await response.json();

        if (response.ok) {
            tasks.push(result.task); // the server's copy, with its id and createdAt
            renderTasks();
            taskForm.reset(); // empty the inputs
            submittedOnce = false;
            fields.title.focus(); // ready to type the next task
        }
        else {
            showErrors(result.errors); // the server found a problem the browser didn't
        }
    }
    catch (err) {
        showErrors([{message: 'Something went wrong. Please try again.'}]);
    }
    finally {
        addButton.disabled = false; // finally runs whether the try worked or not
    }
});

// after the first submit, re-check as the user types so errors disappear when fixed
taskForm.addEventListener('input', () => {
    if (submittedOnce) {
        showErrors(validate());
    }
});

// run once when the page loads
loadTasks();