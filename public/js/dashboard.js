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

// run once when the page loads
loadTasks();