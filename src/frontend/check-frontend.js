const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error.message));
  page.on('error', error => console.log('Error:', error.message));
  
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });
  
  // Get page content
  const content = await page.content();
  console.log('Page content length:', content.length);
  
  // Check if root element has content
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : 'No root element';
  });
  
  console.log('Root element content:', rootContent.substring(0, 200));
  
  await browser.close();
})();
EOF < /dev/null