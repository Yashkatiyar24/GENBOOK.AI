// Generated script for workflow 6d68b3b3-f997-4826-9fcb-88decea156b7
// Fixed version with proper Stagehand actions

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import StagehandConfig from "./stagehand.config.js";

async function runWorkflow() {
  let stagehand: Stagehand | null = null;

  try {
    // Initialize Stagehand
    console.log("Initializing Stagehand...");
    stagehand = new Stagehand(StagehandConfig);
    await stagehand.init();
    console.log("Stagehand initialized successfully.");

    // Get the page instance
    const page = stagehand.page;
    if (!page) {
      throw new Error("Failed to get page instance from Stagehand");
    }

    // Step 1: Navigate to URL
    console.log("Navigating to: https://www.genbookai.tech/");
    await page.goto("https://www.genbookai.tech/");

    // Step 2: Click Sign In button
    console.log("Performing action: click the Sign In button");
    await page.act({
      action: "click",
      selector: "button:has-text('Sign In')",
    });

    // Step 3: Navigate again
    console.log("Navigating to: https://www.genbookai.tech/");
    await page.goto("https://www.genbookai.tech/");

    // Step 4: Click Settings
    console.log("Performing action: click the Settings button");
    await page.act({
      action: "click",
      selector: "button:has-text('Settings')",
    });

    // Step 5: Click Notifications
    console.log("Performing action: click the Notifications button");
    await page.act({
      action: "click",
      selector: "button:has-text('Notifications')",
    });

    // Step 6: Click Organization
    console.log("Performing action: click the Organization button");
    await page.act({
      action: "click",
      selector: "button:has-text('Organization')",
    });

    // Step 7: Click Open under Organization-wide Settings
    console.log("Performing action: click the Open button under Organization-wide Settings");
    await page.act({
      action: "click",
      selector: "button:has-text('Open')",
    });

    // Step 8: Click Manage under API & Integrations
    console.log("Performing action: click the Manage button under API & Integrations");
    await page.act({
      action: "click",
      selector: "button:has-text('Manage')",
    });

    // Step 9: Click Communications
    console.log("Performing action: click the Communications button");
    await page.act({
      action: "click",
      selector: "button:has-text('Communications')",
    });

    // Step 10: Click Dashboard
    console.log("Performing action: click the Dashboard button");
    await page.act({
      action: "click",
      selector: "button:has-text('Dashboard')",
    });

    // Step 11: Click Smart Settings card
    console.log("Performing action: click the Smart Settings card");
    await page.act({
      action: "click",
      selector: "div:has-text('Smart Settings')",
    });

    // Step 12: Navigate again
    console.log("Navigating to: https://www.genbookai.tech/");
    await page.goto("https://www.genbookai.tech/");

    // Step 13: Click Settings again
    console.log("Performing action: click the Settings button");
    await page.act({
      action: "click",
      selector: "button:has-text('Settings')",
    });

    // Step 14: Click Organization again
    console.log("Performing action: click the Organization button");
    await page.act({
      action: "click",
      selector: "button:has-text('Organization')",
    });

    console.log("Workflow completed successfully");
    return { success: true };
  } catch (error) {
    console.error("Workflow failed:", error);
    return { success: false, error };
  } finally {
    if (stagehand) {
      console.log("Closing Stagehand connection.");
      try {
        await stagehand.close();
      } catch (err) {
        console.error("Error closing Stagehand:", err);
      }
    }
  }
}

// Single execution
runWorkflow().then((result) => {
  console.log("Execution result:", result);
  process.exit(result.success ? 0 : 1);
});
