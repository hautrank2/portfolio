import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

// export const url = "http://127.0.0.1:8000/api/hls/car-parking_23s/index.m3u8";
// export const url = "http://127.0.0.1:8000/api/hls/car-parking_23s/index.m3u8";
export const url =
  "http://180.148.1.242:8009/api/stream.m3u8?src=LH-VVK-HV_PTZ-01&mp4=flac&w=1920&h=1080";

export const cameras = [
  "BB1-2_SOMUONGXA",
  "BB1-2_MUONGXA",
  "BBMR_MUONGXA",
  "BBMR_SOMUONGXA",
  "HANGLAM-MUONGXA",
  "KINGCHOU_MUONGXA",
  "HUGEBAMBOO_MUONGXA",
  "ALLOY_NHATRAM",
  "BB1-2_SONHATRAM",
  "BBMR_SONHATRAM",
  "BWBAUBANGMR06-01-NHATRAM",
  "HUGEBAMBOO_NHATRAM",
  "LH-HV-LL_CAM-01",
  "LH-HV-LL_CAM-02",
  "LH-HV-LL_CAM-03",
  "LH-HV-LL_CAM-04",
  "LH-HV-LL_CAM-05",
  "LH-HV-LL_CAM-06",
  "LH-LTT-DK_CAM-01",
  "LH-LTT-DK_CAM-02",
  "LH-LTT-DK_CAM-03",
  "LH-LTT-DK_CAM-04",
  "LH-LTT-HV_CAM-01",
  "LH-LTT-HV_CAM-02",
  "LH-LTT-HV_CAM-03",
  "LH-LTT-HV_CAM-04",
  "LH-A9_PTZ-01",
  "LH-VVK-HV_PTZ-01",
] as const;

/** Ô thứ `index` phát camera nào. Hết danh sách thì quay vòng lại từ đầu. */
export const cameraOf = (index: number) => cameras[index % cameras.length];

/**
 * Thay tham số `src` trong URL nguồn bằng camera của ô này, để mỗi ô phát một
 * luồng riêng. URL không có `src` (ví dụ một file .m3u8 tĩnh) thì giữ nguyên —
 * khi đó mọi ô phát cùng một nguồn như trước.
 */
export const toCameraUrl = (source: string, index: number) => {
  try {
    const parsed = new URL(source);
    if (!parsed.searchParams.has("src")) return source;
    parsed.searchParams.set("src", cameraOf(index));
    return parsed.toString();
  } catch {
    // URL đang gõ dở trong sidebar chưa hợp lệ: để hls.js tự báo lỗi tải.
    return source;
  }
};

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

/**
 * Những gì sidebar cài đặt chỉnh được. Nhóm trên là tuỳ chọn của hls.js (giữ
 * đơn vị dễ đọc: giây, MB); nhóm dưới là cách trang điều khiển các player,
 * không thuộc hls.js.
 */
export type HlsDemoConfig = {
  url: string;
  /** Giây đệm trước mà mỗi player cố giữ. */
  maxBufferLength: number;
  /** Trần của buffer khi hls.js tự nới ra, giây. */
  maxMaxBufferLength: number;
  /** Giây đã phát được giữ lại; `null` là giữ hết (Infinity). */
  backBufferLength: number | null;
  /** Trần dung lượng buffer của mỗi player, MB. */
  maxBufferSizeMb: number;
  enableWorker: boolean;
  capLevelToPlayerSize: boolean;
  lowLatencyMode: boolean;
  /** Phát cách live edge bao nhiêu segment. Càng lớn càng trễ nhưng càng ít đứng hình. */
  liveSyncDurationCount: number;
  /** Trễ quá bấy nhiêu segment thì nhảy về live edge; 0 là không bao giờ nhảy. */
  liveMaxLatencyDurationCount: number;
  /** Tốc độ phát tối đa khi đuổi theo live edge; 1 là không tăng tốc. */
  maxLiveSyncPlaybackRate: number;
  /** Lỗi nghiêm trọng thì tự tải lại / khôi phục thay vì để ô chết hẳn. */
  autoRecover: boolean;
  /** Player thứ n bắt đầu tải sau n × giá trị này, ms. */
  staggerMs: number;
  /** Chỉ tải và phát những ô đang nằm trong màn hình. */
  onlyVisible: boolean;
};

/** Đúng mặc định của hls.js, không điều phối gì thêm — mốc để so sánh. */
export const DEFAULT_HLS_DEMO_CONFIG: HlsDemoConfig = {
  url,
  maxBufferLength: 30,
  maxMaxBufferLength: 600,
  backBufferLength: null,
  maxBufferSizeMb: 60,
  enableWorker: true,
  capLevelToPlayerSize: false,
  lowLatencyMode: true,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 0,
  maxLiveSyncPlaybackRate: 1,
  autoRecover: false,
  staggerMs: 0,
  onlyVisible: false,
};

