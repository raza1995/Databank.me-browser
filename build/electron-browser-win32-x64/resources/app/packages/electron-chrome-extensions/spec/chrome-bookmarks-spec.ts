// import { expect } from 'chai'
// import { app, BrowserWindow } from 'electron'
// import { emittedOnce } from './events-helpers'

// import { useExtensionBrowser, useServer } from './hooks'

// describe('chrome.tabs', () => {
//   const server = useServer()
//   const browser = useExtensionBrowser({
//     url: server.getUrl,
//     extensionName: 'rpc',
//   })



//   describe('create()', () => {
//     it('creates a Bookmark', async () => {
//       const wcPromise = emittedOnce(app, 'web-contents-created')
//       const tabInfo = await browser.crx.exec('bookmarks.create', { url: server.getUrl() })
//       const [, wc] = await wcPromise
//       // expect(tabInfo).to.be.an('object')
//       // expect(tabInfo.id).to.equal(wc.id)
//       // expect(tabInfo.active).to.equal(true)
//       // expect(tabInfo.url).to.equal(server.getUrl())
//       // expect(tabInfo.windowId).to.equal(browser.window.id)
//       // expect(tabInfo.title).to.be.a('string')
//     })

//     // // TODO: Navigating to chrome-extension:// receives ERR_BLOCKED_BY_CLIENT (-20)
//     // it.skip('resolves relative URL', async () => {
//     //   const relativeUrl = './options.html'
//     //   const tabInfo = await browser.crx.exec('tabs.create', { url: relativeUrl })
//     //   const url = new URL(relativeUrl, browser.extension.url).href
//     //   expect(tabInfo).to.be.an('object')
//     //   expect(tabInfo.url).to.equal(url)
//     // })

//     // it('fails on chrome:// URLs', async () => {
//     //   const tabInfo = await browser.crx.exec('tabs.create', { url: 'chrome://kill' })
//     //   expect(tabInfo).to.be.a('null')
//     // })

//     // it('fails on javascript: URLs', async () => {
//     //   const tabInfo = browser.crx.exec('tabs.create', { url: "javascript:alert('hacked')" })
//     //   expect(await tabInfo).to.be.a('null')
//     // })
//   })


//   describe('getTree()', () => {
//    it('returns Bookmark details', async () => {
//     const newLocal = 'bookmarks.getTree'
//      // const tabId = browser.window.webContents.id
//      const result = await browser.crx.exec(newLocal)
//      console.log("bookmark-spec.ts", result)
//      expect(result).to.be.an('object')
//      // expect(result.id).to.equal(tabId)
//      // expect(result.windowId).to.equal(browser.window.id)
//    })
//  })





// })
