const { EventEmitter } = require('events')
const { BrowserView } = require('electron')

const toolbarHeight = 62

class Bookmarks {
  constructor(parentWindow) {
    this.view = new BrowserView()
    this.id = this.view.webContents.id
    this.window = parentWindow
    this.webContents = this.view.webContents
    this.window.addBrowserView(this.view)
  }


  reload() {
    this.view.webContents.reload()
  }
}

class Bookmarks extends EventEmitter {
  tabList = []
  selected = null

  constructor(browserWindow) {
    super()
    this.window = browserWindow
  }



  create() {
   console.log("Raza");
    const tab = new Bookmarks(this.window)
    this.tabList.push(tab)
    if (!this.selected) this.selected = tab
    tab.show() // must be attached to window
    this.emit('Bookmark-created', tab)
    this.select(tab.id)
    return tab
  }


}

exports.Bookmarks = Bookmarks
