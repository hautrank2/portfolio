/**
 * threejs-lab là một app riêng (repo `threejs-lab`). Chưa khai báo URL thì
 * chỉ nhúng khi chạy dev, với cổng mặc định của lab — bản build công khai
 * không bao giờ trỏ iframe vào localhost của người đọc.
 */
const LAB_URL =
  process.env.NEXT_PUBLIC_LAB_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3005" : null);

export type LabDemoProps = {
  /** `chặng/slug` của bài bên lab, có thể kèm `?demo=<id>`. */
  path: string;
  title?: string;
};

/** Một demo chạy thật của threejs-lab, nhúng giữa note. */
export const LabDemo = ({ path, title = "Demo" }: LabDemoProps) => {
  if (!LAB_URL) return null;

  const [lessonPath, query] = path.split("?");
  const embedUrl = `${LAB_URL}/embed/${lessonPath}${query ? `?${query}` : ""}`;

  return (
    <figure className="my-6overflow-hidden rounded-lg border border-border/60 bg-[#0e1116]">
      {/* `loading="lazy"`: mỗi demo là một WebGL context — chưa cuộn tới thì chưa dựng. */}
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        className="block aspect-video w-full border-0"
      />
      <figcaption className="flex items-center border-t border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">{title}</span>
      </figcaption>
    </figure>
  );
};
