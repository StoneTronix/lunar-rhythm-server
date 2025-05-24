const fs = require('fs').promises;
const path = require('path');
const mm = require('music-metadata');
const pool = require('./db');

// Конфигурация
const MUSIC_DIR = path.join(__dirname, 'music');
const DEFAULT_PLAYLIST_NAME = 'Автоматический';
const SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];
const UNKNOWN_ARTIST = 'Неизвестный исполнитель';

// Вспомогательная функция
function extractMetadata(metadata, fallbackTitle) {
  return {
    title: metadata.common.title || fallbackTitle,
    artist: metadata.common.artist || 
            metadata.common.albumartist || 
            UNKNOWN_ARTIST,
    duration: metadata.format.duration || 0
  };
}

async function syncTracksWithFiles() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Создаем или получаем плейлист по умолчанию
    const { rows: [playlist] } = await client.query(
      `INSERT INTO playlists (id, title)
       VALUES (gen_random_uuid(), $1)
       ON CONFLICT (title) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [DEFAULT_PLAYLIST_NAME]
    );

    // 2. Получаем существующие треки для быстрой проверки
    const { rows: existingTracks } = await client.query(
      'SELECT id, file_path FROM tracks WHERE file_path IS NOT NULL'
    );
    const existingPaths = new Set(existingTracks.map(t => t.file_path));

    // 3. Обрабатываем файлы
    const files = await fs.readdir(MUSIC_DIR);
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase(); // Расширение
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

      const filePath = path.join(MUSIC_DIR, file);
      const relativePath = path.relative(MUSIC_DIR, filePath);

      // Пропускаем уже обработанные файлы
      if (existingPaths.has(relativePath)) continue;

      try {
        // Извлекаем метаданные
        const metadata = await mm.parseFile(filePath);
        const { title, artist, duration } = extractMetadata(metadata, path.parse(file).name);

        // Добавляем трек в БД
        const { rows: [track] } = await client.query(
          `INSERT INTO tracks ( id, title, artist, duration, file_path ) 
          VALUES (
            gen_random_uuid(), $1, $2, $3, $4
           ) RETURNING id`,
          [
            title,
            artist,
            Math.floor(duration || 0),
            relativePath  // Сохраняем относительный путь            
          ]
        );

        // Добавляем в плейлист
        await client.query(
          `INSERT INTO playlist_tracks (playlist_id, track_id, position)
           SELECT $1, $2, COALESCE(MAX(position), 0) + 1
           FROM playlist_tracks WHERE playlist_id = $1`,
          [playlist.id, track.id]
        );

        console.log(`Добавлен трек: ${title} (${relativePath})`);
      } catch (error) {
        console.error(`Ошибка обработки файла ${file}:`, error.message);
      }
    }

    await client.query('COMMIT');
    console.log('Синхронизация завершена');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Ошибка синхронизации:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

module.exports = syncTracksWithFiles;