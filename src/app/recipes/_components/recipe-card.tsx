import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { RecipeModel } from "~/types";
import { RecipeMeta } from "./recipe-meta";

export type RecipeCardProps = {
  recipe: RecipeModel;
};

export const RecipeCard = ({ recipe }: RecipeCardProps) => {
  return (
    <Link
      href={recipe.href}
      className="surface group flex h-full flex-col rounded-2xl border border-border/60 p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">
          {recipe.title}
        </h3>
        <ArrowUpRight
          size={16}
          className="mt-1 shrink-0 text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>

      {recipe.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/60">
          {recipe.description}
        </p>
      )}

      <RecipeMeta
        category={recipe.category}
        servings={recipe.servings}
        prepTime={recipe.prepTime}
        cookTime={recipe.cookTime}
        className="mt-auto pt-5"
      />
    </Link>
  );
};
