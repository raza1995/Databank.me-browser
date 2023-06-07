const path = require('path')
const { promises: fs } = require('fs')
const { app, session, BrowserWindow, ipcMain, contextBridge } = require('electron')
const { Tabs } = require('./tabs')
const WebNavigationAPI = require('electron-chrome-extensions')
const { ElectronChromeExtensions } = require('electron-chrome-extensions')
const { globalShortcut } = require('electron');
const { setupMenu } = require('./menu')
const { buildChromeContextMenu } = require('electron-chrome-context-menu')
const debug = require('electron-debug');
var FetchStream = require("fetch").FetchStream;
let webuiExtensionId
const Store = require('electron-store');
const axios = require('axios');
const store = new Store();

// const fetch = require('node-fetch');
const manifestExists = async (dirPath) => {
 if (!dirPath) return false
 const manifestPath = path.join(dirPath, 'manifest.json')
 try {
  return (await fs.stat(manifestPath)).isFile()
 } catch {
  return false
 }
}

async function loadExtensions(session, extensionsPath) {
 console.log('loadExtensions')
 const subDirectories = await fs.readdir(extensionsPath, {
  withFileTypes: true,
 })

 const extensionDirectories = await Promise.all(
  subDirectories
   .filter((dirEnt) => dirEnt.isDirectory())
   .map(async (dirEnt) => {
    const extPath = path.join(extensionsPath, dirEnt.name)

    if (await manifestExists(extPath)) {
     return extPath
    }

    const extSubDirs = await fs.readdir(extPath, {
     withFileTypes: true,
    })

    const versionDirPath =
     extSubDirs.length === 1 && extSubDirs[0].isDirectory()
      ? path.join(extPath, extSubDirs[0].name)
      : null

    if (await manifestExists(versionDirPath)) {
     return versionDirPath
    }
   })
 )

 const results = []

 for (const extPath of extensionDirectories.filter(Boolean)) {
  console.log(`Loading extension from ${extPath}`)
  try {
   const extensionInfo = await session.loadExtension(extPath)
   results.push(extensionInfo)
  } catch (e) {
   console.error(e)
  }
 }

 return results
}

const getParentWindowOfTab = (tab) => {

 switch (tab.getType()) {
  case 'window':

   return BrowserWindow.fromWebContents(tab)
  case 'browserView':
  case 'webview':
   return tab.getOwnerBrowserWindow()
  case 'backgroundPage':
   return BrowserWindow.getFocusedWindow()
  default:
   throw new Error(`Unable to find parent window of '${tab.getType()}'`)
 }
}

class TabbedBrowserWindow {
 constructor(options, sessionCookie) {
  this.session = options.session || session.defaultSession
  this.extensions = options.extensions

  // Can't inheret BrowserWindow
  // https://github.com/electron/electron/issues/23#issuecomment-19613241
  this.window = new BrowserWindow(options.window)

  this.id = this.window.id
  this.webContents = this.window.webContents
  this.webContents.setMaxListeners(20);
  const webuiUrl = path.join('chrome-extension://', webuiExtensionId, '/webui.html')
  this.webContents.loadURL(webuiUrl)

  this.tabs = new Tabs(this.window)

  const self = this

  this.tabs.on('tab-created', function onTabCreated(tab) {
   if (options.initialUrl) tab.webContents.loadURL(options.initialUrl)

   // Track tab that may have been created outside of the extensions API.
   self.extensions.addTab(tab.webContents, tab.window)
  })

  this.tabs.on('tab-selected', function onTabSelected(tab) {
   self.extensions.selectTab(tab.webContents)
  })

  queueMicrotask(() => {
   console.log('queueMicrotask')
   // Create initial tab
   this.tabs.create()
  })
 }

 destroy() {
  this.tabs.destroy()
  this.window.destroy()
 }

 getFocusedTab() {
  console.log('getFocusedTab')
  return this.tabs.selected
 }
}

class Browser {
 windows = []

