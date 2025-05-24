const express = require('express');
const cors = require('cors');

const playlistsRouter = require('./routes/playlists');
const tracksRouter = require('./routes/tracks');
const syncTracksWithFiles = require('./autoSync');

const pool = require('./db');  // импорт пула подключения к БД

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/playlists', playlistsRouter);
app.use('/tracks', tracksRouter);

// Функция ожидания доступности БД
async function waitForDb(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1'); // проверка подключения
      console.log('PostgreSQL доступна');
      return;
    } catch (err) {
      console.log(`Ожидание базы данных... попытка ${i + 1}/${retries}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Не удалось подключиться к базе данных');
}

app.listen(PORT, async () => {
  console.log(`Сервер запущен: http://0.0.0.0:${PORT}`);

  try {
    await waitForDb();
    await syncTracksWithFiles();
  } catch (err) {
    console.error('Ошибка при подключении к базе:', err);
    process.exit(1); // аварийный выход, чтобы контейнер можно было перезапустить
  }
});
