import { invoke } from '@tauri-apps/api/core';

export interface YoutubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  isLocal?: boolean;
  localUrl?: string;
}

export interface YoutubePlaylist {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description: string;
}

export const searchYoutubeKaraoke = async (query: string): Promise<YoutubeVideo[]> => {
  // Clean query string to avoid duplicate 'karaoke' keywords
  const normalizedQuery = query.trim();
  const lowerQuery = normalizedQuery.toLowerCase();
  
  let finalQuery = normalizedQuery;
  if (!lowerQuery.includes("karaoke")) {
    finalQuery = `${normalizedQuery} karaoke`;
  }

  try {
    const responseText = await invoke<string>('search_youtube_cached', { query: finalQuery });
    const data = JSON.parse(responseText);

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    }));
  } catch (error) {
    console.error("Failed to fetch from Tauri YouTube API:", error);
    throw error;
  }
};

export const searchYoutubePlaylists = async (query: string): Promise<YoutubePlaylist[]> => {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("YouTube API key is missing. Returning empty playlists.");
    return [];
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=playlist&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`YouTube API warning ${response.status}: ${response.statusText}.`);
      return [];
    }
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id.playlistId,
      title: item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    }));
  } catch (error) {
    console.error("Failed to fetch playlists from YouTube API:", error);
    return [];
  }
};
