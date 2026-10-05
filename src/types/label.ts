/**
 * Categories and tags have the same shape and the same CRUD, so they share one
 * model, one lib and one set of route handlers. `LabelKindType` picks which
 * collection — and which `/api/<kind>` endpoint — is meant.
 */
export type LabelKindType = "categories" | "tags";

export type LabelModel = {
  id: string;
  title: string;
  description?: string;
  /** `#rrggbb`. */
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryModel = LabelModel;

export type TagModel = LabelModel;

export type LabelInputModel = Pick<LabelModel, "title" | "description" | "color">;
