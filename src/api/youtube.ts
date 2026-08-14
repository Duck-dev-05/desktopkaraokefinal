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
  const apiKeysEnv = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKeysEnv) {
    console.warn("YouTube API keys are missing. Returning empty playlists.");
    return [];
  }

  const apiKeys = apiKeysEnv.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  if (apiKeys.length === 0) {
    console.warn("No valid YouTube API keys found. Returning empty playlists.");
    return [];
  }

  let lastError = null;

  for (const apiKey of apiKeys) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=playlist&key=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          console.warn(`YouTube API key ${apiKey.substring(0, 5)}... hit quota limit or rate limit (${response.status}).`);
          lastError = new Error(`YouTube API Error: ${response.status}`);
          continue; // Try next key
        }
        throw new Error(`YouTube API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items) {
        return [];
      }

      return data.items.map((item: any) => ({
        id: item.id.playlistId,
        title: item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        description: item.snippet.description
      }));
    } catch (error) {
      console.error(`Failed to fetch from YouTube API with key ${apiKey.substring(0, 5)}...:`, error);
      lastError = error;
      // If it's a network error, we might still want to try the next key just in case,
      // but usually fetch only throws on network failure. We'll continue the loop.
    }
  }

  console.error("All YouTube API keys failed. Last error:", lastError);
  return [];
};
