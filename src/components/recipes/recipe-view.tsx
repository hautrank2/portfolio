import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "~/components/blog/markdown";
import { Typography } from "~/components/ui/typography";
import { recipeCategoryLabels } from "~/lib/recipes";
import type { RecipeModel } from "~/types";
import { RecipeMeta } from "./recipe-meta";

export type RecipeViewProps = {
  recipe: RecipeModel;
};

/**
 * One recipe: ingredients on the left (sticky, so they stay in reach while
 * cooking from the steps), the markdown body on the right.
 *
 * No `<Reveal>` around the body — a recipe is opened to be read right away,
 * and fading it in would hide server-rendered text until hydration.
 */
export const RecipeView = async ({ recipe }: RecipeViewProps) => {
  const content = await renderMarkdown(recipe.body);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 lg:py-16">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50"
      >
        <Link href="/recipes" className="transition-colors hover:text-primary">
          Công thức
        </Link>
        <ChevronRight size={12} className="text-foreground/25" />
        <span>{recipeCategoryLabels[recipe.category]}</span>
      </nav>

      <header className="mt-10 border-b border-border/60 pb-8">
        <Typography
          variant="h1"
          className="text-gradient text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          {recipe.title}
        </Typography>

        {recipe.description && (
          <Typography variant="p" className="mt-4 text-lg text-foreground/70">
            {recipe.description}
          </Typography>
        )}

        <RecipeMeta
          category={recipe.category}
          servings={recipe.servings}
          prepTime={recipe.prepTime}
          cookTime={recipe.cookTime}
          className="mt-6"
        />
      </header>

      <div className="mt-10 gap-12 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        {recipe.ingredients.length > 0 && (
          <aside className="mb-12 lg:mb-0">
            <div className="surface rounded-2xl border border-border/60 p-5 lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                Nguyên liệu
              </p>

              <div className="mt-4 space-y-5">
                {recipe.ingredients.map((group, index) => (
                  <section key={group.title ?? index}>
                    {group.title && (
                      <h2 className="text-sm font-semibold text-primary/80">
                        {group.title}
                      </h2>
                    )}
                    <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span
                            aria-hidden
                            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </aside>
        )}

        <article className="prose-note min-w-0">{content}</article>
      </div>
    </div>
  );
};
