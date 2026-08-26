import type {
  NavItemModel,
  ProfileModel,
  SocialModel,
  StackModel,
} from "~/types";
import {
  ANGULAR_LOGO,
  ANTD_LOGO,
  NEST_LOGO,
  NEXT_LOGO,
  REACT_LOGO,
} from "~/utils/logo";

/** Prefix on every document title, e.g. `htk2 | blog | k8s`. */
export const titlePrefixData = "htk2";

export const profileData: ProfileModel = {
  name: "Hau Tran",
  handle: "hautrank2",
  role: "Web developer",
  location: "Ho Chi Minh City, Vietnam",
  avatar: "/img/avt.jpg",
  tagline:
    "Of all the software, I especially like websites. I want to build websites that are friendly, useful, places where people can go to actually get something done.",
  bio: "I studied software engineering at Ho Chi Minh City University of Technology and Education (HCMUTE). Today I work as a frontend developer at Becamex IDC, where I sit close to both the UI/UX side and the code that ships.",
  email: "hautrantrung.02@gmail.com",
  cv: "/docs/CV.pdf",
  university: {
    name: "HCMUTE",
    href: "https://hcmute.edu.vn",
  },
};

export const stackData: StackModel[] = [
  {
    title: "Frontend",
    desc: "Where I spend most of my day — building the screens people actually touch.",
    tools: [
      { title: "React", logoUrl: REACT_LOGO },
      { title: "Next.js", logoUrl: NEXT_LOGO },
      { title: "Angular", logoUrl: ANGULAR_LOGO },
      { title: "Ant Design", logoUrl: ANTD_LOGO },
    ],
  },
  {
    title: "Backend",
    desc: "Enough to design the API I want to consume, and to build it when needed.",
    tools: [{ title: "NestJS", logoUrl: NEST_LOGO }],
  },
  {
    title: "UI/UX",
    desc: "At work I sit on both sides — designing the flow, then shipping it.",
    tools: [],
  },
];

export const socialData: SocialModel[] = [
  {
    title: "GitHub",
    href: "https://github.com/hautrank2",
    handle: "@hautrank2",
  },
  {
    title: "LinkedIn",
    href: "https://www.linkedin.com/in/hautrank2/",
    handle: "in/hautrank2",
  },
  {
    title: "Email",
    href: "mailto:hautrantrung.02@gmail.com",
    handle: "hautrantrung.02@gmail.com",
  },
  {
    title: "CV",
    // Cùng một file với `profileData.cv` — trỏ thẳng vào đó để hai chỗ không
    // trôi khỏi nhau khi đổi đường dẫn.
    href: profileData.cv,
    handle: "Download PDF",
  },
];

export const navData: NavItemModel[] = [
  { title: "Home", href: "/" },
  { title: "Blog", href: "/blog" },
  { title: "Showcase", href: "/showcase" },
  { title: "About", href: "/about" },
];
