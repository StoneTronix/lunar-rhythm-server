const express = require('express');
const cors = require('cors');

const path = require('path');
const playlistsRouter = require('./routes/playlists');
const tracksRouter = require('./routes/tracks');
const syncTracksWithFiles = require('./autoSync');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/playlists', playlistsRouter);
app.use('/tracks', tracksRouter);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  syncTracksWithFiles();
});
