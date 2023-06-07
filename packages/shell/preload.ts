import { injectBrowserAction } from 'electron-chrome-extensions/dist/browser-action'
console.log('preload.js', location.pathname)
// Inject <browser-action-list> element into WebUI
if (location.protocol === 'chrome-extension:' && (location.pathname === '/webui.html' || location.pathname === '/new-tab.html' || location.pathname === '/login.html')) {
  injectBrowserAction()
}