/**
 * Cho lưới nhiều camera live chạy lâu. Ba thứ quan trọng nhất:
 * - `backBufferLength` nhỏ: mặc định hls.js giữ hết phần đã phát, mà luồng
 *   live thì không bao giờ hết — bộ nhớ media cứ thế phình ra.
 * - Phát lùi sau live edge vài segment: segment ở đây chỉ 0,5 giây, đứng sát
 *   quá thì chậm một nhịp mạng là đứng hình.
 * - Trễ quá thì đuổi kịp (tăng tốc nhẹ, hoặc nhảy), không để dồn mãi.
 */
export const GRID_HLS_DEMO_CONFIG: HlsDemoConfig = {
  url,
  maxBufferLength: 8,
  maxMaxBufferLength: 16,
  backBufferLength: 4,
  maxBufferSizeMb: 10,
  enableWorker: true,
  capLevelToPlayerSize: true,
  lowLatencyMode: false,
  liveSyncDurationCount: 6,
  liveMaxLatencyDurationCount: 16,
  maxLiveSyncPlaybackRate: 1.2,
  autoRecover: true,
  staggerMs: 150,
  onlyVisible: true,
};

/** Giá trị tức thời của một ô — không lưu lịch sử. */
export type HlsTileStat = {
  state: "loading" | "playing" | "stalled" | "paused" | "error";
  /** Số giây đã đệm phía trước vị trí đang phát. */
  bufferSec: number;
  /** Bitrate của segment vừa tải; `null` khi chưa tải segment nào. */
  kbps: number | null;
  /** Thời gian tải segment vừa rồi, ms. */
  loadMs: number | null;
  /** Tỉ lệ khung hình bị rớt trong giây vừa qua. */
  droppedPercent: number;
  /** Lỗi nghiêm trọng của hls.js; ở lại cho tới khi tải được segment tiếp. */
  error: string | null;
  /** Lỗi hls.js tự vượt qua được; tự biến mất sau vài giây. */
  warning: string | null;
};

const EMPTY_TILE_STAT: HlsTileStat = {
  state: "loading",
  bufferSec: 0,
  kbps: null,
  loadMs: null,
  droppedPercent: 0,
  error: null,
  warning: null,
};

const TILE_STAT_KEYS = Object.keys(EMPTY_TILE_STAT) as (keyof HlsTileStat)[];

/** Từ mức này trở lên ô sẽ tô nổi buffer: với camera live, đệm nhiều là trễ nhiều. */
export const HIGH_BUFFER_SEC = 10;
const WARNING_TTL_MS = 5000;
const RETRY_DELAY_MS = 3000;
const TICK_MS = 1000;

// Một interval dùng chung cho mọi ô, thay vì mỗi ô tự đặt một cái.
const tickListeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

const subscribeToTick = (listener: () => void) => {
  tickListeners.add(listener);
  tickTimer ??= setInterval(() => {
    for (const run of tickListeners) run();
  }, TICK_MS);

  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0 && tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
};

