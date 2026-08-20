export type UniversityModel = {
  name: string;
  href: string;
};

export type ProfileModel = {
  name: string;
  handle: string;
  role: string;
  location: string;
  avatar: string;
  tagline: string;
  bio: string;
  email: string;
  cv: string;
  university: UniversityModel;
};

export type StackToolModel = {
  title: string;
  logoUrl: string;
};

export type StackModel = {
  title: string;
  desc: string;
  tools: StackToolModel[];
};

export type SocialModel = {
  title: string;
  href: string;
  handle: string;
};

export type NavItemModel = {
  title: string;
  href: string;
};
