import { z } from "zod";

// Building blocks shared by the request schemas in `lib/<feature>.ts`.

/** Trimmed free text; an empty string means "not set". */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

/** A MongoDB ObjectId in its 24-character hex form. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const technologiesSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((names) => [...new Set(names)]);

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