export const useDemoHlsjs = ({
  index,
  config,
}: {
  index: number;
  config: HlsDemoConfig;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stat, setStat] = useState<HlsTileStat>(EMPTY_TILE_STAT);

  // `config` chỉ đổi tham chiếu khi bấm "Áp dụng", nên effect này chạy lại —
  // tức huỷ và tạo lại player — đúng một lần cho mỗi lần áp dụng.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const source = toCameraUrl(config.url, index);

    // Chrome mới cũng phát được HLS native, nên phải ưu tiên hls.js; chỉ
    // Safari / iOS (không có MSE) mới rơi xuống nhánh native bên dưới.
    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source;
      }
      return;
    }

    const hls = new Hls({
      maxBufferLength: config.maxBufferLength,
      // hls.js cần trần không thấp hơn mức đệm mục tiêu.
      maxMaxBufferLength: Math.max(
        config.maxMaxBufferLength,
        config.maxBufferLength,
      ),
      backBufferLength: config.backBufferLength ?? Infinity,
      maxBufferSize: config.maxBufferSizeMb * 1000 * 1000,
      enableWorker: config.enableWorker,
      capLevelToPlayerSize: config.capLevelToPlayerSize,
      lowLatencyMode: config.lowLatencyMode,
      liveSyncDurationCount: config.liveSyncDurationCount,
      // hls.js bắt buộc ngưỡng nhảy lớn hơn khoảng lùi; 0 là tắt (Infinity).
      liveMaxLatencyDurationCount:
        config.liveMaxLatencyDurationCount > 0
          ? Math.max(
              config.liveMaxLatencyDurationCount,
              config.liveSyncDurationCount + 1,
            )
          : Infinity,
      maxLiveSyncPlaybackRate: config.maxLiveSyncPlaybackRate,
      // Trang tự quyết lúc nào bắt đầu tải (xem `sync` bên dưới).
      autoStartLoad: false,
    });
    // Số liệu của riêng ô này. Các sự kiện hls.js chỉ ghi vào đây; mỗi giây
    // `measure` mới đọc ra và đẩy lên state — nên một segment về hay một lỗi
    // nhỏ không tự gây render.
    let kbps: number | null = null;
    let loadMs: number | null = null;
    let error: string | null = null;
    let warning: string | null = null;
    let warningAt = 0;
    let lastDropped = 0;
    let lastDecoded = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // Khai báo sớm vì trình xử lý lỗi bên dưới cần biết ô có đang được tải không.
    let loading = false;

    hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
      const { loading, loaded } = data.frag.stats;
      network.requests += 1;
      network.latencyMs += loading.first - loading.start;
      network.loadMs += loading.end - loading.start;
      network.durationMs += data.frag.duration * 1000;
      network.bytes += loaded;

      loadMs = Math.round(loading.end - loading.start);
      kbps =
        data.frag.duration > 0
          ? Math.round((loaded * 8) / 1000 / data.frag.duration)
          : null;
      // Tải được segment nghĩa là luồng đã sống lại.
      error = null;
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      const code = data.response?.code;
      const message = code ? `${data.details} (${code})` : data.details;
      if (data.fatal) {
        error = message;
        if (!config.autoRecover) return;
        // Lỗi media: dựng lại bộ giải mã. Lỗi mạng: chờ một nhịp rồi tải lại
        // — không thử ngay, kẻo 64 ô cùng dội vào một server đang nghẽn.
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            hls.loadSource(source);
            if (loading) hls.startLoad();
          }, RETRY_DELAY_MS);
        }
      } else {
        warning = message;
        warningAt = performance.now();
      }
    });
    hls.loadSource(source);
    hls.attachMedia(video);
    network.instances += 1;

    const measure = () => {
      // Số giây đã đệm phía trước vị trí đang phát.
      let bufferSec = 0;
      for (let range = 0; range < video.buffered.length; range++) {
        if (
          video.buffered.start(range) <= video.currentTime &&
          video.currentTime <= video.buffered.end(range)
        ) {
          bufferSec = video.buffered.end(range) - video.currentTime;
        }
      }

      const quality = video.getVideoPlaybackQuality();
      const decoded = quality.totalVideoFrames - lastDecoded;
      const dropped = quality.droppedVideoFrames - lastDropped;
      lastDecoded = quality.totalVideoFrames;
      lastDropped = quality.droppedVideoFrames;

      if (warning && performance.now() - warningAt > WARNING_TTL_MS) {
        warning = null;
      }

      let state: HlsTileStat["state"] = "playing";
      if (error) state = "error";
      else if (video.paused) state = "paused";
      else if (video.readyState < video.HAVE_CURRENT_DATA) state = "loading";
      else if (video.readyState < video.HAVE_FUTURE_DATA) state = "stalled";

      const next: HlsTileStat = {
        state,
        bufferSec: Math.round(bufferSec * 10) / 10,
        kbps,
        loadMs,
        droppedPercent: decoded > 0 ? Math.round((dropped / decoded) * 100) : 0,
        error,
        warning,
      };
      // Giữ nguyên object cũ khi không có gì đổi, để React bỏ qua lần render.
      setStat((current) =>
        TILE_STAT_KEYS.every((key) => current[key] === next[key]) ? current : next,
      );
    };
    const stopMeasuring = subscribeToTick(measure);

    // Player chạy khi đã qua thời gian chờ lệch pha VÀ (nếu bật) đang nằm
    // trong màn hình. `loading` để không gọi startLoad / stopLoad lặp lại.
    let delayPassed = false;
    let visible = !config.onlyVisible;
    const sync = () => {
      const shouldLoad = delayPassed && visible;
      if (shouldLoad === loading) return;
      loading = shouldLoad;
      if (shouldLoad) {
        hls.startLoad();
        // Autoplay bị chặn thì thôi; video vẫn muted nên thường không bị.
        void video.play().catch(() => undefined);
      } else {
        hls.stopLoad();
        video.pause();
      }
    };

    const timer = setTimeout(() => {
      delayPassed = true;
      sync();
    }, index * config.staggerMs);

    let observer: IntersectionObserver | null = null;
    if (config.onlyVisible) {
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          sync();
        },
        // Nạp sớm một chút để ô vừa cuộn tới đã có hình.
        { rootMargin: "200px" },
      );
      observer.observe(video);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      observer?.disconnect();
      stopMeasuring();
      network.instances -= 1;
      hls.destroy();
      // Player mới (sau "Áp dụng") không được thừa hưởng lỗi của player cũ.
      setStat(EMPTY_TILE_STAT);
    };
  }, [config, index]);

  return {
    videoRef,
    stat,
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
