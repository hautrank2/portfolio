export type ExperiencePhotoModel = {
  title: string;
  description: string;
  imageUrl: string;
};

export type ExperienceModel = {
  company: string;
  role: string;
  duration: string;
  href: string;
  des: string;
  photos: ExperiencePhotoModel[];
};
