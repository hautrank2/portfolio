import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";

/**
 * Nén động thư mục trong `public/code` thành file zip.
 *
 * Trước đây mỗi bài tập có sẵn một file `.zip` nằm cạnh thư mục nguồn, nên mỗi
 * lần sửa code là phải nhớ nén lại — quên một lần là người đọc tải về bản cũ mà
 * không ai biết. Giờ chỉ giữ thư mục, zip được dựng lúc có người tải.
 *
 * Đường dẫn `/code/<ten>.zip` giữ nguyên như cũ để mọi link trong note không phải
 * sửa: file tĩnh không còn thì Next rơi xuống route này.
 */

const CODE_DIR = path.join(process.cwd(), "public", "code");

// Chỉ chấp nhận tên thư mục "hiền": chữ, số, gạch ngang, gạch dưới, chấm ở giữa.
// Chặn luôn `..` và mọi dấu phân cách đường dẫn.
const SAFE_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

type RouteParams = { params: Promise<{ slug: string }> };

/** Thu thập mọi file trong thư mục, trả về đường dẫn tương đối so với `root`. */
async function collectFiles(root: string, current = ""): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, current), {
    withFileTypes: true,
  });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.posix.join(current, entry.name);
      if (entry.isDirectory()) return collectFiles(root, relative);
      if (entry.isFile()) return [relative];
      return [];
    })
  );

  return files.flat();
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;

  if (!slug.endsWith(".zip")) {
    return new Response("Not found", { status: 404 });
  }

  const name = slug.slice(0, -".zip".length);
  if (!SAFE_NAME.test(name)) {
    return new Response("Not found", { status: 404 });
  }

  const dir = path.join(CODE_DIR, name);
  // Chốt chặn thứ hai: đường dẫn sau khi resolve phải vẫn nằm trong CODE_DIR.
  if (path.relative(CODE_DIR, dir).startsWith("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const files = await collectFiles(dir);
  if (files.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const zip = new JSZip();
  // Bọc trong một thư mục cùng tên để giải nén ra không vãi file khắp nơi.
  const folder = zip.folder(name)!;

  // Mốc thời gian cố định để cùng một source luôn cho ra đúng một file zip,
  // thay vì đổi byte mỗi lần tải chỉ vì giờ nén khác nhau.
  const date = new Date("2020-01-01T00:00:00Z");

  for (const relative of files) {
    // `.DS_Store` là rác của macOS lọt vào từ source gốc của khoá học.
    if (path.posix.basename(relative) === ".DS_Store") continue;
    folder.file(relative, createReadStream(path.join(dir, relative)), { date });
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${name}.zip"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
