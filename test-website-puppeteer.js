const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3002',
  username: process.env.TEST_USERNAME || 'admin@example.com',
  password: process.env.TEST_PASSWORD || 'adminpassword',
  headless: process.env.HEADLESS !== 'false', // Default to headless mode
  slowMo: parseInt(process.env.SLOW_MO || '0', 10), // Slow down operations for debugging
  screenshotDir: process.env.SCREENSHOT_DIR || 'test-screenshots',
  testScriptPath: process.env.TEST_SCRIPT_PATH || './test-script.ps1',
};

// Ensure screenshot directory exists
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

// Helper function to take screenshots
async function takeScreenshot(page, name) {
  const screenshotPath = path.join(config.screenshotDir, `${name}-${new Date().toISOString().replace(/:/g, '-')}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);
  return screenshotPath;
}

// Helper function to log steps
function logStep(step) {
  console.log(`\n${'-'.repeat(80)}\n${step}\n${'-'.repeat(80)}`);
}

// Main test function
async function testWebsite() {
  logStep('Starting PSScript website test with Puppeteer');
  
  const browser = await puppeteer.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });
  
  try {
    const page = await browser.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(30000);
    
    // Enable console logging from the browser
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    // Step 1: Navigate to the website
    logStep('Step 1: Navigating to the website');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, '01-homepage');
    
    // Step 2: Login
    logStep('Step 2: Logging in');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', config.username);
    await page.type('input[type="password"]', config.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await takeScreenshot(page, '02-after-login');
    
    // Step 3: Navigate to Upload page
    logStep('Step 3: Navigating to Upload page');
    await page.waitForSelector('a[href="/upload"]');
    await page.click('a[href="/upload"]');
    await page.waitForSelector('input[type="file"]');
    await takeScreenshot(page, '03-upload-page');
    
    // Step 4: Upload a script
    logStep('Step 4: Uploading a script');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(config.testScriptPath);
    await page.type('input[name="title"]', 'Test Script');
    await page.type('textarea[name="description"]', 'This is a test script uploaded by Puppeteer');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await takeScreenshot(page, '04-after-upload');
    
    // Step 5: Verify script was uploaded and analyze it
    logStep('Step 5: Verifying script was uploaded and analyzing it');
    await page.waitForSelector('.script-card');
    const scriptCards = await page.$$('.script-card');
    if (scriptCards.length === 0) {
      throw new Error('No script cards found after upload');
    }
    await scriptCards[0].click();
    await page.waitForSelector('.script-detail');
    await takeScreenshot(page, '05-script-detail');
    
    // Step 6: Trigger script analysis
    logStep('Step 6: Triggering script analysis');
    await page.waitForSelector('button:has-text("Analyze")');
    await page.click('button:has-text("Analyze")');
    await page.waitForSelector('.analysis-results', { timeout: 60000 }); // Analysis might take longer
    await takeScreenshot(page, '06-analysis-results');
    
    // Step 7: Test similar scripts search
    logStep('Step 7: Testing similar scripts search');
    await page.waitForSelector('button:has-text("Find Similar")');
    await page.click('button:has-text("Find Similar")');
    await page.waitForSelector('.similar-scripts', { timeout: 30000 });
    await takeScreenshot(page, '07-similar-scripts');
    
    // Step 8: Test knowledge section
    logStep('Step 8: Testing knowledge section');
    await page.waitForSelector('a[href="/knowledge"]');
    await page.click('a[href="/knowledge"]');
    await page.waitForSelector('.knowledge-section');
    await page.type('.message-input', 'What is PowerShell?');
    await page.click('button:has-text("Send")');
    await page.waitForSelector('.assistant-message', { timeout: 60000 }); // Assistant response might take longer
    await takeScreenshot(page, '08-knowledge-section');
    
    // Step 9: Delete the script
    logStep('Step 9: Deleting the script');
    await page.waitForSelector('a[href="/scripts"]');
    await page.click('a[href="/scripts"]');
    await page.waitForSelector('.script-card');
    await scriptCards[0].click();
    await page.waitForSelector('button:has-text("Delete")');
    await page.click('button:has-text("Delete")');
    await page.waitForSelector('button:has-text("Confirm")');
    await page.click('button:has-text("Confirm")');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await takeScreenshot(page, '09-after-delete');
    
    // Step 10: Verify script was deleted
    logStep('Step 10: Verifying script was deleted');
    const remainingScriptCards = await page.$$('.script-card');
    if (remainingScriptCards.length === scriptCards.length) {
      throw new Error('Script was not deleted');
    }
    await takeScreenshot(page, '10-scripts-after-delete');
    
    // Step 11: Logout
    logStep('Step 11: Logging out');
    await page.waitForSelector('.user-menu');
    await page.click('.user-menu');
    await page.waitForSelector('button:has-text("Logout")');
    await page.click('button:has-text("Logout")');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await takeScreenshot(page, '11-after-logout');
    
    logStep('All tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    // Take a screenshot of the failure
    const page = (await browser.pages())[0];
    await takeScreenshot(page, 'error-state');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testWebsite()
  .then(() => {
    console.log('Website test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Website test failed:', error);
    process.exit(1);
  });
