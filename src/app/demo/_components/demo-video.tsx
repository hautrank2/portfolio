import { Clapperboard } from "lucide-react";
import { toYoutubeEmbedUrl } from "~/utils/demo";

export type DemoVideoProps = {
  title: string;
  youtubeUrl: string;
};

/**
 * A plain iframe, not a player component: the page stays a Server Component
 * and YouTube's script only loads inside the frame.
 */
export const DemoVideo = ({ title, youtubeUrl }: DemoVideoProps) => {
  const embedUrl = toYoutubeEmbedUrl(youtubeUrl);

  return (
    <div className="surface aspect-video overflow-hidden rounded-2xl border border-border/60">
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-3 text-foreground/40">
          <Clapperboard size={32} />
          <p className="text-sm">Video demo sẽ được cập nhật.</p>
        </div>
      )}
    </div>
  );
};
