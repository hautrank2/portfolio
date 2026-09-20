import type { Metadata } from "next";
import PageHeader from "~/components/layouts/page-header";
import { RecipeCard } from "~/components/recipes/recipe-card";
import { getAllRecipes, recipeCategoryLabels, recipePathTitle } from "~/lib/recipes";
import type { RecipeCategoryType } from "~/types";

export const metadata: Metadata = {
  title: recipePathTitle(),
  description: "Công thức nấu ăn và pha cà phê hay làm ở nhà.",
  openGraph: { title: "Công thức" },
};

const CATEGORY_ORDER: RecipeCategoryType[] = ["food", "coffee"];

/**
 * Grouped by category on the server rather than a client-side filter: with a
 * handful of recipes a filter is JS for nothing. Revisit when a shelf gets long.
 */
export default function RecipesPage() {
  const recipes = getAllRecipes();
  const shelves = CATEGORY_ORDER.map((category) => ({
    category,
    items: recipes.filter((recipe) => recipe.category === category),
  })).filter((shelf) => shelf.items.length > 0);

  return (
    <div className="pb-24">
      <PageHeader
        kicker="Bếp nhà"
        title="Công thức"
        description="Những món ăn và cách pha cà phê mình hay làm — ghi lại để lần sau khỏi phải nhớ."
      />

      <div className="mx-auto w-full max-w-4xl space-y-14 px-4 py-12 sm:px-8 lg:py-16">
        {shelves.map((shelf) => (
          <section key={shelf.category}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
              {recipeCategoryLabels[shelf.category]}
              <span className="ml-2 tabular-nums">{shelf.items.length}</span>
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {shelf.items.map((recipe) => (
                <RecipeCard key={recipe.slug} recipe={recipe} />
              ))}
            </div>
          </section>
        ))}

        {shelves.length === 0 && (
          <p className="text-foreground/50">Chưa có công thức nào.</p>
        )}
      </div>
    </div>
  );
}
