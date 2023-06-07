// const WebUI = require('./webui')
 // const webui = new WebUI()




 window.addEventListener('load', function() {
  console.log('DOM is loaded')

  // select the input field and button element from the HTML page
  const container = document.getElementById('data-container');
  const searchInput = document.querySelector("#searchInput");
  const searchButton = document.querySelector("#searchButton");

  // select the ul element from the HTML page
  chrome.bookmarks.getTree(false, function(tree) {
    // generate HTML code for each item using map()
    const listItems = tree.map(item => {
      return `<li>${item.title} - ${item.url} </li>`;
    });

    // add the generated HTML code to the ul element
    container.innerHTML = listItems.join("");

    // function to filter data based on user input
    function searchForData() {

      const searchTerm = searchInput.value.toLowerCase();
      const filteredItems = tree.filter(item => {
       console.log('items',item.title);
        return item.title.toLowerCase().includes(searchTerm);
      });
      displayItems(filteredItems);
    }

    // function to display items in the item list element
    function displayItems(items) {
      const itemElements = items.map(item => {
        return `<li>${item.title} - ${item.url}</li>`;
      });
      container.innerHTML = itemElements.join("");
    }

    // add event listener to search button
    searchButton.addEventListener("click", searchForData);
  });
});
