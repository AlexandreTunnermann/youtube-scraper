import { MadeWithDyad } from "@/components/made-with-dyad";
import YouTubeCommentScraper from "@/components/YouTubeCommentScraper";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <YouTubeCommentScraper />
      <MadeWithDyad />
    </div>
  );
};

export default Index;