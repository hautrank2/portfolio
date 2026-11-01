"use client";

import { useThemeEffects } from "./hook";

const ThemeEffects = () => {
  const { light, progress } = useThemeEffects();

  return (
    <>
      <div ref={light} className="portfolio-pointer" aria-hidden="true" />
      <div ref={progress} className="portfolio-progress" aria-hidden="true" />
    </>
  );
};

export default ThemeEffects;
