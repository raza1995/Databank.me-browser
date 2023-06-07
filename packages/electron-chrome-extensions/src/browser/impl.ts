/** App-specific implementation details for extensions. */
export interface ChromeExtensionImpl {
  createTab?(
    details: chrome.tabs.CreateProperties
  ): Promise<[Electron.WebContents, Electron.BrowserWindow]>
 //  createBookmark?(
 //   details: chrome.bookmarks.BookmarkCreateArg
 // ): Promise<[Electron.WebContents, Electron.BrowserWindow]>

 createBookmark?(details: chrome.bookmarks.BookmarkCreateArg): Promise<Electron.BrowserWindow>


  selectTab?(tab: Electron.WebContents, window: Electron.BrowserWindow): void
  removeTab?(tab: Electron.WebContents, window: Electron.BrowserWindow): void

  /**
   * Populate additional details to a tab descriptor which gets passed back to
   * background pages and content scripts.
   */
  assignTabDetails?(details: chrome.tabs.Tab, tab: Electron.WebContents): void
  getBookmarkList?(details: chrome.tabs.CreateProperties
   ): Promise<[Electron.WebContents, Electron.BrowserWindow]>
  createWindow?(details: chrome.windows.CreateData): Promise<Electron.BrowserWindow>
  removeWindow?(window: Electron.BrowserWindow): void

}


