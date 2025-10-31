import { MadeWithDyad } from "@/components/made-with-dyad";
import YouTubeCommentScraper from "@/components/YouTubeCommentScraper";
import VideoPlayer from "@/components/VideoPlayer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <VideoPlayer src="/videos/Xandão Thumbs up.mp4" title="Xandão Thumbs up" />
      <YouTubeCommentScraper />
      <MadeWithDyad />
    </div>
  );
};

export default Index;