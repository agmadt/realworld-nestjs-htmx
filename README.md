This codebase was created to demonstrate a fully fledged fullstack application built with

 - [NestJS](https://nestjs.com/) a progressive Node.js framework
 - [HTMX](https://htmx.org/) to connect the frontend (html + js) with the backend
 - [TypeORM](https://typeorm.io/) as ORM
 - [Handlebars (hbs)](https://handlebarsjs.com/) for server-side templating
 - [SQLite](https://github.com/WiseLibs/better-sqlite3) for the database (via better-sqlite3)
 - [express-session](https://github.com/expressjs/session) for session-based authentication
 - and [other packages](https://github.com/agmadt/realworld-nestjs-htmx/blob/main/package.json)

that adheres to the [RealWorld](https://github.com/gothinkster/realworld) spec

## Project Overview

"Conduit" is a social blogging site (i.e. a Medium.com clone). It uses a custom API for all requests, including authentication.

# Installation
```
1. clone this repository
2. npm install
3. npm run seed (sqlite is enough, and is included within this repository)
4. npm run start:dev
5. use test@email.com|secret for logging in
	5.1. or can register from the web
```
