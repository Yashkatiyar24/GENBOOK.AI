// Generated script for workflow 75124725-6397-4935-a9e9-3632941d537e
// Generated at 2025-09-06T11:22:42.082Z

import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";

// Stagehand configuration

async function runWorkflow() {
  let stagehand: Stagehand | null = null;

  try {
    // Initialize Stagehand
    console.log('Initializing Stagehand...');
    stagehand = new Stagehand(StagehandConfig);
    await stagehand.init();
    console.log('Stagehand initialized successfully.');

    // Get the page instance
    const page = stagehand.page;
    if (!page) {
      throw new Error('Failed to get page instance from Stagehand');
    }

    const variables = {
      input_751247_1: 'yashkatiyar2405@gmail.com',
      input_751247_2: 'yashkatiyar@2405',
      input_751247_4: 'yashkatiyar2405@gmail.com',
      input_751247_5: 'yashkatiyar@2405',
    };

    // Step 1: Navigate to URL
    console.log('Navigating to: https://genbookai.tech/');
    await page.goto('https://genbookai.tech/');

    // Step 2: Perform action
    console.log(`Performing action: click the Voice Commands button`);
    await page.act({
      description: `click the Voice Commands button`,
      selector: 'button:has-text("Voice Commands")',
    });

    // Step 3: Perform action
    console.log(`Performing action: click the Settings button`);
  await page.act('click Settings button');

    // Step 4: Navigate to URL
    console.log('Navigating to: https://genbookai.tech/');
    await page.goto('https://genbookai.tech/');

    // Step 5: Perform action
    console.log(
      `Performing action: type ${variables.input_751247_1} into the email input field`,
    );
  await page.act(`type ${variables.input_751247_1} into the email input field`);

    // Step 6: Perform action
    console.log(
      `Performing action: type ${variables.input_751247_2} into the password input field`,
    );
  await page.act(`type ${variables.input_751247_2} into the password input field`);

    // Step 7: Perform action
    console.log(`Performing action: click the Sign In button`);
  await page.act('click the Sign In button');

    // Step 8: Perform action
    console.log(
      `Performing action: type ${variables.input_751247_4} into the email input field`,
    );
  await page.act(`type ${variables.input_751247_4} into the email input field`);

    // Step 9: Perform action
    console.log(
      `Performing action: type ${variables.input_751247_5} into the password input field`,
    );
  await page.act(`type ${variables.input_751247_5} into the password input field`);

    // Step 10: Perform action
    console.log(`Performing action: click the Sign In button`);
  await page.act('click the Sign In button');

    // Step 11: Perform action
    console.log(`Performing action: click the Voice Commands button`);
    await page.act({
      description: `click the Voice Commands button`,
      selector: 'button:has-text("Voice Commands")',
    });

    // Step 12: Perform action
    console.log(
      `Performing action: click the close button on the Voice Assistant dialog`,
    );
  await page.act('click the close button on the Voice Assistant dialog');

    // Step 13: Perform action
    console.log(`Performing action: click the Settings button in the sidebar`);
  await page.act('click the Settings button in the sidebar');

    // Step 14: Perform action
    console.log(
      `Performing action: click the Notifications option in the settings menu`,
    );
    await page.act({
      description: `click the Notifications option in the settings menu`,
    });

    // Step 15: Perform action
    console.log(
      `Performing action: click the SMS appointment confirmations checkbox to enable it`,
    );
    await page.act({
      description: `click the SMS appointment confirmations checkbox to enable it`,
    });

    // Step 16: Perform action
    console.log(
      `Performing action: click the Communications button in the sidebar`,
    );
    await page.act({
      description: `click the Communications button in the sidebar`,
    });

    // Step 17: Perform action
    console.log(`Performing action: click the Dashboard button in the sidebar`);
    await page.act({
      description: `click the Dashboard button in the sidebar`,
    });

    // Step 18: Perform action
    console.log(`Performing action: click the Smart Settings button`);
    await page.act({
      description: `click the Smart Settings button`,
    });

    // Step 19: Perform action
    console.log(`Performing action: click the Dashboard button in the sidebar`);
    await page.act({
      description: `click the Dashboard button in the sidebar`,
    });

    // Step 20: Navigate to URL
    console.log('Navigating to: https://genbookai.tech/');
    await page.goto('https://genbookai.tech/');

    // Step 21: Navigate to URL
    console.log('Navigating to: https://genbookai.tech/');
    await page.goto('https://genbookai.tech/');

    // Step 22: Perform action
    console.log(
      `Performing action: click the Organization button in the sidebar`,
    );
    await page.act({
      description: `click the Organization button in the sidebar`,
    });

    // Step 23: Perform action
    console.log(
      `Performing action: click the Open button under Organization-wide Settings`,
    );
    await page.act({
      description: `click the Open button under Organization-wide Settings`,
    });

    // Step 24: Perform action
    console.log(`Performing action: click the Chatbot tab`);
    await page.act({
      description: `click the Chatbot tab`,
    });

    // Step 25: Perform action
    console.log(
      `Performing action: click the Manage button under API & Integrations`,
    );
    await page.act({
      description: `click the Manage button under API & Integrations`,
    });

    // Step 26: Perform action
    console.log(`Performing action: click the Team button in the sidebar`);
    await page.act({
      description: `click the Team button in the sidebar`,
    });

    // Step 27: Perform action
    console.log(`Performing action: click the Dashboard button in the sidebar`);
    await page.act({
      description: `click the Dashboard button in the sidebar`,
    });

    console.log('Workflow completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Workflow failed:', error);
    return { success: false, error };
  } finally {
    // Clean up
    if (stagehand) {
      console.log('Closing Stagehand connection.');
      try {
        await stagehand.close();
      } catch (err) {
        console.error('Error closing Stagehand:', err);
      }
    }
  }
}

// Single execution
runWorkflow().then((result) => {
  console.log('Execution result:', result);
  process.exit(result.success ? 0 : 1);
});

runWorkflow();