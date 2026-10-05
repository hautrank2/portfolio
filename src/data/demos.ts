import type { DemoModel, DemoSummaryModel } from "~/types";

export const demoData: DemoModel[] = [
  {
    slug: "k8s-aws",
    title: "Cafe System trên AWS EKS",
    description:
      "Một quán cà phê nhỏ — ba API, hai frontend và một MongoDB — chạy trên cluster Kubernetes thật của AWS.",
    youtubeUrl: "",
    highlights: [
      "Cluster EKS với hai EC2 worker node, mỗi node nằm ở một Availability Zone.",
      "Chỉ hai Service kiểu LoadBalancer ra internet; nginx trong mỗi frontend proxy /api xuống ba API bên trong cluster.",
      "MongoDB giữ dữ liệu trên EBS (ReadWriteOnce), gắn vào đúng một node.",
      "Ảnh món nằm trên EFS (ReadWriteMany), để hai bản menu-api ở hai node cùng đọc được.",
    ],
    stack: [
      "Kubernetes",
      "AWS EKS",
      "EC2",
      "EBS",
      "EFS",
      "ELB",
      "VPC",
      "IAM",
      "Docker",
      "Node.js",
      "React",
      "nginx",
      "MongoDB",
    ],
    links: [
      {
        title: "Xem bài viết chi tiết",
        kind: "article",
        href: "/blog/k8s/deploy-to-cloud",
      },
      {
        title: "Tải source",
        kind: "download",
        href: "/code/kub-demo-cafe-system.zip",
      },
    ],
  },
];

/**
 * Demos with a hand-coded page at `src/app/demo/<slug>/page.tsx`. They are
 * listed on `/demo` but kept out of `demoData`, so the `[slug]` template never
 * generates a page for them.
 */
export const customDemoData: DemoSummaryModel[] = [
  {
    slug: "hlsjs",
    title: "HLS video với hls.js",
    description: "Phát video HLS (.m3u8) ngay trong trình duyệt bằng hls.js.",
    stack: ["hls.js", "React", "Next.js"],
  },
];
