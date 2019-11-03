import {ajaxHandler} from '../ajax/ajax-handler.js';

export const profileSearcher = {
  offsetCounter: 0,
  searchPanel: '',
  searchButton: '',
  searchResult: '',
  loadMoreButton: '',
  search: function(element, offset, actions) {
    profileSearcher.searchPanel = element.closest('.dropdown');
    profileSearcher.searchResult = profileSearcher.searchPanel.querySelector('.profile-search-result');
    profileSearcher.searchButton = profileSearcher.searchPanel.querySelector('.profile-search-button');
    profileSearcher.loadMoreButton = profileSearcher.searchPanel.querySelector('.load-more-button');

    if (element == profileSearcher.searchButton) {
        profileSearcher.loadMoreButton.classList.remove('hidden');
        profileSearcher.searchResult.innerHTML = '';
        profileSearcher.offsetCounter = 0;
    } else if (element == profileSearcher.loadMoreButton) {
        profileSearcher.offsetCounter += offset;
    }

    profileSearcher.loadMoreButton.disabled = true;
    profileSearcher.searchButton.disabled = true;
    profileSearcher.searchPanel.classList.add('open');

    var profileSearchBox = profileSearcher.searchPanel.querySelector('.profile-search-box');
    var url = '/profile/search?query=' + profileSearchBox.value + '&offset=' + profileSearcher.offsetCounter;
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions || profileSearcher.actions);
  },
  recoverUI: function() {
    var eventListener = function(event) {
      if ((event.target != profileSearcher.searchButton) && (event.target != profileSearcher.loadMoreButton)) {
        profileSearcher.searchPanel.classList.remove('open');
      }

      window.removeEventListener('click', eventListener);
    }

    profileSearcher.searchButton.disabled = false;
    profileSearcher.loadMoreButton.disabled = false;
    window.addEventListener('click', eventListener);
  },
  actions: {
    200: function(response) {
      response.json().then(function(data) {
        profileSearcher.recoverUI();

        for (var i = 0; i < data.length; i++) {
          var li = document.createElement('li');
          li.classList.add('row');
          var a = document.createElement('a');
          a.classList.add('btn', 'btn-default', 'col-sm-12');
          a.href = '/profile/show/' + data[i].id;
          a.innerHTML = data[i].name;
          li.appendChild(a);
          profileSearcher.searchResult.appendChild(li);
        }
      });
    }
  }
}
