"use client";

import {
  ChevronRight,
  PanelLeftClose,
  Wifi,
  WifiHigh,
  WifiLow,
  WifiOff,
  WifiZero,
} from "lucide-react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Typography } from "~/components/ui/typography";
import { customDemoData } from "~/data/demos";
import IconButton from "~/components/ui/icon-button";
import { useNetwork } from "~/hooks";
import {
  cameraOf,
  GRID_HLS_DEMO_CONFIG,
  HIGH_BUFFER_SEC,
  type HlsDemoConfig,
  type HlsTileStat,
  toCameraUrl,
  useDemoHlsjs,
} from "./hook";
import { SettingsSidebar } from "./settings-sidebar";
const SLUG = "hlsjs";
const GRID_SIZES = [4, 6, 8, 10, 12];

// Title and description come from the same entry the `/demo` card reads, so
// the two cannot drift apart.
const demo = customDemoData.find((item) => item.slug === SLUG);

export default function HlsjsDemoPage() {
  return (
    // `useSearchParams` cần một Suspense boundary, nếu không `next build` sẽ
    // dừng ở bước prerender trang này.
    <Suspense fallback={null}>
      <HlsjsDemo />
    </Suspense>
  );
}

function HlsjsDemo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gridSize, setGridSize] = useState(() => {
    const size = searchParams.get("gridSize");
    if (!size) return 8;
    const parsed = parseInt(size, 10);
    if (Number.isNaN(parsed)) return 8;
    return parsed;
  });
  console.log("index render");
  const [openSettings, setOpenSettings] = useState(true);
  // Cấu hình đang chạy. Chỉ đổi khi bấm "Áp dụng" trong sidebar cài đặt.
  const [config, setConfig] = useState(GRID_HLS_DEMO_CONFIG);

  if (!demo) notFound();

  return (
    <div className="mx-auto mt-4 w-full max-w-[2560px] px-4 sm:px-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50"
      >
        <Link href="/demo" className="transition-colors hover:text-primary">
          Demo
        </Link>
        <ChevronRight size={12} className="text-foreground/25" />
        <span>{demo.slug}</span>
      </nav>

      <header className="mt-2">
        <Typography variant="p" className="mt-4 text-lg text-foreground/70">
          Demo xử lý luồng stream camera bằng thư viện hls.js và cách để chúng
          mượt mà, không giật lag khi phát nhiều video cùng lúc. Mỗi video được
          phát trong một thẻ video riêng, mỗi thẻ video có một instance hls.js
          riêng.
        </Typography>
      </header>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        {openSettings && (
          <SettingsSidebar
            config={config}
            onApply={setConfig}
            onClose={() => setOpenSettings(false)}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <IconButton
                icon={PanelLeftClose}
                aria-label="Bật/tắt cài đặt"
                aria-expanded={openSettings}
                onClick={() => setOpenSettings((pre) => !pre)}
              />
              {GRID_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setGridSize(size);
                    router.push(`/demo/${SLUG}?gridSize=${size}`, {
                      scroll: false,
                    });
                  }}
                  aria-pressed={size === gridSize}
                  className={`hover:cursor-pointer rounded-md border px-3 py-1 transition-colors ${
                    size === gridSize
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-foreground/15 text-foreground/70 hover:text-primary"
                  }`}
                >
                  {size} × {size}
                </button>
              ))}
              <span className="text-foreground/50">
                {gridSize * gridSize} video
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ConnectionIndicator />
            </div>
          </div>

          <div
            className="mt-4 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: gridSize * gridSize }, (_, index) => (
              <HlsVideo key={index} index={index} config={config} />
            ))}
          </div>
        </div>

        {/* Sidebar thông số (đồ thị 60 giây) tạm ẩn: nó cần `useDemoStats`, mà
            hook đó setState mỗi giây ở cấp trang nên kéo cả lưới render lại.
            Code vẫn nằm ở ./stats-sidebar và `useDemoStats` trong ./hook. */}
      </div>
    </div>
  );
}

