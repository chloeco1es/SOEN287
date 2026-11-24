# DashWise

*Today's assignments, at a glance.*

© 2026 DashWise

## Team

Created by Chloe Coles (solo project)

For SOEN 287 Q 2262 - Fall 2026 - Dr. Yuhong Yan

## Tech stack

- **Front end:** HTML5, CSS, vanilla JavaScript (DOM + `fetch`)
- **Back end:** Node.js with Express 5
- **Authentication:** JWT stored in an `httpOnly` cookie (`jsonwebtoken`, `cookie-parser`); passwords hashed with `bcryptjs`
- **Data storage:** JSON files (`data/users.json`, `data/tasks.json`)
- **Config:** environment variables loaded with `dotenv`

## Features

- Public landing page, plus registration and login pages
- User accounts: registration and login using hashed passwords
- An authenticated dashboard where a signed-in user manages their own data (create, read, update, delete).
- Per-user data isolation: every task request is checked against the logged-in user, so you can only see or change your own tasks
- Dynamic client-side features built with JavaScript and the DOM (search/filtering as you type, drag-and-drop reordering, live counters/totals)
- Server-side validation of every form submission
- Persistence using JSON documents
- JWT-based authentication
