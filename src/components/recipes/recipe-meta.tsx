import { Clock, CookingPot, CupSoda, Users } from "lucide-react";
import { cn } from "~/lib/utils";
import type { RecipeModel } from "~/types";

export type RecipeMetaProps = Pick<
  RecipeModel,
  "category" | "servings" | "prepTime" | "cookTime"
> & {
  className?: string;
};

/**
 * Servings and timings as a row of small chips. Missing fields just drop out.
 *
 * The wording follows the category: a coffee is poured into glasses and brewed,
 * not served to people and cooked.
 */
export const RecipeMeta = ({
  category,
  servings,
  prepTime,
  cookTime,
  className,
}: RecipeMetaProps) => {
  const drink = category === "coffee";

  const items = [
    {
      icon: drink ? CupSoda : Users,
      value: servings,
      label: drink ? `${servings} ly` : `${servings} người ăn`,
    },
    { icon: Clock, value: prepTime, label: `Chuẩn bị ${prepTime} phút` },
    {
      icon: CookingPot,
      value: cookTime,
      label: drink ? `Pha ${cookTime} phút` : `Nấu ${cookTime} phút`,
    },
  ].filter((item) => item.value);

  if (items.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground/55",
        className
      )}
    >
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon size={13} />
          {label}
        </li>
      ))}
    </ul>
  );
};