// Each tile calls the hook itself, so every video gets its own Hls instance.
function HlsVideo({ index, config }: { index: number; config: HlsDemoConfig }) {
  const { videoRef, stat } = useDemoHlsjs({ index, config });
  // Chỉ gắn tên khi URL thật sự đổi theo camera; nguồn tĩnh thì ô nào cũng
  // giống nhau, tên camera sẽ gây hiểu lầm.
  const perCamera =
    toCameraUrl(config.url, index) !== toCameraUrl(config.url, index + 1);
  const highBuffer = stat.bufferSec >= HIGH_BUFFER_SEC;

  return (
    <div className="relative overflow-hidden rounded">
      <video
        id={`video-${index}`}
        ref={videoRef}
        className="aspect-video w-full bg-black rounded"
        autoPlay
        muted
        playsInline
      />

      {/* Giá trị tức thời của riêng ô này; cập nhật mỗi giây, không có lịch sử. */}
      <div className="pointer-events-none absolute inset-x-1 top-1 z-1 flex flex-wrap items-center gap-1 font-mono text-[10px] leading-none tabular-nums text-white/90">
        <span
          className="flex items-center gap-1 rounded bg-black/60 px-1 py-0.5"
          title="Trạng thái"
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${TILE_STATE[stat.state].dot}`}
          />
          {TILE_STATE[stat.state].label}
        </span>
        <span
          className={`rounded px-1 py-0.5 ${
            highBuffer ? "bg-amber-500 font-semibold text-black" : "bg-black/60"
          }`}
          title="Số giây đã đệm phía trước"
        >
          {highBuffer ? "buffer cao " : "buf "}
          {stat.bufferSec.toFixed(1)}s
        </span>
        {stat.kbps !== null && (
          <span
            className="rounded bg-black/60 px-1 py-0.5"
            title="Bitrate của segment vừa tải"
          >
            {(stat.kbps / 1000).toFixed(1)} Mbps
          </span>
        )}
        {stat.loadMs !== null && (
          <span
            className="rounded bg-black/60 px-1 py-0.5"
            title="Thời gian tải segment vừa rồi"
          >
            {stat.loadMs} ms
          </span>
        )}
        {stat.droppedPercent > 0 && (
          <span
            className="rounded bg-amber-500 px-1 py-0.5 font-semibold text-black"
            title="Khung hình bị rớt trong giây vừa qua"
          >
            rớt {stat.droppedPercent}%
          </span>
        )}
      </div>

      {stat.error ? (
        <p
          role="alert"
          className="absolute inset-0 z-1 grid place-items-center bg-red-950/80 p-2 text-center font-mono text-[11px] leading-snug text-red-100"
        >
          {stat.error}
        </p>
      ) : (
        stat.warning && (
          <p className="pointer-events-none absolute inset-x-1 top-6 z-1 truncate rounded bg-amber-500/90 px-1 py-0.5 font-mono text-[10px] leading-none text-black">
            {stat.warning}
          </p>
        )
      )}

      {perCamera && (
        <span className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-black/60 px-1 py-0.5 text-[10px] leading-none text-white/90 z-1">
          {cameraOf(index)}
        </span>
      )}
    </div>
  );
}

const TILE_STATE: Record<
  HlsTileStat["state"],
  { label: string; dot: string }
> = {
  loading: { label: "đang tải", dot: "bg-sky-400" },
  playing: { label: "phát", dot: "bg-emerald-400" },
  stalled: { label: "chờ buffer", dot: "bg-amber-400" },
  paused: { label: "dừng", dot: "bg-white/50" },
  error: { label: "lỗi", dot: "bg-red-500" },
};

// Vạch sóng theo `signal` (0–4) của useNetwork.
const SIGNAL_ICONS = [WifiOff, WifiZero, WifiLow, WifiHigh, Wifi];
const SIGNAL_CLASSES = [
  "text-red-500",
  "text-red-500",
  "text-amber-500",
  "text-emerald-500",
  "text-emerald-500",
];

// Tự gọi useNetwork, nên state mạng đổi chỉ vẽ lại đúng cái nhãn này — lưới
// video không bị render theo.
function ConnectionIndicator() {
  const network = useNetwork();

  if (!network.online) {
    return (
      <span className="flex items-center gap-1 text-xs text-foreground/70">
        <WifiOff size={16} className="text-red-500" />
        Mất kết nối
      </span>
    );
  }

  const Icon = SIGNAL_ICONS[network.signal];
  // Ưu tiên độ trễ đo thật; chưa đo xong thì dùng ước lượng của trình duyệt.
  const pingMs = network.latency ?? network.rtt;
  const parts = [
    network.effectiveType !== "unknown"
      ? network.effectiveType.toUpperCase()
      : null,
    pingMs !== null ? `${pingMs} ms` : null,
    network.downlink !== null ? `${network.downlink} Mbps` : null,
  ].filter((part) => part !== null);

  return (
    <span
      className="flex items-center gap-1.5 text-xs tabular-nums text-foreground/70"
      title="Loại kết nối · độ trễ · tốc độ (trình duyệt ước lượng)"
    >
      <Icon size={16} className={SIGNAL_CLASSES[network.signal]} />
      {parts.length > 0 ? parts.join(" · ") : "Không đo được"}
    </span>
  );
}
