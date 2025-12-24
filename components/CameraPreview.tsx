
import React, { useRef, useEffect } from 'react';
import { FRAME_RATE, JPEG_QUALITY } from '../constants';
import { blobToBase64 } from '../utils/audioUtils';

interface CameraPreviewProps {
  isActive: boolean;
  onFrame: (base64Frame: string) => void;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ isActive, onFrame }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    }

    return () => {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive && videoRef.current && canvasRef.current) {
      intervalRef.current = window.setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const base64 = await blobToBase64(blob);
              onFrame(base64);
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      }, 1000 / FRAME_RATE);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onFrame]);

  return (
    <div className="relative w-full aspect-video bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover mirror"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse flex items-center gap-2">
         <div className="w-2 h-2 bg-white rounded-full"></div>
         REC
      </div>
    </div>
  );
};

export default CameraPreview;
