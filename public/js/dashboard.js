// elements from dashboard.html
const taskGroups = document.querySelector('#task-groups');
const emptyMessage = document.querySelector('#empty-message');
const listError = document.querySelector('#list-error');
const doneTodayCount = document.querySelector('#done-today');
const tasksLeftCount = document.querySelector('#tasks-left');
const listOptions = document.querySelector('#list-options');

// the user's tasks, as last sent by the server
let tasks = [];

// the id of the task being edited right now (null means none)
let editingId = null;

// if the login has expired (401), send the user to log in again
// returns true so the caller knows to stop
function loginExpired(response) {
    if (response.status === 401) {
        window.location.href = '/login.html';
        return true;
    }
    return false;
}

// build one <li> for one task
function createTaskItem(task) {
    const item = document.createElement('li');
    item.className = 'task';
    if (task.done) {
        item.classList.add('task-done');
    }

    // the label wraps the checkbox and the title, so clicking the text also ticks the box
    const label = document.createElement('label');
    label.className = 'task-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleTask(task, checkbox));
    label.append(checkbox);

    // title and due date go in one wrapper so they always stay together
    const text = document.createElement('span');
    text.className = 'task-text';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title; // textContent, not innerHTML: "<script>" shows up as plain text
    text.append(title);

    // only show a due date if the task has one
    if (task.dueDate) {
        const due = document.createElement('time');
        due.className = 'task-due';
        due.dateTime = task.dueDate; // machine-readable date (i.e. 2026-12-01)
        due.textContent = 'Due ' + task.dueDate;
        text.append(due);
    }

    label.append(text);
    item.append(label);

    // Edit and Delete go in one wrapper so they always wrap together
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'button button-sm';
    editButton.textContent = 'Edit';
    editButton.setAttribute('aria-label', 'Edit ' + task.title);
    editButton.addEventListener('click', () => {
        editingId = task.id; // remember which task to show as a form
        renderTasks();
        // put the cursor in the title box (getElementById, not querySelector: ids can start with a digit, which breaks "#..." selectors)
        document.getElementById('edit-title-' + task.id).focus();
    });
    actions.append(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button'; // not a form submit button
    deleteButton.className = 'button button-sm';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', 'Delete ' + task.title);
    deleteButton.addEventListener('click', () => deleteTask(task));
    actions.append(deleteButton);
    item.append(actions);

    return item;
}

// true if an ISO time like "2026-11-24T19:05:00.000Z" falls on today's date
function isToday(isoString) {
    // completedAt is saved in UTC; new Date() turns it into the user's own time zone, so a task ticked at 11pm in Montreal still counts as today (UTC says it's tomorrow)
    return new Date(isoString).toDateString() === new Date().toDateString();
}

// count the tasks and update the numbers at the top of the page
function renderStats() {
    let doneToday = 0;
    let left = 0;

    for (const task of tasks) {
        if (task.done && task.completedAt && isToday(task.completedAt)) {
            doneToday++;
        }
        if (!task.done) {
            left++;
        }
    }

    doneTodayCount.textContent = doneToday;
    tasksLeftCount.textContent = left;
}

// fill the List suggestions with every list name the user has used, each one once
function renderListOptions() {
    const names = [];
    for (const task of tasks) {
        if (task.list && !names.includes(task.list)) {
            names.push(task.list);
        }
    }
    names.sort(); // alphabetical

    listOptions.innerHTML = ''; // remove the old options
    for (const name of names) {
        const option = document.createElement('option');
        option.value = name;
        listOptions.append(option);
    }
}

// sort rule for tasks: earliest due date first, tasks with no date at the bottom
// sort() calls this with two tasks: return a negative number to put a first, positive to put b first, 0 to leave them
function compareByDueDate(a, b) {
    if (!a.dueDate && !b.dueDate) {
        return 0;
    }
    if (!a.dueDate) {
        return 1; // a has no date: a goes after b
    }
    if (!b.dueDate) {
        return -1;
    }
    // "YYYY-MM-DD" text sorts in the same order as the dates, so no Date objects needed
    if (a.dueDate < b.dueDate) {
        return -1;
    }
    if (a.dueDate > b.dueDate) {
        return 1;
    }
    return 0;
}

// sort rule for groups: alphabetical, "No list" (name null) at the bottom
function compareByListName(a, b) {
    if (a.name === null) {
        return 1;
    }
    if (b.name === null) {
        return -1;
    }
    return a.name.localeCompare(b.name); // compares text alphabetically
}

// turn the tasks array into groups like [{name: 'SOEN 287', tasks: [...]}, {name: null, tasks: [...]}]
function groupByList() {
    const groups = [];

    for (const task of tasks) {
        const name = task.list || null; // older tasks have no list at all, so treat them as null too

        // find this list's group, or make it if this is the first task in that list
        let group = groups.find((item) => item.name === name);
        if (!group) {
            group = {name: name, tasks: []};
            groups.push(group);
        }
        group.tasks.push(task);
    }

    groups.sort(compareByListName);
    for (const group of groups) {
        group.tasks.sort(compareByDueDate);
    }

    return groups;
}

// redraw all the task groups from the tasks array
function renderTasks() {
    taskGroups.innerHTML = ''; // remove the old groups

    for (const group of groupByList()) {
        const groupBox = document.createElement('div');
        groupBox.className = 'task-group';

        const heading = document.createElement('h3');
        heading.textContent = group.name || 'No list'; // list names are user input too: textContent keeps them XSS-safe
        groupBox.append(heading);

        const list = document.createElement('ul');
        list.className = 'task-list';
        for (const task of group.tasks) {
            if (task.id === editingId) {
                list.append(createEditItem(task)); // this one is being edited: show the form
            }
            else {
                list.append(createTaskItem(task));
            }
        }
        groupBox.append(list);

        taskGroups.append(groupBox);
    }

    // hide "No tasks yet" when there is at least one task
    emptyMessage.hidden = tasks.length > 0;
    renderStats(); // keep the numbers in sync with the list
    renderListOptions(); // keep the suggestions in sync too
}

// ask the server for this user's tasks
async function loadTasks() {
    listError.textContent = ''; // clear any old error

    try {
        const response = await fetch('/api/tasks');

        // login expired: requireLogin sent back 401, so go log in again
        if (loginExpired(response)) {
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
    list: document.querySelector('#list'),
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
                list: fields.list.value, // '' if left empty; the server turns that into null
            }),
        });

        if (loginExpired(response)) {
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

// ----- Check Off & Delete -----

// tick or untick a task
async function toggleTask(task, checkbox) {
    listError.textContent = '';
    checkbox.disabled = true; // no clicking again until the server answers

    try {
        const response = await fetch('/api/tasks/' + task.id, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            // the server's validateTask needs the title every time, so send the whole task, not just "done"
            body: JSON.stringify({
                title: task.title,
                dueDate: task.dueDate, // null is fine: the server treats it as "no date"
                list: task.list, // send it back unchanged, or the server would erase it
                done: checkbox.checked,
            }),
        });

        if (loginExpired(response)) {
            return;
        }

        const result = await response.json();

        if (response.ok) {
            // swap the old task for the server's updated copy (it has the new completedAt)
            const index = tasks.findIndex((item) => item.id === task.id);
            tasks[index] = result.task;
            renderTasks();
        }
        else {
            checkbox.checked = !checkbox.checked; // undo the tick so the screen matches the server
            listError.textContent = result.errors[0].message;
        }
    }
    catch (err) {
        checkbox.checked = !checkbox.checked;
        listError.textContent = 'Could not save that change. Please try again.';
    }
    finally {
        checkbox.disabled = false;
    }
}

