import type { CvModel } from "~/types";

/** Keys of `CvModel` that hold a list of objects — the repeatable blocks. */
export type CvListKey = {
  [K in keyof CvModel]: CvModel[K] extends Array<infer T>
    ? T extends object
      ? K
      : never
    : never;
}[keyof CvModel];

export type CvListItem<K extends CvListKey> = CvModel[K][number];

/** Top-level fields that are a single string — name, phone, email… */
export type CvTextKey = {
  [K in keyof CvModel]: CvModel[K] extends string ? K : never;
}[keyof CvModel];

export type CvEditorProps = {
  /** What a fresh editor (or "Reset") starts from — the published CV. */
  initialCv: CvModel;
};

export type UseCvEditorProps = CvEditorProps & {};
