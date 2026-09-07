import { FlipScoutApiClient } from "@flipscout/api-client";

const baseUrl =
  process.env.NEXT_PUBLIC_FLIPSCOUT_API_URL ??
  "http://localhost:4000";

export const flipScoutApi = new FlipScoutApiClient({ baseUrl });
