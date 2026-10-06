"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DEFAULT_HLS_DEMO_CONFIG,
  GRID_HLS_DEMO_CONFIG,
  type HlsDemoConfig,
} from "./hook";

// Các khoá của HlsDemoConfig theo kiểu giá trị, để mỗi loại ô nhập chỉ nhận
// đúng những trường nó sửa được.
type NumberKey =
  | "maxBufferLength"
  | "maxMaxBufferLength"
  | "maxBufferSizeMb"
  | "liveSyncDurationCount"
  | "liveMaxLatencyDurationCount"
  | "maxLiveSyncPlaybackRate"
  | "staggerMs";
type BooleanKey =
  | "enableWorker"
  | "capLevelToPlayerSize"
  | "lowLatencyMode"
  | "autoRecover"
  | "onlyVisible";

type NumberField = {
  kind: "number";
  key: NumberKey;
  label: string;
  unit: string;
  hint: string;
  min: number;
  max: number;
  step: number;
};
type BooleanField = {
  kind: "boolean";
  key: BooleanKey;
  label: string;
  hint: string;
};
// backBufferLength có thêm trạng thái "giữ hết", nên vẽ riêng.
type BackBufferField = { kind: "backBuffer" };

type Field = NumberField | BooleanField | BackBufferField;

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Buffer",
    fields: [
      {
        kind: "number",
        key: "maxBufferLength",
        label: "maxBufferLength",
        unit: "giây",
        hint: "Số giây đệm trước mỗi player cố giữ. Nhỏ thì ít bộ nhớ và ít request dồn, nhưng dễ đứng hình khi mạng chậm.",
        min: 1,
        max: 120,
        step: 1,
      },
      {
        kind: "number",
        key: "maxMaxBufferLength",
        label: "maxMaxBufferLength",
        unit: "giây",
        hint: "Trần khi hls.js tự nới buffer. Không thấp hơn maxBufferLength.",
        min: 1,
        max: 600,
        step: 1,
      },
      { kind: "backBuffer" },
      {
        kind: "number",
        key: "maxBufferSizeMb",
        label: "maxBufferSize",
        unit: "MB",
        hint: "Trần dung lượng buffer của một player. Nhân với số ô để ra bộ nhớ media tối đa.",
        min: 1,
        max: 200,
        step: 1,
      },
    ],
  },
  {
    title: "Xử lý",
    fields: [
      {
        kind: "boolean",
        key: "enableWorker",
        label: "enableWorker",
        hint: "Transmux trong Web Worker. Mỗi player một worker — tắt thì việc này dồn về main thread.",
      },
      {
        kind: "boolean",
        key: "capLevelToPlayerSize",
        label: "capLevelToPlayerSize",
        hint: "Không chọn chất lượng lớn hơn kích thước ô. Chỉ có tác dụng khi playlist có nhiều mức chất lượng.",
      },
      {
        kind: "boolean",
        key: "lowLatencyMode",
        label: "lowLatencyMode",
        hint: "Bám sát live edge với LL-HLS. Với lưới nhiều ô nên tắt để buffer ổn định hơn.",
      },
    ],
  },
  {
    title: "Live",
    fields: [
      {
        kind: "number",
        key: "liveSyncDurationCount",
        label: "liveSyncDurationCount",
        unit: "seg",
        hint: "Phát lùi sau live edge bao nhiêu segment. Segment ngắn (0,5 giây) mà đứng sát quá thì chậm một nhịp mạng là đứng hình.",
        min: 1,
        max: 30,
        step: 1,
      },
      {
        kind: "number",
        key: "liveMaxLatencyDurationCount",
        label: "liveMaxLatencyDurationCount",
        unit: "seg",
        hint: "Trễ quá bấy nhiêu segment thì nhảy thẳng về live edge. 0 là không bao giờ nhảy — độ trễ có thể dồn mãi.",
        min: 0,
        max: 120,
        step: 1,
      },
      {
        kind: "number",
        key: "maxLiveSyncPlaybackRate",
        label: "maxLiveSyncPlaybackRate",
        unit: "×",
        hint: "Tăng tốc phát tới mức này để đuổi kịp live edge. 1 là không tăng tốc.",
        min: 1,
        max: 2,
        step: 0.1,
      },
      {
        kind: "boolean",
        key: "autoRecover",
        label: "Tự phục hồi khi lỗi",
        hint: "Lỗi media thì dựng lại bộ giải mã; lỗi mạng thì chờ 3 giây rồi tải lại. Tắt thì ô bị lỗi đứng luôn.",
      },
    ],
  },
  {
    title: "Điều phối player",
    fields: [
      {
        kind: "number",
        key: "staggerMs",
        label: "Khởi động lệch nhau",
        unit: "ms",
        hint: "Ô thứ n bắt đầu tải sau n × giá trị này, để các player không xin segment cùng một lúc. 0 là tất cả cùng bắt đầu.",
        min: 0,
        max: 2000,
        step: 50,
      },
      {
        kind: "boolean",
        key: "onlyVisible",
        label: "Chỉ phát ô đang thấy",
        hint: "Ô nằm ngoài màn hình dừng tải và tạm dừng phát.",
      },
    ],
  },
];

const PRESETS: { label: string; config: HlsDemoConfig }[] = [
  { label: "Mặc định hls.js", config: DEFAULT_HLS_DEMO_CONFIG },
  { label: "Tối ưu cho lưới", config: GRID_HLS_DEMO_CONFIG },
];

const isSameConfig = (a: HlsDemoConfig, b: HlsDemoConfig) =>
  JSON.stringify(a) === JSON.stringify(b);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function SettingsSidebar({
  config,
  onApply,
  onClose,
}: {
  /** Cấu hình các player đang chạy. */
  config: HlsDemoConfig;
  onApply: (config: HlsDemoConfig) => void;
  onClose?: () => void;
}) {
  // Sửa trên bản nháp; chỉ khi bấm "Áp dụng" các player mới được tạo lại —
  // nếu không, mỗi phím gõ sẽ huỷ và dựng lại toàn bộ lưới.
  const [draft, setDraft] = useState(config);
  const dirty = !isSameConfig(draft, config);

  const set = <K extends keyof HlsDemoConfig>(key: K, value: HlsDemoConfig[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const choose = (preset: HlsDemoConfig) => {
    // Preset không đổi nguồn video đang nhập.
    const next = { ...preset, url: draft.url };
    setDraft(next);
    onApply(next);
  };

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:w-72 lg:overflow-y-auto">
      <div className="z-10 flex items-center justify-between gap-2 border-b border-foreground/10 bg-background/90 px-2 py-2 backdrop-blur lg:sticky lg:top-0">
        <h2 className="text-sm font-semibold">Cài đặt hls.js</h2>
        <button
          type="button"
          onClick={() => onClose?.()}
          aria-label="Đóng cài đặt"
          className="rounded-md p-1.5 text-foreground/60 transition-colors hover:text-primary"
        >
          <X size={16} />
        </button>
      </div>

      <form
        className="px-2 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draft);
        }}
      >
        <p className="mt-2 text-xs text-foreground/50">
          Áp dụng sẽ tạo lại toàn bộ player với cấu hình mới.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const active = isSameConfig(
              { ...preset.config, url: config.url },
              config,
            );
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => choose(preset.config)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-foreground/15 text-foreground/70 hover:text-primary"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Nguồn
          </h3>
          <label className="mt-2 block rounded-md border border-foreground/15 p-3">
            <span className="text-xs text-foreground/60">URL playlist (.m3u8)</span>
            <Input
              value={draft.url}
              onChange={(event) => set("url", event.target.value)}
              spellCheck={false}
              className="mt-1.5 h-8 font-mono text-xs"
            />
          </label>
        </section>

        {GROUPS.map((group) => (
          <section key={group.title} className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              {group.title}
            </h3>
            <div className="mt-2 space-y-2">
              {group.fields.map((field) => {
                if (field.kind === "backBuffer") {
                  const keepAll = draft.backBufferLength === null;
                  return (
                    <div
                      key="backBufferLength"
                      className="rounded-md border border-foreground/15 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="hls-backBufferLength"
                          className="font-mono text-xs text-foreground/80"
                        >
                          backBufferLength
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            id="hls-backBufferLength"
                            type="number"
                            min={0}
                            max={600}
                            step={1}
                            disabled={keepAll}
                            value={draft.backBufferLength ?? ""}
                            placeholder="∞"
                            onChange={(event) =>
                              set(
                                "backBufferLength",
                                clamp(event.target.valueAsNumber || 0, 0, 600),
                              )
                            }
                            className="h-8 w-20 text-right tabular-nums"
                          />
                          <span className="w-8 text-xs text-foreground/50">giây</span>
                        </div>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-xs text-foreground/70">
                        <input
                          type="checkbox"
                          checked={keepAll}
                          onChange={(event) =>
                            set("backBufferLength", event.target.checked ? null : 30)
                          }
                          className="size-3.5 accent-primary"
                        />
                        Giữ hết (Infinity)
                      </label>
                      <p className="mt-2 text-[11px] leading-snug text-foreground/45">
                        Số giây đã phát được giữ lại phía sau. Giữ hết thì mỗi ô
                        ôm trọn phần đã xem trong bộ nhớ.
                      </p>
                    </div>
                  );
                }

                if (field.kind === "boolean") {
                  return (
                    <label
                      key={field.key}
                      className="block cursor-pointer rounded-md border border-foreground/15 p-3"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-foreground/80">
                          {field.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={draft[field.key]}
                          onChange={(event) => set(field.key, event.target.checked)}
                          className="size-4 accent-primary"
                        />
                      </span>
                      <span className="mt-2 block text-[11px] leading-snug text-foreground/45">
                        {field.hint}
                      </span>
                    </label>
                  );
                }

                return (
                  <div
                    key={field.key}
                    className="rounded-md border border-foreground/15 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`hls-${field.key}`}
                        className="font-mono text-xs text-foreground/80"
                      >
                        {field.label}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id={`hls-${field.key}`}
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={draft[field.key]}
                          onChange={(event) =>
                            set(
                              field.key,
                              clamp(
                                event.target.valueAsNumber || field.min,
                                field.min,
                                field.max,
                              ),
                            )
                          }
                          className="h-8 w-20 text-right tabular-nums"
                        />
                        <span className="w-8 text-xs text-foreground/50">
                          {field.unit}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-foreground/45">
                      {field.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-foreground/10 bg-background/90 py-3 backdrop-blur">
          <Button type="submit" size="sm" disabled={!dirty} className="flex-1">
            Áp dụng
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dirty}
            onClick={() => setDraft(config)}
          >
            Huỷ thay đổi
          </Button>
        </div>
      </form>
    </aside>
  );
}
