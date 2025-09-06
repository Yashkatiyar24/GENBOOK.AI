import type { ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";

dotenv.config();

const StagehandConfig: ConstructorParams = {
  verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeoutMs: 30_000 /* Timeout for DOM to settle in milliseconds */,
  modelName: "gemini-2.0-flash" /* Name of the model to use */,
  modelClientOptions: {
    apiKey: process.env.GOOGLE_API_KEY,
  } /* Configuration options for the model client */,

  env: "LOCAL" /* Environment to run in: LOCAL or BROWSERBASE */,
  localBrowserLaunchOptions: {
    viewport: {
      width: 1024,
      height: 768,
    },
  } /* Configuration options for the local browser */,
};

export default StagehandConfig;
