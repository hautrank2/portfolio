import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export const url = "http://127.0.0.1:8000/api/hls/car-parking_23s/index.m3u8";

// Số liệu tải segment của mọi instance hls.js được gom vào đây; useDemoStats
// đọc rồi reset sau mỗi nhịp đo.
const network = {
  instances: 0,
  requests: 0,
  latencyMs: 0,
  loadMs: 0,
  durationMs: 0,
  bytes: 0,
};

export const useDemoHlsjs = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Chrome mới cũng phát được HLS native, nên phải ưu tiên hls.js; chỉ
    // Safari / iOS (không có MSE) mới rơi xuống nhánh native bên dưới.
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        const { loading, loaded } = data.frag.stats;
        network.requests += 1;
        network.latencyMs += loading.first - loading.start;
        network.loadMs += loading.end - loading.start;
        network.durationMs += data.frag.duration * 1000;
        network.bytes += loaded;
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      network.instances += 1;

      return () => {
        network.instances -= 1;
        hls.destroy();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    }
  }, []);

  return {
    videoRef,
    url,
  };
};

export type DemoSample = {
  fps: number;
  playing: number;
  total: number;
  playingPercent: number;
  droppedPercent: number;
  // Chỉ Chromium mới có performance.memory
  memoryMb: number | null;
  memoryLimitMb: number | null;
  // Các số liệu mạng là null khi không có request nào trong nhịp đo (hoặc
  // khi video phát native, không qua hls.js)
  latencyMs: number | null;
  // Thời gian tải một segment so với thời lượng của chính nó
  loadPercent: number | null;
  mbps: number | null;
  // Ước lượng của trình duyệt về kết nối mạng (Network Information API, chỉ
  // Chromium); null khi không hỗ trợ
  connection: {
    type: string;
    pingMs: number;
    speedMbps: number;
  } | null;
  online: boolean;
};

type NetworkInformation = {
  effectiveType: string;
  rtt: number;
  downlink: number;
};

const STATS_INTERVAL_MS = 1000;
export const HISTORY_SIZE = 60;

const toMb = (bytes: number) => Math.round(bytes / 1024 / 1024);

export const useDemoStats = () => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [history, setHistory] = useState<DemoSample[]>([]);

  useEffect(() => {
    let frames = 0;
    let rafId = requestAnimationFrame(function tick() {
      frames += 1;
      rafId = requestAnimationFrame(tick);
    });

    let lastTime = performance.now();
    let lastDropped = 0;
    let lastDecoded = 0;

    const timer = setInterval(() => {
      const videos = Array.from(
        gridRef.current?.querySelectorAll("video") ?? [],
      );

      let dropped = 0;
      let decoded = 0;
      let playing = 0;
      for (const video of videos) {
        const quality = video.getVideoPlaybackQuality();
        dropped += quality.droppedVideoFrames;
        decoded += quality.totalVideoFrames;
        // readyState < HAVE_FUTURE_DATA nghĩa là video đang đứng chờ buffer
        if (!video.paused && video.readyState >= video.HAVE_FUTURE_DATA) {
          playing += 1;
        }
      }

      const now = performance.now();
      const elapsedMs = now - lastTime;
      // Đổi lưới thì bộ đếm của các video mới bắt đầu lại từ 0, nên delta có
      // thể âm trong nhịp đó.
      const deltaDecoded = decoded - lastDecoded;
      const deltaDropped = Math.max(0, dropped - lastDropped);
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      const hasRequests = network.requests > 0;
      const connection = (
        navigator as Navigator & { connection?: NetworkInformation }
      ).connection;

      const sample: DemoSample = {
        fps: Math.round((frames * 1000) / elapsedMs),
        playing,
        total: videos.length,
        playingPercent: videos.length ? (playing / videos.length) * 100 : 0,
        droppedPercent:
          deltaDecoded > 0 ? (deltaDropped / deltaDecoded) * 100 : 0,
        memoryMb: memory ? toMb(memory.usedJSHeapSize) : null,
        memoryLimitMb: memory ? toMb(memory.jsHeapSizeLimit) : null,
        latencyMs: hasRequests ? network.latencyMs / network.requests : null,
        loadPercent:
          hasRequests && network.durationMs > 0
            ? (network.loadMs / network.durationMs) * 100
            : null,
        mbps:
          network.instances > 0
            ? (network.bytes * 8) / 1_000_000 / (elapsedMs / 1000)
            : null,
        connection: connection
          ? {
              type: connection.effectiveType,
              pingMs: connection.rtt,
              speedMbps: connection.downlink,
            }
          : null,
        online: navigator.onLine,
      };
      setHistory((prev) => [...prev, sample].slice(-HISTORY_SIZE));

      frames = 0;
      lastTime = now;
      lastDropped = dropped;
      lastDecoded = decoded;
      network.requests = 0;
      network.latencyMs = 0;
      network.loadMs = 0;
      network.durationMs = 0;
      network.bytes = 0;
    }, STATS_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(timer);
    };
  }, []);

  return { gridRef, history };
};
