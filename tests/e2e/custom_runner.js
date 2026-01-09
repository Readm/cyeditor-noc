const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting WSL E2E Test...');

    // Launch browser with robust flags for WSL/Container environments
    // To run in non-headless mode: export HEADLESS=false && node custom_runner.js
    const isHeadless = process.env.HEADLESS !== 'false';
    console.log(`Launching browser (Headless: ${isHeadless})...`);

    if (!isHeadless && !process.env.DISPLAY) {
        console.warn('WARNING: Running non-headless in WSL requires an X Server (WSLg or VcXsrv). DISPLAY env var is missing.');
    }

    const browser = await puppeteer.launch({
        headless: isHeadless,
        protocolTimeout: 120000, // Increase timeout for slow WSLg connections
        // slowMo: 50, // Uncomment to slow down operations for better visibility
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Prevent shared memory issues
            '--disable-gpu' // Keep disabled for stability even in GUI mode
        ]
    });

    try {
        const page = await browser.newPage();

        // Monitor page console
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // Set viewport to a reasonable desktop size
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Navigating to http://localhost:8080...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

        console.log('Selecting example network...');
        // Select 'ring_4node.json'
        // The first select is likely the example selector based on App.vue structure
        await page.select('select', 'ring_4node.json');

        console.log('Clicking "Load Example"...');
        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const target = buttons.find(b => b.textContent.includes('加载示例'));
            if (target) {
                target.click();
                return true;
            }
            return false;
        });

        if (!clicked) {
            throw new Error('Load Example button not found');
        }

        console.log('Waiting for CyEditor to initialize and load nodes...');
        await page.waitForFunction('window.cy && window.cy.nodes().length > 0', { timeout: 10000 });

        // Verify Sidebar layout
        console.log('Verifying Sidebar layout...');
        await page.waitForSelector('.right-sidebar', { timeout: 5000 });
        await page.waitForSelector('.right-sidebar', { timeout: 5000 });
        await page.waitForSelector('#navigator-container', { timeout: 5000 });

        // Debug Navigator Style
        await page.evaluate(() => {
            const nav = document.querySelector('.cytoscape-navigator');
            if (nav) {
                const style = window.getComputedStyle(nav);
                console.log('DEBUG: Navigator Style ->', {
                    position: style.position,
                    top: style.top,
                    left: style.left,
                    width: style.width,
                    height: style.height,
                    zIndex: style.zIndex
                });
            } else {
                console.log('DEBUG: Navigator not found in DOM');
            }
        });

        // Let animation/layout settle
        await new Promise(r => setTimeout(r, 2000));

        console.log('Locating a node to trigger select...');
        await page.evaluate(() => {
            const cy = window.cy;
            const node = cy.nodes().first();
            if (!node || node.length === 0) {
                throw new Error('No nodes found in the graph!');
            }
            console.log('Triggering "select" on node:', node.id());
            node.select();
        });

        console.log('Waiting for Property Panel to appear in Sidebar...');
        try {
            // Wait for the panel inside the sidebar property section
            await page.waitForSelector('.property-section .property-panel', { timeout: 10000 });
            console.log('SUCCESS: Property Panel appeared in sidebar!');

            // Verify Sidebar Toggle
            console.log('Testing Sidebar toggle...');
            await page.click('.toggle-btn');
            await new Promise(r => setTimeout(r, 500)); // Wait for transition

            const collapsed = await page.evaluate(() => {
                return document.querySelector('.right-sidebar').classList.contains('collapsed');
            });

            if (collapsed) {
                console.log('SUCCESS: Sidebar collapsed.');
            } else {
                console.warn('WARNING: Sidebar did not likely collapse visually.');
            }

            // Re-expand for screenshot
            await page.click('.toggle-btn');
            await new Promise(r => setTimeout(r, 500));

            // Take success screenshot
            await page.screenshot({ path: 'tests/e2e/layout_verification.png' });
            console.log('Screenshot saved to tests/e2e/layout_verification.png');

        } catch (e) {
            console.error('FAILURE: Property Panel check failed.');
            await page.screenshot({ path: 'tests/e2e/layout_failure.png' });
            throw e;
        }

    } catch (err) {
        console.error('Test FAILED:', err);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
