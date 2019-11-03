import {i18n} from '../i18n/linked-sources-translations.js';
import {i18n as typeI18n} from '../i18n/type-translations.js';
import {sourceSearch} from './source-search.js';
import {library} from '../library.js';
import {ajaxHandler} from '../ajax/ajax-handler.js';

export const linkedSources = {
  build: function(linkedSourcesContainer, item, isEditable) {
    let lang = 'en';
    linkedSourcesContainer.querySelector('h2.linked-sources-heading').innerHTML = i18n[lang].linkedSourcesHeading;
    const messageContainer = linkedSourcesContainer.querySelector('p.message-container');
    messageContainer.classList.add('hidden');
    const sourceList = linkedSourcesContainer.querySelector('ul.linked-sources-list');
    sourceList.innerHTML = '';

    if (!item.sources || !item.sources.length) {
      messageContainer.innerHTML = i18n[lang].noSources;
      messageContainer.classList.remove('hidden');
    } else {
      const object = {ids: item.sources}
      const q = window.btoa(encodeURIComponent(JSON.stringify(object)));
      const url = '/api/library/source?q=' + q;
      const actions = {200: renderLinkedSources}

      ajaxHandler.fetch(this, url, {method: 'GET'}, actions);

      function renderLinkedSources(response) {
        const listItem = document.querySelector('template.linked-source-item');
        const li = listItem.content.querySelector('li');

        response.json().then(function(data) {
          const userInfo = JSON.parse(response.headers.get("User-Info"));

          for (let source of data) {
            const entry = document.importNode(li, true);
            const sourceLink = entry.querySelector('a.source-link');
            sourceLink.href = '/api/library/source/' + source.id;
            sourceLink.innerHTML = source.name;
            sourceLink.onclick = function() {
              library.renderSourcePage(source, userInfo);
            }

            if (isEditable) {
              const unlinkButton = entry.querySelector('a.fa-unlink');
              unlinkButton.classList.remove('hidden');
              unlinkButton.onclick = function() {
                linkedSources.execute(linkedSourcesContainer, item, isEditable, source.id, 'DELETE');
              };
            }

            sourceList.appendChild(entry);
          }
        });
      }
    }

    if (!isEditable) {
      return;
    }

    const findSourcesContainer = linkedSourcesContainer.querySelector('div.find-sources-container');
    findSourcesContainer.classList.remove('hidden');
    findSourcesContainer.querySelector('span.find-sources-popup-text').innerHTML = i18n[lang].findSourcesButton;
    findSourcesContainer.querySelector('div.find-source-type > h4').innerHTML = i18n[lang].sourceTypeHeading;
    findSourcesContainer.querySelector('input[name=query]').placeholder = i18n[lang].findSourcesPlaceholder;
    const searchForm = findSourcesContainer.querySelector('form.search-form');
    searchForm.querySelector('label.type-written').innerHTML = typeI18n[lang].types['WRITTEN'];
    searchForm.querySelector('label.type-graphic').innerHTML = typeI18n[lang].types['GRAPHIC'];
    searchForm.querySelector('label.type-archaeological').innerHTML = typeI18n[lang].types['ARCHAEOLOGICAL'];
    searchForm.querySelector('label.type-other').innerHTML = typeI18n[lang].types['OTHER'];
    searchForm.action = '/api/library/source/find';

    const resultTable = findSourcesContainer.querySelector('table.result-table');
    resultTable.querySelector('th.source-name').innerHTML = i18n[lang].sourceNameLabel;
    resultTable.querySelector('th.source-description').innerHTML = i18n[lang].sourceDescriptionLabel;
    resultTable.querySelector('th.source-type').innerHTML = i18n[lang].sourceTypeLabel;
    const tbody = resultTable.querySelector('tbody');
    const noResultsContainer = findSourcesContainer.querySelector('p.no-results-message');
    const spinner = findSourcesContainer.querySelector('img.spinner');

    searchForm.onsubmit = function() {
      spinner.classList.remove('hidden');
      resultTable.classList.add('hidden');
      noResultsContainer.classList.add('hidden');
      tbody.innerHTML = '';

      const actions = {
        200: renderSearchResult
      };

      const url = sourceSearch.buildUrl(this);
      ajaxHandler.fetch(this, url, {method: 'GET'}, actions);
      return false;
    }

    searchForm.querySelector('input[name=period]').value = item.period;
    searchForm.querySelector('input[name=classification]').value = item.classification;

    function renderSearchResult(response) {
      spinner.classList.add('hidden');

      response.json().then(function(data) {
        if (!data || data.length === 0) {
          noResultsContainer.innerHTML = i18n[lang].noResultsMessage;
          noResultsContainer.classList.remove('hidden');
          return;
        }

        const userInfo = JSON.parse(response.headers.get("User-Info"));

        const resultTemplate = document.querySelector('template.source-template');
        const tr = resultTemplate.content.querySelector('tr');

        for (const row of data) {
          const entry = document.importNode(tr, true);
          const sourceName = entry.querySelector('td.source-name');
          const sourceDescription = entry.querySelector('td.source-description');
          const sourceType = entry.querySelector('td.source-type');
          sourceName.innerHTML = row.name;
          sourceDescription.innerHTML = row.description;
          sourceType.innerHTML = typeI18n[lang].types[row.type];
          sourceName.onclick = function() {library.renderSourcePage(row, userInfo);};
          sourceDescription.onclick = function() {library.renderSourcePage(row, userInfo);};
          sourceType.onclick = function() {library.renderSourcePage(row, userInfo);};

          entry.querySelector('td.link-button').onclick = function() {
            linkedSources.execute(linkedSourcesContainer, item, isEditable, row.id, 'POST');
          };

          tbody.appendChild(entry);
        }

        resultTable.classList.remove('hidden');
      });
    }
  },
  execute: function(linkedSourcesContainer, item, isEditable, sourceId, method) {
    ajaxHandler.blockUI();
    ajaxHandler.hideModals();

    const url = '/api/stash/item/' + item.id + '/source/' + sourceId;
    const actions = {
      200: function(response) {
        response.json().then(function(data) {
          linkedSources.build(linkedSourcesContainer, data, isEditable);
        });
      }
    };

    ajaxHandler.fetch(this, url, {method: method}, actions);
  }
};
