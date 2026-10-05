import { labelItemHandlers } from "~/utils/label-routes";

const handlers = labelItemHandlers("categories");

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
