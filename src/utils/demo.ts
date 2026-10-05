import { customDemoData, demoData } from "~/data/demos";
import type { DemoModel, DemoSummaryModel } from "~/types";

/** Demos rendered by the `[slug]` template. */
export const getAllDemos = (): DemoModel[] => demoData;

/** Every card on `/demo`: template demos first, then the hand-coded pages. */
export const getDemoSummaries = (): DemoSummaryModel[] => {
  return [...demoData, ...customDemoData];
};

export const getDemo = (slug: string): DemoModel | undefined => {
  return demoData.find((demo) => demo.slug === slug);
};

/** Path-style document title, matching the blog: `demo | k8s-aws`. */
export const demoPathTitle = (slug?: string): string => {
  return slug ? `demo | ${slug}` : "demo";
};

const YOUTUBE_ID = /(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/;

/**
 * Embed URL for whatever YouTube link was pasted into the data file, or
 * `undefined` when it is empty or not a YouTube link. `youtube-nocookie.com`
 * so the page sets no tracking cookie until the reader presses play.
 */
export const toYoutubeEmbedUrl = (url: string): string | undefined => {
  const id = YOUTUBE_ID.exec(url)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : undefined;
};
