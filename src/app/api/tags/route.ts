import { labelCollectionHandlers } from "~/utils/label-routes";

const handlers = labelCollectionHandlers("tags");

export const GET = handlers.GET;
export const POST = handlers.POST;
