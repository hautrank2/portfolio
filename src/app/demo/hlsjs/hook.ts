import { useEffect, useRef } from "react";
import Hls from "hls.js";

export const url =
  "https://hautrank2-virtualbox.tail96279b.ts.net/ai/api/video/hls/car-parking_23s/index.m3u8";

export const useDemoHlsjs = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari / iOS hỗ trợ HLS native
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }
  }, [url]);

  return {
    videoRef,
    url,
  };
};
