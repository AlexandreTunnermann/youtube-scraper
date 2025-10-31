import React, { useState } from 'react';
import { getComments, getVideoDetails, getTranscription } from '@/services/youtubeService';
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
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
  replies?: Comment[];
}

type ScrapeMode = 'comments' | 'transcription' | 'both';

interface DownloadFile {
  filename: string;
  content: string;
}

const YouTubeCommentScraper: React.FC = () => {
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [videoId, setVideoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapeMode, setScrapeMode] = useState<ScrapeMode>('comments'); // Padrão para comentários
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[] | null>(null); // Pode conter múltiplos arquivos
  const { toast } = useToast();

  // Função auxiliar para limpar o nome do arquivo
  const cleanFileName = (title: string): string => {
    const withoutDiacritics = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return withoutDiacritics.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  };

  const generateFileContent = (title: string, description: string, url: string, type: 'comments' | 'transcription', data: string | Comment[]): string => {
    let content = `${title}\n\n`;
    content += `${description}\n\n`;
    content += `Conteúdo extraído de: ${url}\n\n`;
    content += `-------------------------------------------------------\n\n`;

    if (type === 'comments' && Array.isArray(data)) {
      data.forEach((comment) => {
        const cleanText = comment.textDisplay.replace(/<[^>]*>?/gm, '');
        content += `${comment.authorDisplayName}: ${cleanText}\n`;
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach((reply) => {
            const cleanReplyText = reply.textDisplay.replace(/<[^>]*>?/gm, '');
            content += `  ${reply.authorDisplayName}: ${cleanReplyText}\n`;
          });
        }
      });
    } else if (type === 'transcription' && typeof data === 'string') {
      content += data;
    }
    return content;
  };

  const fetchAndPrepareDownloads = async () => {
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
    setDownloadFiles(null);
    let videoTitle = "conteúdo";
    let videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let videoDescription = "";
    const filesToDownload: DownloadFile[] = [];

    try {
      const details = await getVideoDetails(youtubeApiKey, videoId);
      videoTitle = details.title;
      videoUrl = details.url;
      videoDescription = details.description;

      if (scrapeMode === 'comments' || scrapeMode === 'both') {
        let allComments: Comment[] = [];
        let currentPageToken: string | undefined = undefined;
        do {
          const { comments: newComments, nextPageToken: newNextPageToken } = await getComments(youtubeApiKey, videoId, currentPageToken);
          allComments = [...allComments, ...newComments];
          currentPageToken = newNextPageToken;
        } while (currentPageToken);

        const commentsContent = generateFileContent(videoTitle, videoDescription, videoUrl, 'comments', allComments);
        filesToDownload.push({
          filename: `Comentários_${cleanFileName(videoTitle)}.txt`,
          content: commentsContent,
        });
        toast({
          title: "Sucesso",
          description: `Foram extraídos ${allComments.length} comentários.`,
        });
      }

      if (scrapeMode === 'transcription' || scrapeMode === 'both') {
        const transcriptionText = await getTranscription(videoId);
        const transcriptionContent = generateFileContent(videoTitle, videoDescription, videoUrl, 'transcription', transcriptionText);
        filesToDownload.push({
          filename: `Transcrição_${cleanFileName(videoTitle)}.txt`,
          content: transcriptionContent,
        });
        toast({
          title: "Sucesso",
          description: "Transcrição do vídeo preparada.",
        });
      }

      setDownloadFiles(filesToDownload);
      toast({
        title: "Pronto para Download",
        description: `Foram preparados ${filesToDownload.length} arquivo(s) para download.`,
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao buscar dados do vídeo.",
        variant: "destructive",
      });
      setDownloadFiles(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadFiles && downloadFiles.length > 0) {
      downloadFiles.forEach((file) => {
        const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast({
          title: "Download Concluído",
          description: `"${file.filename}" foi baixado.`,
        });
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
      // Não é uma URL válida, trata como ID
    }
    return url; // Se não for uma URL, assume que já é um ID
  };

  const handleVideoIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const extractedId = extractVideoId(value);
    setVideoId(extractedId || value);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Extrator de Conteúdo do YouTube</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center space-x-2 mb-4">
          <Button
            variant="outline"
            className={cn(
              "px-4 py-2 rounded-md transition-all duration-300",
              scrapeMode === 'comments'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 neon-border-glow"
                : "bg-gray-200 text-gray-700 opacity-50 hover:opacity-75 dark:bg-gray-700 dark:text-gray-300"
            )}
            onClick={() => setScrapeMode('comments')}
            disabled={loading}
          >
            Comentários
          </Button>
          <Button
            variant="outline"
            className={cn(
              "px-4 py-2 rounded-md transition-all duration-300",
              scrapeMode === 'transcription'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 neon-border-glow"
                : "bg-gray-200 text-gray-700 opacity-50 hover:opacity-75 dark:bg-gray-700 dark:text-gray-300"
            )}
            onClick={() => setScrapeMode('transcription')}
            disabled={loading}
          >
            Transcrição
          </Button>
          <Button
            variant="outline"
            className={cn(
              "px-4 py-2 rounded-md transition-all duration-300",
              scrapeMode === 'both'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 neon-border-glow"
                : "bg-gray-200 text-gray-700 opacity-50 hover:opacity-75 dark:bg-gray-700 dark:text-gray-300"
            )}
            onClick={() => setScrapeMode('both')}
            disabled={loading}
          >
            Comentários & Transcrição
          </Button>
        </div>

        <div className="flex flex-col space-y-2 mb-4">
          <Input
            placeholder="Insira sua chave de API do YouTube"
            type="password"
            value={youtubeApiKey}
            onChange={(e) => setYoutubeApiKey(e.target.value)}
            className="w-full"
            disabled={loading}
          />
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
                    href="#"
                    onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
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
                    href="#"
                    onClick={() => window.open("https://youtu.be/SXJINT_6GBU", "_blank")}
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
        <Button onClick={fetchAndPrepareDownloads} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Extrair e Preparar Download
        </Button>

        {downloadFiles && downloadFiles.length > 0 && (
          <div className="text-center mt-4">
            <Button onClick={handleDownload} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar Arquivo(s)
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Arquivo(s) pronto(s): {downloadFiles.map(f => f.filename).join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubeCommentScraper;