import Database from '@tauri-apps/plugin-sql';

const DB_NAME = 'sqlite:karaoke.db';

export interface User {
  id: number;
  username: string;
  avatar_url: string;
  created_at: string;
  bio: string;
  followers_count: number;
  following_count: number;
  role: string;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  cover_url: string;
  duration: string;
  file_path: string;
}

export interface Recording {
  id: number;
  user_id: number;
  song_id: number;
  score: number;
  played_at: string;
}

export interface Playlist {
  id: number;
  title: string;
  cover_url: string;
  created_by: number;
}

export interface QueueItem {
  id: number;
  song_id: number;
  singer_name: string;
  position: number;
  title: string;
  artist: string;
  duration: string;
}

export interface LeaderboardEntry {
  username: string;
  avatar_url: string;
  title: string;
  artist: string;
  score: number;
  played_at: string;
}

export interface Download {
  id: number;
  video_id: string;
  title: string;
  file_path: string;
  downloaded_at: string;
  thumbnail?: string;
  channel_title?: string;
}

export interface Duet {
  id: number;
  song_title: string;
  artist: string;
  user_name: string;
  avatar_url: string;
  likes: number;
  part: string;
  video_id: string;
  cover_url: string;
  recorded_file_path?: string;
}

export interface AudioRecording {
  id: number;
  title: string;
  file_path: string;
  duration: string;
  created_at: string;
  video_id?: string;
}

let dbInstancePromise: Promise<Database> | null = null;

export const resetDatabase = async () => {
  const db = await initDB();
  await db.execute("DROP TABLE IF EXISTS playlist_songs");
  await db.execute("DROP TABLE IF EXISTS playlists");
  await db.execute("DROP TABLE IF EXISTS recordings");
  await db.execute("DROP TABLE IF EXISTS queue");
  await db.execute("DROP TABLE IF EXISTS downloads");
  await db.execute("DROP TABLE IF EXISTS audio_recordings");
  await db.execute("DROP TABLE IF EXISTS songs");
  await db.execute("DROP TABLE IF EXISTS users");
  console.log("Database reset successfully. Reloading...");
  window.location.reload();
};
(window as any).resetDatabase = resetDatabase;

export const initDB = async () => {
  if (dbInstancePromise) return dbInstancePromise;
  
  dbInstancePromise = (async () => {
    const dbInstance = await Database.load(DB_NAME);
  
  // Removed dev reset drops to persist data


  // Run Migrations (Create Tables)
  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      cover_url TEXT,
      duration TEXT,
      file_path TEXT
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(song_id) REFERENCES songs(id)
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover_url TEXT,
      created_by INTEGER NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id),
      FOREIGN KEY(song_id) REFERENCES songs(id),
      PRIMARY KEY (playlist_id, song_id)
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL,
      singer_name TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY(song_id) REFERENCES songs(id)
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS audio_recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      duration TEXT DEFAULT '0:00',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await dbInstance.execute("ALTER TABLE audio_recordings ADD COLUMN video_id TEXT DEFAULT ''");
  } catch (e) {}

  try {
    await dbInstance.execute("ALTER TABLE downloads ADD COLUMN thumbnail TEXT DEFAULT ''");
    await dbInstance.execute("ALTER TABLE downloads ADD COLUMN channel_title TEXT DEFAULT ''");
  } catch (e) {}

    return dbInstance;
  })();

  return dbInstancePromise;
};

// Data Access Methods
export const getSongs = async (): Promise<Song[]> => {
  const db = await initDB();
  return await db.select('SELECT * FROM songs');
};

export const getTrendingSongs = async (): Promise<Song[]> => {
  const db = await initDB();
  return await db.select('SELECT * FROM songs LIMIT 8');
};

export const searchSongs = async (query: string): Promise<Song[]> => {
  const db = await initDB();
  return await db.select('SELECT * FROM songs WHERE title LIKE $1 OR artist LIKE $1', [`%${query}%`]);
};

export const getUser = async (id: number): Promise<User | null> => {
  const db = await initDB();
  const users: User[] = await db.select('SELECT * FROM users WHERE id = $1', [id]);
  return users.length > 0 ? users[0] : null;
};

export const updateUserRole = async (id: number, role: string): Promise<void> => {
  const db = await initDB();
  await db.execute('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
};

export const getPlaylists = async (): Promise<Playlist[]> => {
  const db = await initDB();
  return await db.select('SELECT * FROM playlists');
};

export const getQueue = async (): Promise<QueueItem[]> => {
  const db = await initDB();
  return await db.select(`
    SELECT q.id, q.song_id, q.singer_name, q.position, s.title, s.artist, s.duration
    FROM queue q
    JOIN songs s ON q.song_id = s.id
    ORDER BY q.position ASC
  `);
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const db = await initDB();
  return await db.select(`
    SELECT u.username, u.avatar_url, s.title, s.artist, r.score, r.played_at
    FROM recordings r
    JOIN users u ON r.user_id = u.id
    JOIN songs s ON r.song_id = s.id
    ORDER BY r.score DESC
    LIMIT 20
  `);
};

export const getRecordingsForUser = async (userId: number) => {
  const db = await initDB();
  return await db.select(`
    SELECT r.score, r.played_at, s.title, s.artist
    FROM recordings r
    JOIN songs s ON r.song_id = s.id
    WHERE r.user_id = $1
    ORDER BY r.played_at DESC
  `, [userId]);
};

export const getSongsCount = async (): Promise<number> => {
  const db = await initDB();
  const res: any[] = await db.select('SELECT COUNT(*) as count FROM songs');
  return res[0]?.count || 0;
};

export const getPlaylistsCount = async (): Promise<number> => {
  const db = await initDB();
  const res: any[] = await db.select('SELECT COUNT(*) as count FROM playlists');
  return res[0]?.count || 0;
};

export const getPlaylistSongs = async (playlistId: number): Promise<Song[]> => {
  const db = await initDB();
  return await db.select(`
    SELECT s.*
    FROM playlist_songs ps
    JOIN songs s ON ps.song_id = s.id
    WHERE ps.playlist_id = $1
    ORDER BY ps.position ASC
  `, [playlistId]);
};

export const getDownloads = async (): Promise<Download[]> => {
  const db = await initDB();
  return await db.select('SELECT * FROM downloads ORDER BY downloaded_at DESC');
};

export const addDownload = async (video_id: string, title: string, file_path: string, thumbnail: string = '', channel_title: string = '') => {
  const db = await initDB();
  await db.execute(
    'INSERT INTO downloads (video_id, title, file_path, thumbnail, channel_title) VALUES ($1, $2, $3, $4, $5)',
    [video_id, title, file_path, thumbnail, channel_title]
  );
};

export const addSong = async (title: string, artist: string, cover_url: string, duration: string, file_path: string) => {
  const db = await initDB();
  await db.execute(
    'INSERT INTO songs (title, artist, cover_url, duration, file_path) VALUES ($1, $2, $3, $4, $5)',
    [title, artist, cover_url, duration, file_path]
  );
};

export const getDuets = async (): Promise<Duet[]> => {
  const db = await initDB();
  return await db.select(`
    SELECT r.id, s.title as song_title, s.artist, u.username as user_name, u.avatar_url, r.score as likes, 'Tự do' as part, s.file_path as video_id, s.cover_url,
    (SELECT file_path FROM audio_recordings WHERE video_id = s.file_path ORDER BY created_at DESC LIMIT 1) as recorded_file_path
    FROM recordings r
    JOIN users u ON r.user_id = u.id
    JOIN songs s ON r.song_id = s.id
    ORDER BY r.played_at DESC
  `);
};

export const getAudioRecordings = async (): Promise<AudioRecording[]> => {
  const db = await initDB();
  return await db.select('SELECT * FROM audio_recordings ORDER BY created_at DESC');
};

export const addAudioRecording = async (title: string, file_path: string, duration: string = '0:00', video_id: string = '') => {
  const db = await initDB();
  await db.execute(
    'INSERT INTO audio_recordings (title, file_path, duration, video_id) VALUES ($1, $2, $3, $4)',
    [title, file_path, duration, video_id]
  );
};

export const saveRecording = async (userId: number, videoId: string, title: string, artist: string, coverUrl: string, score: number) => {
  const db = await initDB();
  // Check if song exists by file_path (using it for videoId here)
  let songs = await db.select('SELECT id FROM songs WHERE file_path = $1', [videoId]) as any[];
  let songId;
  
  if (songs.length > 0) {
    songId = songs[0].id;
  } else {
    // Insert new song
    const res = await db.execute(
      'INSERT INTO songs (title, artist, cover_url, duration, file_path) VALUES ($1, $2, $3, $4, $5)',
      [title, artist, coverUrl, '0:00', videoId]
    );
    songId = res.lastInsertId;
  }

  // Insert recording
  await db.execute(
    'INSERT INTO recordings (user_id, song_id, score) VALUES ($1, $2, $3)',
    [userId, songId, score]
  );
};
