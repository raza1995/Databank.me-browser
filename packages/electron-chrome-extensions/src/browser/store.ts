import { BrowserWindow, webContents } from 'electron'
import { EventEmitter } from 'events'
import { ContextMenuType } from './api/common'
import { ChromeExtensionImpl } from './impl'
import { ExtensionEvent } from './router'


const debug = require('debug')('electron-chrome-extensions:store')

export class ExtensionStore extends EventEmitter {
  /** Tabs observed by the extensions system. */
  tabs = new Set<Electron.WebContents>()

  /** Windows observed by the extensions system. */
  windows = new Set<Electron.BrowserWindow>()

  lastFocusedWindowId?: number

  /**
   * Map of tabs to their parent window.
   *
   * It's not possible to access the parent of a BrowserView so we must manage
   * this ourselves.
   */
  tabToWindow = new WeakMap<Electron.WebContents, Electron.BrowserWindow>()

  /** Map of windows to their active tab. */
  private windowToActiveTab = new WeakMap<Electron.BrowserWindow, Electron.WebContents>()

  tabDetailsCache = new Map<number, Partial<chrome.tabs.Tab>>()
  windowDetailsCache = new Map<number, Partial<chrome.windows.Window>>()

  constructor(public impl: ChromeExtensionImpl) {
    super()
  }

  getWindowById(windowId: number) {
    return Array.from(this.windows).find(
      (window) => !window.isDestroyed() && window.id === windowId
    )
  }

  getLastFocusedWindow() {
    return this.lastFocusedWindowId ? this.getWindowById(this.lastFocusedWindowId) : null
  }

  getCurrentWindow() {
    return this.getLastFocusedWindow()
  }
  getMyUrl(){
   return "PopupView.ts"
  }
  addWindow(window: Electron.BrowserWindow) {
    if (this.windows.has(window)) return

    this.windows.add(window)

    if (typeof this.lastFocusedWindowId !== 'number') {
      this.lastFocusedWindowId = window.id
    }

    this.emit('window-added', window)
  }

  async createWindow(event: ExtensionEvent, details: chrome.windows.CreateData) {
    if (typeof this.impl.createWindow !== 'function') {
      throw new Error('createWindow is not implemented')
    }

    const win = await this.impl.createWindow(details)

    this.addWindow(win)

    return win
  }

  async removeWindow(window: Electron.BrowserWindow) {
    if (!this.windows.has(window)) return

    this.windows.delete(window)

    if (typeof this.impl.removeWindow === 'function') {
      await this.impl.removeWindow(window)
    } else {
      window.destroy()
    }
  }

  getTabById(tabId: number) {
    return Array.from(this.tabs).find((tab) => !tab.isDestroyed() && tab.id === tabId)
  }

  addTab(tab: Electron.WebContents, window: Electron.BrowserWindow) {
    if (this.tabs.has(tab)) return

    this.tabs.add(tab)
    this.tabToWindow.set(tab, window)
    this.addWindow(window)

    const activeTab = this.getActiveTabFromWebContents(tab)
    if (!activeTab) {
      this.setActiveTab(tab)
    }

    this.emit('tab-added', tab)
  }

  removeTab(tab: Electron.WebContents) {
    if (!this.tabs.has(tab)) return

    const tabId = tab.id
    const win = this.tabToWindow.get(tab)!

    this.tabs.delete(tab)
    this.tabToWindow.delete(tab)

    // TODO: clear active tab

    // Clear window if it has no remaining tabs
    const windowHasTabs = Array.from(this.tabs).find((tab) => this.tabToWindow.get(tab) === win)
    if (!windowHasTabs) {
      this.windows.delete(win)
    }

    if (typeof this.impl.removeTab === 'function') {
      this.impl.removeTab(tab, win)
    }

    this.emit('tab-removed', tabId)
  }

  async createTab(details: chrome.tabs.CreateProperties) {
    if (typeof this.impl.createTab !== 'function') {
      throw new Error('createTab is not implemented')
    }

    // Fallback to current window
    if (!details.windowId) {
      details.windowId = this.lastFocusedWindowId
    }

    const result = await this.impl.createTab(details)

    if (!Array.isArray(result)) {
      throw new Error('createTab must return an array of [tab, window]')
    }

    const [tab, window] = result

    if (typeof tab !== 'object' || !webContents.fromId(tab.id)) {
      throw new Error('createTab must return a WebContents')
    } else if (typeof window !== 'object') {
      throw new Error('createTab must return a BrowserWindow')
    }

    this.addTab(tab, window)

    return tab
  }

 //  ipcMain.handle('createBookmark', async (event, args) => {
 //   const { parentId, title, url } = args;
 //   const newBookmark = await bookmarks.create({ parentId, title, url });
 //   return newBookmark;
 // });


 createBookmark(details: chrome.bookmarks.BookmarkCreateArg){

    console.log('store.ts',details)
    return details
  }
  searchBookmark(details: chrome.bookmarks.BookmarkSearchQuery){

   console.log('store.ts',details)
   return details
 }

  async getBookmark(details: chrome.tabs.CreateProperties){
   console.log('getBookmark');

  // Fallback to current window
  if (!details.windowId) {
    details.windowId = this.lastFocusedWindowId
  }


   if (typeof this.impl.getBookmarkList !== 'function') {
    throw new Error('getBookmarkList is not implemented')
  }
   console.log('store.ts getBookmark',details)
   const result = await this.impl.getBookmarkList(details)

   if (!Array.isArray(result)) {
    throw new Error('createTab must return an array of [tab, window]')
  }

  const [tab, window] = result

  if (typeof tab !== 'object' || !webContents.fromId(tab.id)) {
    throw new Error('createTab must return a WebContents')
  } else if (typeof window !== 'object') {
    throw new Error('createTab must return a BrowserWindow')
  }

  this.addTab(tab, window)

  return tab

 }

 // async create(win: Electron.BrowserWindow){
 // const  bookmark = {
 //   title: 'Google',
 //   url: 'https://www.google.com',
 // }
 //  console.log("store.ts",bookmark)
 //  return chrome.bookmarks.create(bookmark);
 // }


 // async getBookmarkTree(event: ExtensionEvent, details: chrome.bookmarks.BookmarkTreeNode){
 //  const bookmarkTree = await chrome.bookmarks.getTree(details);
 //  return bookmarkTree;
 // }
  getTree(callback: (bookmarks: chrome.bookmarks.BookmarkTreeNode[]) => void) {
   return callback
}
search(callback: (query: chrome.bookmarks.BookmarkSearchQuery,bookmarks: chrome.bookmarks.BookmarkTreeNode[]) => void) {
 return callback
}
  getActiveTabFromWindow(win: Electron.BrowserWindow) {
    const activeTab = win && !win.isDestroyed() && this.windowToActiveTab.get(win)
    return (activeTab && !activeTab.isDestroyed() && activeTab) || undefined
  }

  getActiveTabFromWebContents(wc: Electron.WebContents): Electron.WebContents | undefined {
    const win = this.tabToWindow.get(wc) || BrowserWindow.fromWebContents(wc)
    return win ? this.getActiveTabFromWindow(win) : undefined
  }

  getActiveTabOfCurrentWindow() {
    const win = this.getCurrentWindow()
    return win ? this.getActiveTabFromWindow(win) : undefined
  }

  setActiveTab(tab: Electron.WebContents) {
    const win = this.tabToWindow.get(tab)
    if (!win) {
      throw new Error('Active tab has no parent window')
    }

    const prevActiveTab = this.getActiveTabFromWebContents(tab)

    this.windowToActiveTab.set(win, tab)

    if (tab.id !== prevActiveTab?.id) {
      this.emit('active-tab-changed', tab, win)

      if (typeof this.impl.selectTab === 'function') {
        this.impl.selectTab(tab, win)
      }
    }
  }





  buildMenuItems(extensionId: string, menuType: ContextMenuType): Electron.MenuItem[] {
    // This function is overwritten by ContextMenusAPI
    return []
  }
}
