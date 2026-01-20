const puppeteer = require('puppeteer')
const path = require('path');

(async () => {
  console.log('Starting WSL E2E Test...')

  // Launch browser with robust flags
  const isHeadless = process.env.HEADLESS !== 'false'
  console.log(`Launching browser (Headless: ${isHeadless})...`)

  if (!isHeadless && !process.env.DISPLAY) {
    console.warn('WARNING: Running non-headless in WSL requires an X Server. DISPLAY env var is missing.')
  }

  const browser = await puppeteer.launch({
    headless: isHeadless,
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  try {
    const page = await browser.newPage()
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    await page.setViewport({ width: 1280, height: 800 })

    console.log('Navigating to http://localhost:8080...')
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' })

    console.log('Selecting example network...')
    await page.select('select', 'ring_4node.json')

    console.log('Clicking "Load Example"...')
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const target = buttons.find(b => b.textContent.includes('加载示例'))
      if (target) { target.click(); return true }
      return false
    })

    if (!clicked) throw new Error('Load Example button not found')

    console.log('Waiting for CyEditor...')
    await page.waitForFunction('window.cy && window.cy.nodes().length > 0', { timeout: 30000 })

    // Verify Sidebar layout
    console.log('Verifying Sidebar layout...')
    await page.waitForSelector('.right-sidebar', { timeout: 5000 })
    await page.waitForSelector('#navigator-container', { timeout: 5000 })

    // Let animation settle
    await new Promise(r => setTimeout(r, 2000))

    console.log('Locating a node to trigger select...')
    await page.evaluate(() => {
      const cy = window.cy
      const node = cy.nodes().first()
      if (!node || node.length === 0) throw new Error('No nodes found!')
      console.log('Triggering "select" on node:', node.id())
      node.select()
    })

    console.log('Waiting for Property Panel...')
    try {
      await page.waitForSelector('.property-section .property-panel', { timeout: 10000 })
      console.log('SUCCESS: Property Panel appeared!')

      const editorExists = await page.waitForSelector('.jsoneditor', { timeout: 5000 }).then(() => true).catch(() => false)
      if (!editorExists) throw new Error('JSON Editor not found')
      console.log('SUCCESS: JSON Editor found!')

      // Feature Verification: Node Position Sync
      console.log('Verifying Node Position Sync...')
      await page.evaluate(() => {
        const node = window.cy.nodes().first()
        const pos = node.position()
        const newPos = { x: Math.round(pos.x + 50), y: Math.round(pos.y + 50) }

        // Move and emit dragfree
        node.position(newPos)
        node.emit('dragfree')
        console.log('Simulated dragfree on node:', node.id(), 'to', newPos)
      })

      await new Promise(r => setTimeout(r, 1000))

      // Verify Data Model via window.app (More robust than text scraping)
      const syncSuccess = await page.evaluate(() => {
        if (!window.app || !window.app.selectedElement) return false
        const data = window.app.selectedElement.data
        console.log('Current Selected Data:', JSON.stringify(data))
        return data && data.position && typeof data.position.x === 'number'
      })

      if (syncSuccess) {
        console.log('SUCCESS: Position synced to App data model!')
      } else {
        console.warn('WARNING: Position NOT found in App data model. Sync failed.')
        // Log the text content anyway for debug
        const jsonText = await page.evaluate(() => {
          const editor = document.querySelector('.jsoneditor')
          return editor ? editor.textContent : ''
        })
        console.log('JSON Editor Content:', jsonText.substring(0, 200))
      }

      // Screenshot paths relative to this script
      const successPath = path.join(__dirname, 'layout_verification.png')
      await page.screenshot({ path: successPath })
      console.log(`Screenshot saved to ${successPath}`)
    } catch (e) {
      console.error('FAILURE: Property Panel check failed.')
      const failPath = path.join(__dirname, 'layout_failure.png')
      await page.screenshot({ path: failPath })
      throw e
    }
  } catch (err) {
    console.error('Test FAILED:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
})()
