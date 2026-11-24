const express = require('express');
const crypto = require('crypto');
const {readJSON, writeJSON} = require('../lib/store');
const {validateTask} = require('../lib/validation');

const router = express.Router();

// every route here runs after requireLogin, so req.userId is the logged-in user

// GET /api/tasks: send back only this user's tasks
router.get('/', async (req, res) => {
    const tasks = await readJSON('tasks', []);
    const myTasks = tasks.filter((task) => task.userId === req.userId);
    res.json({tasks: myTasks});
});

// POST /api/tasks: create a new task
router.post('/', async (req, res) => {
    const {errors, values} = validateTask(req.body);
    if (errors.length > 0) {
        return res.status(400).json({errors});
    }

    const tasks = await readJSON('tasks', []);
    const newTask = {
        id: crypto.randomUUID(),
        userId: req.userId, // comes from the token, never from req.body
        title: values.title,
        dueDate: values.dueDate,
        list: values.list,
        done: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    await writeJSON('tasks', tasks);

    res.status(201).json({task: newTask});
});

// PUT /api/tasks/:id: edit a task or check it off
router.put('/:id', async (req, res) => {
    const {errors, values} = validateTask(req.body);
    if (errors.length > 0) {
        return res.status(400).json({errors});
    }

    const tasks = await readJSON('tasks', []);
    // the id must match and the task must belong to this user
    const task = tasks.find((item) => item.id === req.params.id && item.userId === req.userId);
    if (!task) {
        // same answer whether the task doesn't exist or belongs to someone else
        return res.status(404).json({errors: [{message: 'Task not found.'}]});
    }

    // just checked off: remember when
    // unchecked: forget it
    if (values.done && !task.done) {
        task.completedAt = new Date().toISOString();
    }
    else if (!values.done) {
        task.completedAt = null;
    }

    // task points to the object inside the tasks array, so changing it changes the array
    task.title = values.title;
    task.dueDate = values.dueDate;
    task.list = values.list;
    task.done = values.done;
    await writeJSON('tasks', tasks);

    res.json({task});
});

// DELETE /api/tasks/:id: remove a task
router.delete('/:id', async (req, res) => {
    const tasks = await readJSON('tasks', []);
    const index = tasks.findIndex((item) => item.id === req.params.id && item.userId === req.userId);
    if (index === -1) {
        return res.status(404).json({errors: [{message: 'Task not found.'}]});
    }

    tasks.splice(index, 1); // remove 1 item at that position
    await writeJSON('tasks', tasks);

    res.json({ok: true});
});

module.exports = router;