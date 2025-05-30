const { Pool } = require('pg');
require('dotenv').config(); // Для использования переменных окружения

const pool = new Pool({
  user: process.env.DB_USER, 
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
});

// Проверка подключения при старте
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL подключена'))
  .catch(err => console.error('❌ Ошибка подключения к PostgreSQL', err.stack));

module.exports = pool;