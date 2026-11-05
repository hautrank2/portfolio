import type { RoomChapter } from "./type";

export const chapters: RoomChapter[] = [
  { id: "overview", label: "The room", subtitle: "A WORLD BEHIND THE SCREEN", title: "Welcome to my after-hours.", camera: [11.8, 9.4, 13.6], target: [0, 1.15, 0] },
  { id: "about", label: "About me", subtitle: "01 / THE HUMAN", title: "A little more than a developer.", camera: [7.6, 5.7, 6.7], target: [1.8, 1.15, -1] },
  { id: "collection", label: "Collection", subtitle: "02 / LITTLE WORLDS", title: "Stories, one shelf at a time.", camera: [2.8, 3.2, 3.6], target: [-.25, 1.65, -2.4] },
  { id: "tech", label: "Toolkit", subtitle: "03 / THE TOOLKIT", title: "The tools behind the pixels.", camera: [-.5, 3.5, -1.1], target: [2.2, 1.25, 1.1] },
  { id: "life", label: "After hours", subtitle: "04 / OFF THE CLOCK", title: "Every room tells a story.", camera: [5.3, 4.6, 7.4], target: [.15, 1.9, -.7] },
  { id: "contact", label: "Say hello", subtitle: "05 / YOUR NEXT ADVENTURE", title: "Good things start with hello.", camera: [7.2, 5.7, 8.9], target: [.6, .9, .6] },
];

export const detailTitles = {
  about: "The human behind the pixels.", collection: "A cabinet full of stories.", tech: "My everyday toolkit.", life: "A few favourite things.", dog: "A very small, very sleepy Corgi.", contact: "Let’s build something useful.",
};

export const detailDescriptions = {
  about: "Hậu Trần · Web developer · Ho Chi Minh City, Vietnam",
  collection: "Six shelves. Familiar faces. Entire universes.",
  tech: "The tools I build, explore and learn with.",
  life: "Football, anime, and a well-earned gaming break.",
  dog: "No deadlines. Just dreams and the hum of a laptop.",
  contact: "Have an idea, a question, or a project in mind?",
};
