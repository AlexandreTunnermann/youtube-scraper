import axios from 'axios';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface Comment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
  replies?: Comment[];
}

interface CommentThread {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        textDisplay: string;
        publishedAt: string;
        likeCount: number;
      };
    };
    totalReplyCount: number;
  };
  replies?: {
    comments: Array<{
      id: string;
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        textDisplay: string;
        publishedAt: string;
        likeCount: number;
      };
    }>;
  };
}

export const getComments = async (videoId: string, pageToken?: string): Promise<{ comments: Comment[]; nextPageToken?: string }> => {
  if (!API_KEY) {
    throw new Error("YouTube API Key is not set. Please add VITE_YOUTUBE_API_KEY to your .env file.");
  }

  try {
    const response = await axios.get(`${BASE_URL}/commentThreads`, {
      params: {
        key: API_KEY,
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