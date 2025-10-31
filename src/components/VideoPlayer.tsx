import React from 'react';

interface VideoPlayerProps {
  src: string;
  title: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title }) => {
  return (
    <div className="w-full flex justify-center mb-8">
      <video
        className="max-w-full h-[25vh] object-contain rounded-lg shadow-lg"
        controls
        autoPlay
        loop
        muted
        src={src}
        title={title}
      >
        Seu navegador não suporta a tag de vídeo.
      </video>
    </div>
  );
};

export default VideoPlayer;