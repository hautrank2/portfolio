import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeView } from "~/components/recipes/recipe-view";
import { getAllRecipes, getRecipe, recipePathTitle } from "~/lib/recipes";
import type { RecipeModel } from "~/types";

type PagePropsType = { params: Promise<{ slug: string }> };

/** Every recipe is known at build time; anything else is a static 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllRecipes().map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({
  params,
}: PagePropsType): Promise<Metadata> {
  const { slug } = await params;
  const recipe = getRecipe(slug);
  if (!recipe) return {};

  return {
    title: recipePathTitle(slug),
    description: recipe.description,
    openGraph: { title: recipe.title, description: recipe.description },
  };
}

const isoMinutes = (minutes?: number) => {
  return minutes ? `PT${minutes}M` : undefined;
};

/** schema.org `Recipe`, so search engines can show time and ingredients. */
const toJsonLd = (recipe: RecipeModel) => {
  const total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    recipeCategory: recipe.category,
    keywords: recipe.tags.join(", ") || undefined,
    recipeYield: recipe.servings ? `${recipe.servings}` : undefined,
    prepTime: isoMinutes(recipe.prepTime),
    cookTime: isoMinutes(recipe.cookTime),
    totalTime: isoMinutes(total),
    recipeIngredient: recipe.ingredients.flatMap((group) => group.items),
    datePublished: recipe.created,
  };
};

export default async function RecipePage({ params }: PagePropsType) {
  const { slug } = await params;
  const recipe = getRecipe(slug);
  if (!recipe) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        // Next's documented JSON-LD pattern. `<` is escaped so a stray
        // `</script>` in frontmatter cannot close the tag early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(toJsonLd(recipe)).replace(/</g, "\\u003c"),
        }}
      />
      <RecipeView recipe={recipe} />
    </>
  );
}
