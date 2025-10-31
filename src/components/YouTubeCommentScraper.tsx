import React, { useState } from 'react';
import { getComments, getVideoDetails } from '@/services/youtubeService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [downloadData, setDownloadData] = useState<{ filename: string; content: string } | null>(null);
  const { toast } = useToast();

  // Helper function to clean the filename
  const cleanFileName = (title: string): string => {
    // Remove diacritics (accents)
    const withoutDiacritics = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Replace any non-alphanumeric characters (except underscores) with an underscore
    // and convert to lowercase
    return withoutDiacritics.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  };

  const fetchAllCommentsAndDetails = async () => {
    if (!videoId) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video ID or URL.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDownloadData(null); // Clear previous download data
    let allComments: Comment[] = [];
    let currentPageToken: string | undefined = undefined;
    let videoTitle = "comments";
    let videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      // Fetch video details first
      const details = await getVideoDetails(videoId);
      videoTitle = details.title;
      videoUrl = details.url;

      // Fetch all comments
      do {
        const { comments: newComments, nextPageToken: newNextPageToken } = await getComments(videoId, currentPageToken);
        allComments = [...allComments, ...newComments];
        currentPageToken = newNextPageToken;
      } while (currentPageToken);

      // Format comments for the .txt file
      let fileContent = `Comments scraped from: ${videoUrl}\n\n`;
      allComments.forEach((comment) => {
        // Remove HTML tags from comment text
        const cleanText = comment.textDisplay.replace(/<[^>]*>?/gm, '');
        fileContent += `${comment.authorDisplayName}: ${cleanText}\n`;
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach((reply) => {
            const cleanReplyText = reply.textDisplay.replace(/<[^>]*>?/gm, '');
            fileContent += `  ${reply.authorDisplayName}: ${cleanReplyText}\n`; // Indent replies
          });
        }
      });

      setDownloadData({
        filename: `${cleanFileName(videoTitle)}_comments.txt`, // Use the new cleanFileName function
        content: fileContent,
      });

      toast({
        title: "Success",
        description: `Successfully scraped ${allComments.length} comments. Ready for download.`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch comments or video details.",
        variant: "destructive",
      });
      setDownloadData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadData) {
      const blob = new Blob([downloadData.content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = downloadData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "Download Complete",
        description: `"${downloadData.filename}" has been downloaded.`,
      });
    }
  };

  const extractVideoId = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        if (urlObj.searchParams.has('v')) {
          return urlObj.searchParams.get('v');
        } else if (urlObj.hostname === 'youtu.be') {
          return urlObj.pathname.substring(1);
        }
      }
    } catch (e) {
      // Not a valid URL, treat as ID
    }
    return url; // If not a URL, assume it's already an ID
  };

  const handleVideoIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const extractedId = extractVideoId(value);
    setVideoId(extractedId || value);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">YouTube Comment Scraper</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
          <Input
            placeholder="Enter YouTube Video ID or URL"
            value={videoId}
            onChange={handleVideoIdChange}
            className="flex-grow"
            disabled={loading}
          />
          <Button onClick={fetchAllCommentsAndDetails} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Scrape & Prepare Download
          </Button>
        </div>

        {downloadData && (
          <div className="text-center mt-4">
            <Button onClick={handleDownload} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="mr-2 h-4 w-4" />
              Download Comments File
            </Button>
            <p className="text-sm text-gray-500 mt-2">File ready: {downloadData.filename}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubeCommentScraper;