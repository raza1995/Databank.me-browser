import { BrowserWindow } from 'electron'
import { ExtensionContext } from '../context'
import { ExtensionEvent } from '../router'
const Store = require('electron-store');
const store = new Store();
const validateExtensionUrl = (url: string, extension: Electron.Extension) => {
  // Convert relative URLs to absolute if needed
  try {
    url = new URL(url, extension.url).href
  } catch (e) {
    throw new Error('Invalid URL')
  }

  // Prevent creating chrome://kill or other debug commands
  if (url.startsWith('chrome:') || url.startsWith('javascript:')) {
    throw new Error('Invalid URL')
  }

  return url
}
export class BookmarksAPI {
  static TAB_ID_NONE = -1
  static WINDOW_ID_NONE = -1
  static WINDOW_ID_CURRENT = -2

  constructor(private ctx: ExtensionContext) {
    const handle = this.ctx.router.apiHandler()
    handle('bookmarks.create', this.create.bind(this))
    handle('bookmarks.getTree', this.getTree.bind(this))
    handle('bookmarks.search', this.search.bind(this))
  }

  private async create(event: ExtensionEvent, details: chrome.bookmarks.BookmarkCreateArg = {}) {

    const url = details.url ? validateExtensionUrl(details.url, event.extension) : undefined


     const bookmark = await this.ctx.store.createBookmark({ ...details, url })
     const bookmarkDetails = bookmark
     let myArray = store.get('myArray');
     if (!Array.isArray(myArray)) {
       myArray = [];
     }

     myArray.push(bookmarkDetails);
     store.set('myArray', myArray);
    return true
  }
  private async search(event: ExtensionEvent, details: chrome.bookmarks.BookmarkSearchQuery) {
   const bookmark = await this.ctx.store.searchBookmark({ ...details });
   if (!bookmark) {
     // Bookmark does not exist
     return true;
   } else {
     // Bookmark exists in store
     let myArray = store.get('myArray');
     if (!Array.isArray(myArray)) {
       myArray = [];
     }
     const index = myArray.findIndex((b: any) => b.url === bookmark.url);
     if (index !== -1) {
       // Bookmark exists in myArray
       return false;
     } else {
       // Bookmark does not exist in myArray
       return true;
     }
   }
 }

  private async getTree(event: ExtensionEvent, details: chrome.bookmarks.BookmarkTreeNode) {

    if (details) {
      const bookmark = await this.ctx.store.getBookmark({...details})
      return store.get('myArray')
    } else {
      return store.get('myArray')
    }

    console.log("getTree function in bookmark.ts", details)
  }




  onActivated(tabId: number) {
    const tab = this.ctx.store.getTabById(tabId)
    if (!tab) return

    const activeTab = this.ctx.store.getActiveTabFromWebContents(tab)
    const activeChanged = activeTab?.id !== tabId
    if (!activeChanged) return

    const win = this.ctx.store.tabToWindow.get(tab)

    this.ctx.store.setActiveTab(tab)

    // invalidate cache since 'active' has changed
    this.ctx.store.tabDetailsCache.forEach((tabInfo, cacheTabId) => {
      tabInfo.active = tabId === cacheTabId
    })

    this.ctx.router.broadcastEvent('tabs.onActivated', {
      tabId,
      windowId: win?.id,
    })
  }
}
