import axios from 'axios';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface Comment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
  replies?: Comment[];
}

export interface VideoDetails {
  title: string;
  url: string;
  description: string;
}

export const getComments = async (apiKey: string, videoId: string, pageToken?: string): Promise<{ comments: Comment[]; nextPageToken?: string }> => {
  if (!apiKey) {
    throw new Error("YouTube API Key is not provided. Please enter it in the field above.");
  }

  try {
    const response = await axios.get(`${BASE_URL}/commentThreads`, {
      params: {
        key: apiKey,
        videoId: videoId,
        part: 'snippet,replies',
        maxResults: 100, // Maximum results per page
        pageToken: pageToken,
      },
    });

    const comments: Comment[] = [];
    for (const item of response.data.items) {
      const topLevelComment = item.snippet.topLevelComment.snippet;
      const comment: Comment = {
        id: item.id,
        authorDisplayName: topLevelComment.authorDisplayName,
        authorProfileImageUrl: topLevelComment.authorProfileImageUrl,
        textDisplay: topLevelComment.textDisplay,
        publishedAt: topLevelComment.publishedAt,
        likeCount: topLevelComment.likeCount,
      };

      if (item.replies && item.replies.comments.length > 0) {
        comment.replies = item.replies.comments.map((reply: any) => ({
          id: reply.id,
          authorDisplayName: reply.snippet.authorDisplayName,
          authorProfileImageUrl: reply.snippet.authorProfileImageUrl,
          textDisplay: reply.snippet.textDisplay,
          publishedAt: reply.snippet.publishedAt,
          likeCount: reply.snippet.likeCount,
        }));
      }
      comments.push(comment);
    }

    return {
      comments,
      nextPageToken: response.data.nextPageToken,
    };
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

export const getVideoDetails = async (apiKey: string, videoId: string): Promise<VideoDetails> => {
  if (!apiKey) {
    throw new Error("YouTube API Key is not provided. Please enter it in the field above.");
  }

  try {
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        key: apiKey,
        id: videoId,
        part: 'snippet',
      },
    });

    if (response.data.items.length === 0) {
      throw new Error("Video not found or invalid video ID.");
    }

    const snippet = response.data.items[0].snippet;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      title: snippet.title,
      url: videoUrl,
      description: snippet.description,
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    throw error;
  }
};