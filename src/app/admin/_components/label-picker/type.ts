import type { LabelKindType, LabelModel } from "~/types";

export type LabelPickerProps = {
  /** Which collection new labels are created in. */
  kind: LabelKindType;
  options: LabelModel[];
  /** Selected ids. With `multiple` off it holds at most one. */
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
};

export type UseLabelPickerProps = LabelPickerProps & {};