 constructor() {
  app.whenReady().then(this.init.bind(this))

  app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
    this.destroy()
   }
  })

  app.on('web-contents-created', this.onWebContentsCreated.bind(this))
 }

 destroy() {
  app.quit()
 }
 keyevents(events) {


  return win.tabs.events(events)
 }

 getFocusedWindow() {

  console.log('getFocusedWindow')
  return this.windows.find((w) => w.window.isFocused()) || this.windows[0]
 }

 getWindowFromBrowserWindow(window) {
  console.log('getWindowFromBrowserWindow')
  return !window.isDestroyed() ? this.windows.find((win) => win.id === window.id) : null
 }

 getWindowFromWebContents(webContents) {
  let window
  console.log('getWindowFromWebContents')
  if (this.popup && webContents === this.popup.browserWindow?.webContents) {
   window = this.popup.parent
  } else {
   window = getParentWindowOfTab(webContents)
  }

  return window ? this.getWindowFromBrowserWindow(window) : null
 }

 async init() {
  this.initSession()
  setupMenu(this)

  const browserPreload = path.join(__dirname, '../preload.js')
  this.session.setPreloads([browserPreload])

  this.extensions = new ElectronChromeExtensions({
   session: this.session,

   createTab: (details) => {
    const win =
     typeof details.windowId === 'number' &&
     this.windows.find((w) => w.id === details.windowId)

    if (!win) {
     throw new Error(`Unable to find windowId=${details.windowId}`)
    }

    const tab = win.tabs.create()

    if (details.url) tab.loadURL(details.url || newTabUrl)
    if (typeof details.active === 'boolean' ? details.active : true) win.tabs.select(tab.id)

    return [tab.webContents, tab.window]
   },
   getBookmarkList: (details) => {
    console.log('getBookmarkList');
    const win =
     typeof details.windowId === 'number' &&
     this.windows.find((w) => w.id === details.windowId)

    if (!win) {
     throw new Error(`Unable to find windowId=${details.windowId}`)
    }
    const bookmarkPage = path.join('chrome-extension://', webuiExtensionId, 'new-tab.html')
    const tab = win.tabs.create()
    tab.loadURL(bookmarkPage)
    // if (details.url) tab.loadURL('file://' + __dirname + '/packages/shell/browser/ui/new-tab.html')
    if (typeof details.active === 'boolean' ? details.active : true) win.tabs.select(tab.id)

    // this.createWindow({ initialUrl: newTabUrl })
    //  this.extensions.on('browser-action-popup-created', (popup) => {
    //   this.popup = popup
    // })

    //  const webuiExtension = await this.session.loadExtension(path.join(__dirname, 'ui'))
    //  webuiExtensionId = webuiExtension.id

    //  const newTabUrl = path.join('chrome-extension://', webuiExtensionId, 'new-tab.html')

    //  const installedExtensions = await loadExtensions(
    //    this.session,
    //    path.join(__dirname, '../../../extensions')
    //  )

    //  this.createWindow({ initialUrl: newTabUrl })



    return [tab.webContents, tab.window]
   },
   selectTab: (tab, browserWindow) => {
    const win = this.getWindowFromBrowserWindow(browserWindow)
    win?.tabs.select(tab.id)
   },
   removeTab: (tab, browserWindow) => {
    const win = this.getWindowFromBrowserWindow(browserWindow)
    win?.tabs.remove(tab.id)
   },

   createWindow: (details) => {
    console.log('createWindow')
    const win = this.createWindow({
     initialUrl: details.url || newTabUrl,
    })
    // if (details.active) tabs.select(tab.id)
    return win.window
   },
   removeWindow: (browserWindow) => {
    const win = this.getWindowFromBrowserWindow(browserWindow)
    win?.destroy()
   },
  })

  this.extensions.on('browser-action-popup-created', (popup) => {
   this.popup = popup
  })

  const webuiExtension = await this.session.loadExtension(path.join(__dirname, 'ui'))
  webuiExtensionId = webuiExtension.id

  const newTabUrl = path.join('https://google.com')
 
  const installedExtensions = await loadExtensions(
   this.session,
   path.join(__dirname, '../../../extensions')
  )
  // store.delete('authData');
  const authData = store.get('authData');

  if (!authData) {
    // If auth data is not found, open a new login window
    this.createLoginWindow({ initialUrl: newTabUrl })
   
  } else {
   const newTabUrl = path.join('https://google.com')
    const sessionToken = authData;
   
    // If auth data is found, open a new window with the session token
    this.createWindow({ initialUrl: newTabUrl })
  }
  //

 }

 initSession() {
  this.session = session.defaultSession

  // Remove Electron and App details to closer emulate Chrome's UA
  const userAgent = this.session
   .getUserAgent()
   .replace(/\sElectron\/\S+/, '')
   .replace(new RegExp(`\\s${app.getName()}/\\S+`), '')
  this.session.setUserAgent(userAgent)


 }


 createWindow(options) {

  const win = new TabbedBrowserWindow({
   ...options,
   extensions: this.extensions,
   window: {
    width: 1280,
    height: 720,
    frame: false,
    icon: path.join(__dirname, '../3232dbme.jpg'),
    webPreferences: {
     sandbox: true,
     nodeIntegration: false,
     enableRemoteModule: false,
     contextIsolation: true,
     worldSafeExecuteJavaScript: true,
    },
   },
  })
  this.windows.push(win)

  if (process.env.SHELL_DEBUG) {
   win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
 }


 async getBookmarkList() {
  console.log("main.js")


  this.extensions.on('browser-action-popup-created', (popup) => {
   this.popup = popup
  })

  const webuiExtension = await this.session.loadExtension(path.join(__dirname, 'ui'))
  webuiExtensionId = webuiExtension.id

  const newTabUrl = path.join('chrome-extension://', webuiExtensionId, 'new-tab.html')

  const installedExtensions = await loadExtensions(
   this.session,
   path.join(__dirname, '../../../extensions')
  )

  this.createWindow({ initialUrl: newTabUrl })

 }
 async createLoginWindow(details){


  // if (details.active) tabs.select(tab.id)

  // Create the browser window.
 const  win = new BrowserWindow({ width: 800, height: 600
 ,
 webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
 }

  })
  // win.webContents.openDevTools()
  win.setMenu(null);
  // Load the login page by default.
  win.loadURL(`file://${__dirname}/ui/login.html`)

  // Load the login page when user is unauthenticated.
  ipcMain.on("unauthenticated", (event) => {
    resetValidatedLicenses()

    win.loadURL(`file://${__dirname}/ui/login.html`)
  })
  ipcMain.on("authenticated",  (event, data) => {
    const newTabUrl = path.join('https://google.com')
   console.log(data);
   store.set('authData', data.data);
      this.destroy()
   this.createWindow({ initialUrl: newTabUrl })

  })
  // // Load our app when user is authenticated.
  // ipcMain.on("authenticated", async event => {
  //   win.loadURL(`file://${__dirname}/index.html`)

  //   if (env.NODE_ENV === 'development') {
  //     return // Skip updates on development env
  //   }

  //   // Attempt to update the app after the user is authenticated
  //   const { licenses } = await getLicenses()
  //   if (!Object.values(licenses).some(l => Object.keys(l).length)) {
  //     return
  //   }

  //   // Use first available license key that's valid for updates
  //   const [license] = Object.values(licenses).filter(l => l.meta && l.meta.valid)
  //   if (!license) {
  //     return
  //   }

  //   if (lastUpdateAttemptAt != null && ((+new Date) - lastUpdateAttemptAt) < 43200000 /* every 12 hours */) {
  //     return
  //   } else {
  //     lastUpdateAttemptAt = +new Date
  //   }

  //   const { key } = license.data.attributes
  //   autoUpdater.setFeedURL(`https://dist.keygen.sh/v1/${accountId}/${productId}/update/${platform}/zip/${app.getVersion()}?key=${key}`)

  //   autoUpdater.on('error', err => win.webContents.send('error', err))
  //   autoUpdater.on('checking-for-update', () => win.webContents.send('log', 'checking-for-update', autoUpdater.getFeedURL()))
  //   autoUpdater.on('update-available', () => win.webContents.send('log', 'update-available', autoUpdater.getFeedURL()))
  //   autoUpdater.on('update-not-available', () => win.webContents.send('log', 'update-not-available', autoUpdater.getFeedURL()))
  //   autoUpdater.on('update-downloaded', (...args) => {
  //     win.webContents.send('log', 'update-downloaded', autoUpdater.getFeedURL(), args)

  //     const choice = dialog.showMessageBox(win, {
  //       message: 'An update has been downloaded. Do you want to restart now to finish installing it?',
  //       title: 'Update is ready',
  //       type: 'question',
  //       buttons: [
  //         'Yes',
  //         'No'
  //       ]
  //     })

  //     if (choice === 0) {
  //       autoUpdater.quitAndInstall()
  //     }
  //   })

  //   autoUpdater.checkForUpdates()
  // })

  // Open the DevTools.
  // win.webContents.openDevTools()

  // // Emitted when the window is closed.
  // win.on("closed", () => {
  //   // Dereference the window object, usually you would store windows
  //   // in an array if your app supports multi windows, this is the time
  //   // when you should delete the corresponding element.
  //   win = null
  // })

}

 async onWebContentsCreated(event, webContents) {
  console.log('createWindow')
  const type = webContents.getType()
  const url = webContents.getURL()

  console.log(`'web-contents-created' event [type:${type}, url:${url}]`)

  if (process.env.SHELL_DEBUG && webContents.getType() === 'backgroundPage') {
   webContents.openDevTools({ mode: 'detach', activate: true })
  }

  webContents.setWindowOpenHandler((details) => {

   console.log('setWindowOpenHandler')
   switch (details.disposition) {
    case 'foreground-tab':
     console.log('foreground-tab')
    case 'background-tab':
     console.log('background-tab')
    case 'new-window': {
     console.log('new-window')
     // setWindowOpenHandler doesn't yet support creating BrowserViews
     // instead of BrowserWindows. For now, we're opting to break
     // window.open until a fix is available.
     // https://github.com/electron/electron/issues/33383
     queueMicrotask(() => {
      console.log('queueMicrotask')
      const win = this.getWindowFromWebContents(webContents)
      const tab = win.tabs.create()
      tab.loadURL(details.url)
     })

     return { action: 'deny' }
    }
    default:
     return { action: 'allow' }
   }
  })

  webContents.on('context-menu', (event, params) => {
   console.log('webContents.on')
   const menu = buildChromeContextMenu({
    params,
    webContents,
    extensionMenuItems: this.extensions.getContextMenuItems(webContents, params),
    openLink: (url, disposition) => {
     const win = this.getFocusedWindow()

     switch (disposition) {
      case 'new-window':
       this.createWindow({ initialUrl: url })
       break
      default:
       const tab = win.tabs.create()
       tab.loadURL(url)


     }
    },
   })

   menu.popup()
  })
  let lastVisitTime = {}
  let domainTimes = {}

  function webhookgetUrl(e) {
   console.log(e)


 
   let domain = new URL(webContents.getURL()).hostname;
   console.log(domain,'domain')
   // Get the current time
   let currentTime = new Date();

   console.log('current time:', currentTime);

   // Check if the domain has been seen before
   if (domain in domainTimes) {
    // If so, increment the time spent on the domain by the time since the last visit
    console.log('domain exists:', domain);
    console.log('last visit time:', domainTimes[domain].lastVisitTime);
    domainTimes[domain].timeSpent += new Date() - domainTimes[domain].lastVisitTime;

   } else {
    // If not, initialize the time spent on the domain to 0
    console.log('new domain:', domain);
    domainTimes[domain] = {
     timeSpent: 0,
     lastVisitTime: currentTime,
    };
   }

   console.log('domain times:', domainTimes);

   // Record the time of the current visit for the next time a page is loaded
   domainTimes[domain].lastVisitTime = currentTime;

   console.log('updated domain times:', domainTimes);

   // Update the time spent on the domain
   domainTimes[domain].timeSpent += currentTime - domainTimes[domain].lastVisitTime;

   console.log('final domain times:', domainTimes);

   let minutes = Math.floor(domainTimes[domain].timeSpent / (1000 * 60));
   let hours = Math.floor(minutes / 60);
  let timespent = `Time spent on ${domain}: ${hours} hours ${minutes % 60} minutes`;
   console.log(`Time spent on ${domain}: ${hours} hours ${minutes % 60} minutes`);

   const authData = store.get('authData');
   const postData = {
    "data" : {
     "url": webContents.getURL(),
     "timespent": timespent,
     "domain": domain,
     },
     "type": e,
   };
   console.log(postData)
   const apiEndpoint = 'https://apiv1.databankme.vercel.app/api/mysearch/data/insert';
    // const apiEndpoint = 'https://webhook.site/dcbb87bc-6c4f-45e1-946d-126a630c1bf7';


   // Set up your POST request data


   // Set up your request options
   const options = {
    method: 'POST',
    headers: {
     'access-token': authData,
     'Content-Type': 'application/json'
    },
    data: postData,
   };

   // Send the POST request
   axios(apiEndpoint, options)
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
   webContents.executeJavaScript(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));`);
  }


  let previousUrl = '';
  let enterevent = false;
  webContents.on('before-input-event', (event, input) => {
    if (input.key === "Enter") {
     enterevent = true;
   }
});


webContents.on('did-finish-load', (event) => {

 console.log('Navigated to:', webContents.getURL());


 if (webContents.getURL() !== previousUrl  ) {
  previousUrl = webContents.getURL();
  const myString = webContents.getURL();
  if (myString.indexOf('chrome-extension://') === -1) {
   if (enterevent) {
    webhookgetUrl(1);
  } else {
    webhookgetUrl(2);
  }
  
  }
}
enterevent = false;
 
});




 }
}

module.exports = Browser
