import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const { DataSource } = require('typeorm');
  const bcrypt = require('bcryptjs');

  const dataSource = app.get(DataSource);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  await queryRunner.query(`DROP TABLE IF EXISTS article_favorite`);
  await queryRunner.query(`DROP TABLE IF EXISTS article_tag`);
  await queryRunner.query(`DROP TABLE IF EXISTS user_follower`);
  await queryRunner.query(`DROP TABLE IF EXISTS comments`);
  await queryRunner.query(`DROP TABLE IF EXISTS articles`);
  await queryRunner.query(`DROP TABLE IF EXISTS tags`);
  await queryRunner.query(`DROP TABLE IF EXISTS users`);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      bio TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      body TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS article_tag (
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(article_id, tag_id)
    )
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS user_follower (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, follower_id)
    )
  `);

  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS article_favorite (
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(article_id, user_id)
    )
  `);

  const password = bcrypt.hashSync('secret', 10);

  const users = [
    { name: 'Test User', username: 'testuser', email: 'test@email.com', password, bio: 'I am a test user.' },
    { name: 'John Doe', username: 'johndoe', email: 'john@email.com', password, bio: 'Software developer.' },
    { name: 'Jane Smith', username: 'janesmith', email: 'jane@email.com', password, bio: 'Tech writer and blogger.' },
    { name: 'Bob Johnson', username: 'bobjohnson', email: 'bob@email.com', password, bio: 'Full-stack engineer.' },
    { name: 'Alice Williams', username: 'alicewilliams', email: 'alice@email.com', password, bio: 'Open source contributor.' },
    { name: 'Charlie Brown', username: 'charliebrown', email: 'charlie@email.com', password, bio: 'JavaScript enthusiast.' },
    { name: 'Diana Prince', username: 'dianaprince', email: 'diana@email.com', password, bio: 'Superhero developer.' },
    { name: 'Edward Norton', username: 'edwardnorton', email: 'edward@email.com', password, bio: 'Actor and coder.' },
    { name: 'Fiona Apple', username: 'fionaapple', email: 'fiona@email.com', password, bio: 'Musician turned programmer.' },
    { name: 'George Lucas', username: 'georgelucas', email: 'george@email.com', password, bio: 'Filmmaker and hacker.' },
  ];

  for (const u of users) {
    await queryRunner.query(
      `INSERT INTO users (name, username, email, password, bio) VALUES (?, ?, ?, ?, ?)`,
      [u.name, u.username, u.email, u.password, u.bio],
    );
  }

  const userRows = await queryRunner.query(`SELECT id, username FROM users`);

  for (let i = 1; i < userRows.length; i++) {
    const followerId = userRows[i].id;
    const followingId = userRows[0].id;
    await queryRunner.query(
      `INSERT INTO user_follower (user_id, follower_id) VALUES (?, ?)`,
      [followingId, followerId],
    );
  }

  const tags = [
    'javascript', 'typescript', 'nestjs', 'htmx', 'react', 'vue', 'angular',
    'nodejs', 'python', 'golang', 'rust', 'css', 'html', 'webdev', 'api',
    'database', 'docker', 'aws', 'testing', 'devops',
  ];

  for (const tagName of tags) {
    await queryRunner.query(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, [tagName]);
  }

  const tagRows = await queryRunner.query(`SELECT id, name FROM tags`);

  const articles = [
    { title: 'Getting Started with NestJS', description: 'Learn the basics of NestJS framework.', body: 'NestJS is a progressive Node.js framework for building efficient, reliable and scalable server-side applications.' },
    { title: 'Why HTMX is the Future', description: 'HTMX gives you the power of SPAs without the complexity.', body: 'HTMX allows you to access AJAX, CSS Transitions, WebSockets and Server Sent Events directly in HTML.' },
    { title: 'TypeScript Best Practices', description: 'Improve your TypeScript code with these tips.', body: 'TypeScript adds optional static typing to JavaScript. Here are some best practices for writing clean TypeScript code.' },
    { title: 'Building REST APIs with NestJS', description: 'Create robust APIs using NestJS controllers.', body: 'NestJS provides excellent support for building REST APIs with decorators, pipes, guards and interceptors.' },
    { title: 'Understanding TypeORM', description: 'A comprehensive guide to TypeORM.', body: 'TypeORM is an ORM that can run in NodeJS and TypeScript. It supports both Active Record and Data Mapper patterns.' },
    { title: 'Docker for Node.js Apps', description: 'Containerize your Node.js applications.', body: 'Docker provides a way to package applications into containers. Learn how to dockerize your NestJS application.' },
    { title: 'SQLite for Development', description: 'Why SQLite is great for prototyping.', body: 'SQLite is a lightweight database that is perfect for development and testing. It requires no separate server process.' },
    { title: 'Session-based Authentication', description: 'Implement secure auth with sessions.', body: 'Session-based authentication stores user state on the server. Learn how to implement it in NestJS with express-session.' },
    { title: 'Template Engines in Node.js', description: 'Comparing popular template engines.', body: 'Template engines like Handlebars, EJS, and Pug help generate HTML dynamically. Handlebars is logic-less and easy to learn.' },
    { title: 'Web Development Trends 2026', description: 'What is trending in web development.', body: 'The web development landscape is constantly evolving. Here are the trends shaping the industry in 2026.' },
  ];

  for (const a of articles) {
    const randomUser = userRows[Math.floor(Math.random() * userRows.length)];
    const slug = a.title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Math.random().toString(36).substring(2, 8);
    await queryRunner.query(
      `INSERT INTO articles (user_id, slug, title, description, body) VALUES (?, ?, ?, ?, ?)`,
      [randomUser.id, slug, a.title, a.description, a.body],
    );

    const articleResult = await queryRunner.query(`SELECT id FROM articles WHERE slug = ?`, [slug]);
    const articleId = articleResult[0].id;

    const numTags = Math.floor(Math.random() * 5) + 1;
    const shuffled = [...tagRows].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numTags; i++) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO article_tag (article_id, tag_id) VALUES (?, ?)`,
        [articleId, shuffled[i].id],
      );
    }

    const numFavorites = Math.floor(Math.random() * 5);
    const shuffledUsers = [...userRows].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numFavorites; i++) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO article_favorite (article_id, user_id) VALUES (?, ?)`,
        [articleId, shuffledUsers[i].id],
      );
    }
  }

  const articleRows = await queryRunner.query(`SELECT id FROM articles`);
  const commentTexts = [
    'Great article! Very informative.',
    'Thanks for sharing this.',
    'I learned a lot from this post.',
    'This is really helpful, keep it up!',
    'Well written and easy to follow.',
    'I have been looking for something like this.',
    'Excellent explanation!',
    'Can you write more about this topic?',
  ];

  for (let i = 0; i < 30; i++) {
    const randomArticle = articleRows[Math.floor(Math.random() * articleRows.length)];
    const randomUser = userRows[Math.floor(Math.random() * userRows.length)];
    const randomComment = commentTexts[Math.floor(Math.random() * commentTexts.length)];

    await queryRunner.query(
      `INSERT INTO comments (article_id, user_id, body) VALUES (?, ?, ?)`,
      [randomArticle.id, randomUser.id, randomComment],
    );
  }

  await queryRunner.release();
  await app.close();

  console.log('Database seeded successfully!');
  console.log('Login: test@email.com / secret');
}

bootstrap();
