/** Top-level shelf a recipe sits on. Drives the grouping on `/recipes`. */
export type RecipeCategoryType = "food" | "coffee";

/**
 * A titled block of ingredients (`Nước sốt`, `Ướp bò`). Items stay free text —
 * "1 thìa canh nước tương" reads better than any unit/amount split, and nothing
 * here scales portions.
 */
export type RecipeIngredientGroupModel = {
  title?: string;
  items: string[];
};

/** Frontmatter we read off a recipe `.md` file. */
export type RecipeFrontmatterModel = {
  title?: string;
  description?: string;
  category?: RecipeCategoryType;
  tags?: string[];
  /** Portions, e.g. `2`. */
  servings?: number;
  /** Minutes. */
  prepTime?: number;
  /** Minutes. */
  cookTime?: number;
  ingredients?: RecipeIngredientGroupModel[];
  created?: string;
  updated?: string;
  /** Kept out of the build entirely. */
  draft?: boolean;
};

export type RecipeModel = {
  slug: string;
  /** `/recipes/mi-udon-xao-bo`. */
  href: string;
  title: string;
  description?: string;
  category: RecipeCategoryType;
  tags: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: RecipeIngredientGroupModel[];
  created?: string;
  updated?: string;
  /** Raw markdown body — the steps and tips. */
  body: string;
};
