import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import type {
  RecipeCategoryType,
  RecipeFrontmatterModel,
  RecipeModel,
} from "~/types";

/**
 * Deliberately separate from the blog loader: recipes are a flat shelf to look
 * things up in, not a roadmap — no `order:`, no planned nodes, no progress.
 */
const RECIPES_ROOT = path.join(process.cwd(), "content", "recipes");

export const recipeCategoryLabels: Record<RecipeCategoryType, string> = {
  food: "Món ăn",
  coffee: "Cà phê",
};

/** Same reason as the blog: YAML turns an unquoted date into a `Date`. */
const toDateString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
};

const buildRecipe = (file: string): RecipeModel | null => {
  const slug = path.basename(file, ".md");
  const parsed = matter(fs.readFileSync(file, "utf8"));
  const data = parsed.data as RecipeFrontmatterModel;
  if (data.draft) return null;

  return {
    slug,
    href: `/recipes/${slug}`,
    title: data.title ?? slug,
    description: data.description,
    category: data.category ?? "food",
    tags: data.tags ?? [],
    servings: data.servings,
    prepTime: data.prepTime,
    cookTime: data.cookTime,
    ingredients: data.ingredients ?? [],
    created: toDateString(data.created),
    updated: toDateString(data.updated),
    body: parsed.content.trim(),
  };
};

/** Every published recipe, newest first. */
export const getAllRecipes = cache((): RecipeModel[] => {
  if (!fs.existsSync(RECIPES_ROOT)) return [];

  return fs
    .readdirSync(RECIPES_ROOT)
    .filter((name) => name.endsWith(".md"))
    .map((name) => buildRecipe(path.join(RECIPES_ROOT, name)))
    .filter((recipe): recipe is RecipeModel => recipe !== null)
    .sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
});

export const getRecipe = (slug: string): RecipeModel | undefined => {
  return getAllRecipes().find((recipe) => recipe.slug === slug);
};

/** Path-style document title, matching the blog: `recipes | mi-udon-xao-bo`. */
export const recipePathTitle = (slug?: string): string => {
  return slug ? `recipes | ${slug}` : "recipes";
};
