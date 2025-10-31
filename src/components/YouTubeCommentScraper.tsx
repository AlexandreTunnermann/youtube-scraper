import React, { useState } from 'react';
import { getComments, getVideoDetails } from '@/services/youtubeService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
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
    if (!youtubeApiKey) {
      toast({
        title: "Erro",
        description: "Por favor, insira sua chave de API do YouTube.",
        variant: "destructive",
      });
      return;
    }

    if (!videoId) {
      toast({
        title: "Erro",
        description: "Por favor, insira um ID ou URL de vídeo do YouTube.",
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
    let videoDescription = "";

    try {
      // Fetch video details first
      const details = await getVideoDetails(youtubeApiKey, videoId);
      videoTitle = details.title;
      videoUrl = details.url;
      videoDescription = details.description;

      // Fetch all comments
      do {
        const { comments: newComments, nextPageToken: newNextPageToken } = await getComments(youtubeApiKey, videoId, currentPageToken);
        allComments = [...allComments, ...newComments];
        currentPageToken = newNextPageToken;
      } while (currentPageToken);

      // Format comments for the .txt file
      let fileContent = `${videoTitle}\n\n`; // Video Title
      fileContent += `${videoDescription}\n\n`; // Video Description
      fileContent += `Comentários extraídos de: ${videoUrl}\n\n`; // Scraped from URL
      fileContent += `-------------------------------------------------------\n\n`; // Separator line

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
        title: "Sucesso",
        description: `Foram extraídos ${allComments.length} comentários. Pronto para download.`,
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao buscar comentários ou detalhes do vídeo.",
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
        title: "Download Concluído",
        description: `"${downloadData.filename}" foi baixado.`,
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
        <CardTitle className="text-2xl font-bold text-center">Extrator de Comentários do YouTube</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2 mb-4">
          <Input
            placeholder="Insira sua chave de API do YouTube"
            type="password" // Use password type for security
            value={youtubeApiKey}
            onChange={(e) => setYoutubeApiKey(e.target.value)}
            className="w-full"
            disabled={loading}
          />
          {/* API Key Help Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="text-sm text-blue-600 dark:text-blue-400 p-0 h-auto justify-start">
                Como achar a minha chave API?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Como obter sua chave API do YouTube</DialogTitle>
                <DialogDescription>
                  Siga as instruções abaixo para configurar sua chave API.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-sm">
                <p>
                  Para encontrar ou criar sua chave API, visite o
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline ml-1"
                  >
                    Google Cloud Console
                  </a>
                  .
                </p>
                <p className="font-bold text-red-600 dark:text-red-400">
                  Atenção: Verifique qual projeto você está acessando para usar a API correta.
                </p>
                <p>
                  Se você não sabe como criar uma chave API, assista a este
                  <a
                    href="https://youtu.be/SXJINT_6GBU"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline ml-1"
                  >
                    vídeo
                  </a>
                  para um tutorial passo a passo.
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <Input
            placeholder="Insira o ID ou URL do vídeo do YouTube"
            value={videoId}
            onChange={handleVideoIdChange}
            className="w-full"
            disabled={loading}
          />
        </div>
        <Button onClick={fetchAllCommentsAndDetails} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Extrair e Preparar Download
        </Button>

        {downloadData && (
          <div className="text-center mt-4">
            <Button onClick={handleDownload} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar Arquivo de Comentários
            </Button>
            <p className="text-sm text-gray-500 mt-2">Arquivo pronto: {downloadData.filename}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubeCommentScraper;