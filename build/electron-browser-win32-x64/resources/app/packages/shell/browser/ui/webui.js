
class WebUI {
 windowId = -1
 activeTabId = -1
 tabList = []

 constructor() {
  const $ = document.querySelector.bind(document)


  this.$ = {
   tabList: $('#tabstrip .tab-list'),
   tabTemplate: $('#tabtemplate'),
   createTabButton: $('#createtab'),
   goBackButton: $('#goback'),
   goForwardButton: $('#goforward'),
   reloadButton: $('#reload'),
   addressUrl: $('#addressurl'),
   body: $('body'),
   browserActions: $('#actions'),
   bookmark: $('#bookmark'),
   savebookmark: $('#savebookmark'),
   bookmarklist: $('#bookmarklist'),
   listBookmark: $('#data-container'),
   minimizeButton: $('#minimize'),
   maximizeButton: $('#maximize'),
   closeButton: $('#close'),
  }

  try {

  } catch (error) {

  }
  this.$.createTabButton?.addEventListener('click', () => chrome.tabs.create())

  this.$.goBackButton?.addEventListener('click', () => chrome.tabs.goBack())
  this.$.goForwardButton?.addEventListener('click', () => chrome.tabs.goForward())
  this.$.reloadButton?.addEventListener('click', () => chrome.tabs.reload())
  this.$.addressUrl?.addEventListener('keypress', this.onAddressUrlKeyPress.bind(this))
  this.$.addressUrl?.addEventListener('did-finish-load', this.onAddressUrlKeyPress)

  this.$.addressUrl?.addEventListener('did-finish-load', this.onAddressUrlKeyPress)


  // const loginButton = document.getElementById('login-button');
  // loginButton.addEventListener('click', () => {
  //  document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  //   // window.open('login.html', '_blank', 'width=500,height=500');
  // });


  let lastVisitTime = {}
  let domainTimes  = {}
    chrome.webNavigation.onBeforeNavigate.addListener((tab) => {

     let domain = new URL(tab.url).hostname;

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
     tab.timespent = `Time spent on ${domain}: ${hours} hours ${minutes % 60} minutes`;
     console.log(`Time spent on ${domain}: ${hours} hours ${minutes % 60} minutes`);


     // this.getUrl(tab)

    })




  // this.$.bookmark.addEventListener('click', () =>

  // chrome.bookmarks.create(bookmark, result)


  // )

  this.$.bookmark?.addEventListener('click', (e) =>

  this.saveBookmarkData(e)
 )


  this.$.savebookmark?.addEventListener('click', (e) =>

   this.getBookmarkData(e)


  )

  this.$.minimizeButton?.addEventListener('click', () =>
   chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, (win) => {
    chrome.windows.update(win.id, { state: win.state === 'minimized' ? 'normal' : 'minimized' })
   })
  )
  this.$.maximizeButton?.addEventListener('click', () =>
   chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, (win) => {
    chrome.windows.update(win.id, { state: win.state === 'maximized' ? 'normal' : 'maximized' })
   })
  )
  this.$.closeButton?.addEventListener('click', () => chrome.windows.remove())

  this.initTabs()
 }

 async initTabs() {
  const tabs = await new Promise((resolve) => chrome.tabs.query({ windowId: -2 }, resolve))
  this.tabList = [...tabs]
  this.renderTabs()

  const activeTab = this.tabList.find((tab) => tab.active)
  if (activeTab) {
   this.setActiveTab(activeTab)
  }

  // Wait to setup tabs and windowId prior to listening for updates.
  this.setupBrowserListeners()
 }

 setupBrowserListeners() {

  if (!chrome.tabs.onCreated) {
   throw new Error(`chrome global not setup. Did the extension preload not get run?`)
  }

  const findTab = (tabId) => {
   const existingTab = this.tabList.find((tab) => tab.id === tabId)
   return existingTab
  }

  const findOrCreateTab = (tabId) => {
   const existingTab = findTab(tabId)
   if (existingTab) return existingTab

   const newTab = { id: tabId }
   this.tabList.push(newTab)
   return newTab
  }

  chrome.tabs.onCreated.addListener((tab) => {
   if (tab.windowId !== this.windowId) return
   const newTab = findOrCreateTab(tab.id)
   Object.assign(newTab, tab)
   this.renderTabs()

  })

  chrome.tabs.onActivated.addListener((activeInfo) => {
   if (activeInfo.windowId !== this.windowId) return

   this.setActiveTab(activeInfo)
  })



  chrome.tabs.onUpdated.addListener((tabId, changeInfo, details) => {

   const tab = findTab(tabId)
   if (!tab) return
   Object.assign(tab, details)
   this.renderTabs()

   if (tabId === this.activeTabId) this.renderToolbar(tab)

  })

  chrome.tabs.onRemoved.addListener((tabId) => {
   const tabIndex = this.tabList.findIndex((tab) => tab.id === tabId)
   if (tabIndex > -1) {
    this.tabList.splice(tabIndex, 1)
    this.$.tabList.querySelector(`[data-tab-id="${tabId}"]`).remove()
   }
  })
 }

 setActiveTab(activeTab) {
  this.activeTabId = activeTab.id || activeTab.tabId
  this.windowId = activeTab.windowId

  for (const tab of this.tabList) {
   if (tab.id === this.activeTabId) {
    tab.active = true;
    this.renderTab(tab)
    this.renderToolbar(tab)
   } else {
    tab.active = false
   }
  }
 }

 onAddressUrlKeyPress(event) {
  if (event.code === 'Enter') {
    let url = this.$.addressUrl?.value;

    // Check if the URL doesn't start with 'http' or 'https'
    if (!url.startsWith('http') && !url.startsWith('https')) {
      url = 'https://' + url;
    }

    chrome.tabs.update({ url });
  }
}


 createTabNode(tab) {
  const tabElem = this.$.tabTemplate?.content.cloneNode(true).firstElementChild

try {
 tabElem.dataset.tabId = tab.id
} catch (error) {

}
  tabElem?.addEventListener('click', () => {
   chrome.tabs.update(tab.id, { active: true })
  })
  tabElem?.querySelector('.close').addEventListener('click', () => {
   chrome.tabs.remove(tab.id)
  })

  this.$.tabList?.appendChild(tabElem)
  return tabElem
 }

 renderTab(tab) {
  let tabElem = this.$.tabList?.querySelector(`[data-tab-id="${tab.id}"]`)
  if (!tabElem) tabElem = this.createTabNode(tab)

  if (tab.active) {
   try {
    tabElem.dataset.active = ''
   } catch (error) {

   }

  } else {
   delete tabElem?.dataset.active
  }

  const favicon = tabElem?.querySelector('.favicon')
  if (tab.favIconUrl) {
try {
 favicon.src = tab.favIconUrl
} catch (error) {

}
  } else {
   delete favicon?.src
  }

try {
 tabElem.querySelector('.title').textContent = tab.title
 tabElem.querySelector('.audio').disabled = !tab.audible
} catch (error) {

}
 }

 renderTabs() {
  this.tabList.forEach(tab => {
   this.renderTab(tab)

  })
 }

 renderToolbar(tab) {
try {
 this.$.addressUrl.value = tab.url
} catch (error) {

}

  // this.$.browserActions.tab = tab.id
 }

 async saveBookmarkData(data) {
  chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
    var title = tabs[0].title; // Get the current tab's title
    var url = tabs[0].url;
    chrome.bookmarks.search({
      url: url,
      title: title
    }, function(results) {
     console.log("results");
     console.log(results);
      if (!results) {
        console.log('Bookmark already exists');
      } else {
        // Generate a random number between 0 and 1
        const randomNumber = Math.random();
        // Convert the number to a string and remove the "0." prefix
        const randomString = randomNumber.toString().substring(2);
        // Return the string with a prefix to make it a valid ID
        var bookmark = {
          id: "id_" + randomString,
          title: title,
          url: url
        };
        chrome.bookmarks.create(bookmark, function(result) {
          console.log('Saved bookmark: ' + result.title + ' (' + result.url + ')');
        });
      }
    });
  });
}





 async  getBookmarkData(e) {


 chrome.bookmarks.getTree(true,function  (tree)   {

  const container =  document.getElementById('data-container');
  container.innerText = 'ddddddddddd'


  console.log("tree", tree)
  const listItems = tree.map(items => `<li>${items.title}</li>`)
  console.log("listItems", listItems)
  // this.listBookmark = listItems
  container.innerHTML += `<p>${item.name} - Lat: ${item.latitude}, Long: ${item.longitude}</p>`;
  container.appendChild(item);


 })

}



 // async getUrl(e) {
 //  localStorage.setItem("lastname", "Smith");


 //  var currentdate = new Date();
 //  var raw = JSON.stringify({
 //   "data": e.url,
 //   "time": currentdate,
 //   "timespent": e.timespent,

 //  });

 //  var requestOptions = {
 //   method: "POST",
 //   headers:  {
 //    'access-token': 'dbme_fdcddc51d677aa9d0377e5291f9360d3',
 //    'Content-Type': 'application/json'
 //  },
 //   mode: "cors",
 //   body:raw,
 //  };

 //  fetch("https://apiv1.databankme.vercel.app/api/mysearch/data/insert", requestOptions)
 //   .then(response => response)
 //   .then(result => console.log(result))
 //   .catch(error => console.log('error', error));

 // }
}

window.webui = new WebUI()