// remove a task after asking first
async function deleteTask(task) {
    listError.textContent = '';

    if (!confirm('Delete "' + task.title + '"?')) {
        return; // user clicked Cancel
    }

    try {
        const response = await fetch('/api/tasks/' + task.id, {method: 'DELETE'});

        if (loginExpired(response)) {
            return;
        }

        const result = await response.json();

        if (response.ok) {
            // keep every task except the deleted one
            tasks = tasks.filter((item) => item.id !== task.id);
            renderTasks();
        }
        else {
            listError.textContent = result.errors[0].message;
        }
    }
    catch (err) {
        listError.textContent = 'Could not delete that task. Please try again.';
    }
}

// ----- Edit A Task -----

// build an <li> holding a small form to edit one task
function createEditItem(task) {
    const item = document.createElement('li');
    item.className = 'task task-editing';

    const form = document.createElement('form');
    form.className = 'edit-form';
    form.noValidate = true; // same as novalidate in the HTML

    const errorBox = document.createElement('div');
    errorBox.className = 'form-error';
    errorBox.setAttribute('role', 'alert');
    form.append(errorBox);

    // title: label + input, linked by id like the forms in the HTML files
    const titleField = document.createElement('div');
    titleField.className = 'field';
    const titleLabel = document.createElement('label');
    titleLabel.htmlFor = 'edit-title-' + task.id; // htmlFor is the JavaScript name for "for"
    titleLabel.textContent = 'Task';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'edit-title-' + task.id;
    titleInput.maxLength = 100;
    titleInput.value = task.title;
    titleField.append(titleLabel, titleInput);
    form.append(titleField);

    // due date
    const dueField = document.createElement('div');
    dueField.className = 'field';
    const dueLabel = document.createElement('label');
    dueLabel.htmlFor = 'edit-due-' + task.id;
    dueLabel.textContent = 'Due date (optional)';
    const dueInput = document.createElement('input');
    dueInput.type = 'date';
    dueInput.id = 'edit-due-' + task.id;
    dueInput.value = task.dueDate || '';
    dueField.append(dueLabel, dueInput);
    form.append(dueField);

    // list
    const listField = document.createElement('div');
    listField.className = 'field';
    const listLabel = document.createElement('label');
    listLabel.htmlFor = 'edit-list-' + task.id;
    listLabel.textContent = 'List (optional)';
    const listInput = document.createElement('input');
    listInput.type = 'text';
    listInput.id = 'edit-list-' + task.id;
    listInput.maxLength = 50;
    listInput.value = task.list || '';
    listInput.setAttribute('list', 'list-options'); // in JS, input.list can only be read, not set, so use setAttribute
    listInput.autocomplete = 'off';
    listField.append(listLabel, listInput);
    form.append(listField);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit'; // pressing Enter in an input also submits
    saveButton.className = 'button button-sm';
    saveButton.textContent = 'Save';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button button-sm';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        editingId = null; // go back to the normal view without saving
        renderTasks();
    });

    form.append(saveButton, cancelButton);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        saveEdit(task, titleInput.value, dueInput.value, listInput.value, errorBox, saveButton);
    });

    item.append(form);
    return item;
}

// send the edited title and date to the server
async function saveEdit(task, title, dueDate, list, errorBox, saveButton) {
    errorBox.textContent = '';
    saveButton.disabled = true;

    try {
        const response = await fetch('/api/tasks/' + task.id, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: title,
                dueDate: dueDate,
                list: list,
                done: task.done, // keep the checkbox as it was
            }),
        });

        if (loginExpired(response)) {
            return;
        }

        const result = await response.json();

        if (response.ok) {
            const index = tasks.findIndex((item) => item.id === task.id);
            tasks[index] = result.task;
            editingId = null; // done editing
            renderTasks();
        }
        else {
            errorBox.textContent = result.errors[0].message; // e.g. "Please enter a task."
        }
    }
    catch (err) {
        errorBox.textContent = 'Could not save your changes. Please try again.';
    }
    finally {
        saveButton.disabled = false;
    }
}

// run once when the page loads
loadTasks();