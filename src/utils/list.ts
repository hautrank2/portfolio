/** `"a, b ,a"` → `["a", "b"]` — how the forms take a list of technologies. */
export const splitList = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ),
];
