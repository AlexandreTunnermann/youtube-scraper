import React, { useState } from 'react';
import { getComments } from '@/services/youtubeService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
  replies?: Comment[];
}

const YouTubeCommentScraper: React.FC = () => {
  const [videoId, setVideoId] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const fetchComments = async (token?: string) => {
    if (!videoId) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video ID.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { comments: newComments, nextPageToken: newNextPageToken } = await getComments(videoId, token);
      setComments((prevComments) => token ? [...prevComments, ...newComments] : newComments);
      setNextPageToken(newNextPageToken);
      toast({
        title: "Success",
        description: `Fetched ${newComments.length} comments.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch comments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = () => {
    setComments([]); // Clear previous comments
    setNextPageToken(undefined); // Reset page token
    fetchComments();
  };

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchComments(nextPageToken);
    }
  };

  const extractVideoId = (url: string) => {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v');
  };

  const handleVideoIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Try to extract video ID if a full URL is pasted
    if (value.includes('youtube.com/watch?v=')) {
      const extractedId = extractVideoId(value);
      if (extractedId) {
        setVideoId(extractedId);
      } else {
        setVideoId(value); // Fallback if extraction fails
      }
    } else {
      setVideoId(value);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">YouTube Comment Scraper</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Enter YouTube Video ID or URL"
            value={videoId}
            onChange={handleVideoIdChange}
            className="flex-grow"
          />
          <Button onClick={handleScrape} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Scrape Comments
          </Button>
        </div>

        {comments.length > 0 && (
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <h3 className="text-lg font-semibold mb-2">Comments ({comments.length})</h3>
            {comments.map((comment) => (
              <div key={comment.id} className="mb-4 p-2 border-b last:border-b-0">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarImage src={comment.authorProfileImageUrl} alt={comment.authorDisplayName} />
                    <AvatarFallback>{comment.authorDisplayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{comment.authorDisplayName}</p>
                    <p className="text-xs text-gray-500">{new Date(comment.publishedAt).toLocaleString()}</p>
                    <p className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: comment.textDisplay }}></p>
                    <p className="text-xs text-gray-400 mt-1">{comment.likeCount} likes</p>
                  </div>
                </div>
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 mt-2 border-l pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="mb-2 p-1">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={reply.authorProfileImageUrl} alt={reply.authorDisplayName} />
                            <AvatarFallback className="text-xs">{reply.authorDisplayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-xs">{reply.authorDisplayName}</p>
                            <p className="text-xs text-gray-500">{new Date(reply.publishedAt).toLocaleString()}</p>
                            <p className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: reply.textDisplay }}></p>
                            <p className="text-xs text-gray-400 mt-1">{reply.likeCount} likes</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {nextPageToken && (
              <div className="text-center mt-4">
                <Button onClick={handleLoadMore} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Load More Comments
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubeCommentScraper;