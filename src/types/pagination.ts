/** Which slice of a list is wanted. `page` starts at 1. */
export type PageQueryModel = {
  page: number;
  pageSize: number;
};

/** One slice of a list, plus how many items the whole list has. */
export type PageModel<T> = PageQueryModel & {
  items: T[];
  total: number;
};
