import {i18n} from './i18n/library-translations.js';
import {i18n as periodI18n} from './i18n/period-translations.js';
import {i18n as classificationI18n} from './i18n/classification-translations.js';
import {i18n as typeI18n} from './i18n/type-translations.js';
import {i18n as imageI18n} from './i18n/image-translations.js';
import {formValidator} from './validation/form-validator.js';
import {pageBuilder} from './page/page-builder.js';
import {image} from './image/image.js';
import {sourceSearch} from './source/source-search.js';
import {ajaxHandler} from './ajax/ajax-handler.js';

export const library = {
  init: function() {
    const location = window.location.href;

    if (location.endsWith("/library")) {
      library.renderLibrary();
    } else if (location.endsWith("/library/admin")) {
      library.renderAdminPage();
    } else if (location.includes('period')) {
      const n = location.lastIndexOf('/');
      const period = location.substring(n + 1);
      library.renderPeriodPage(period)
    } else if (location.includes('source')) {
      const n = location.lastIndexOf('/');
      const sourceId = location.substring(n + 1);
      library.loadSource(sourceId);
    }
  },
  isContributionAllowed: function(roles) {
    if (roles) {
      return roles.includes("ROLE_CONTRIBUTOR") || roles.includes("ROLE_SCRIBE")
        || roles.includes("ROLE_ARCHIVARIUS") || roles.includes("ROLE_ADMIN");
    } else {
      return false;
    }
  },
  isEditAllowed: function(roles) {
    if (roles) {
      return roles.includes("ROLE_SCRIBE") || roles.includes("ROLE_ARCHIVARIUS") || roles.includes("ROLE_ADMIN");
    } else {
      return false;
    }
  },
  isAdmin: function(roles) {
    if (roles) {
      return roles.includes("ROLE_ARCHIVARIUS") || roles.includes("ROLE_ADMIN");
    } else {
      return false;
    }
  },
  periods: [
    "ANCIENT",
    "ANTIQUITY",
    "EARLY_MIDDLE_AGES",
    "HIGH_MIDDLE_AGES",
    "LATE_MIDDLE_AGES",
    "RENAISSANCE",
    "MODERN",
    "WWI",
    "WWII",
    "CONTEMPORARY",
    "OTHER"
  ],
  renderLibrary: function() {
    pageBuilder.initPage('template#library', '/library', i18n.en.welcomePage.title);

    var periodsSection = document.querySelector('ul#periods-section');
    var periodTemplate = document.querySelector('template.period-template');
    var periodItem = periodTemplate.content.querySelector('li.period-list-item');
    var heading = document.querySelector('h1.period-list-heading');

    pageBuilder.breadcrumb([
        {url: '/library', text: i18n.en.breadcrumb.library}
    ]);

    heading.innerHTML = i18n.en.welcomePage.heading;

    library.periods.forEach(renderPeriodList);

    function renderPeriodList(periodKey) {
      var periodNode = document.importNode(periodItem, true);
      var detailsLink = periodNode.querySelector('a.period-details-link');
      var thumbnailImg = periodNode.querySelector('img.period-thumbnail-image');
      var periodName = periodNode.querySelector('p.period-name');
      var periodShortDescription = periodNode.querySelector('p.period-short-description');

      detailsLink.href = '/library/period/' + periodKey.toLowerCase();
      detailsLink.onclick = function() {
        library.renderPeriodPage(periodKey.toLowerCase());
        return false;
      };
      thumbnailImg.src = '/images/library/thumbnails/' + periodKey.toLowerCase() + '.jpg';
      periodName.innerHTML = periodI18n.en.period[periodKey].name;
      periodShortDescription.innerHTML = periodI18n.en.period[periodKey].shortDescription;

      periodsSection.appendChild(periodNode);
    }

    const welcomeSection = document.querySelector('div#welcome-section');
    const welcomeTemplate = document.querySelector('template.welcome-block');
    const welcomeBlock = welcomeTemplate.content.querySelector('div');

    const url = '/api/library/library';
    const actions = {200: renderPage};
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);

    function renderPage(response) {
      response.json().then(function(data) {
        var welcomeBlockNode = document.importNode(welcomeBlock, true);
        var greetingBlock = welcomeBlockNode.querySelector('span.greeting-block');
        var button = welcomeBlockNode.querySelector('a.role-button');
        var buttonText = data.buttonText;
        var role = data.role;

        welcomeSection.innerHTML = '';

        if (data.adminPanelAvailable) {
          button.href = "/library/admin";

          button.onclick = function() {
            library.renderAdminPage();
          };
        } else {
          var method = data.roleRequestAvailable ? 'POST' : 'DELETE';

          button.onclick = function() {
            var url = '/api/library/library/role/' + role;
            ajaxHandler.fetch(null, url, {method: method});
          };
        }

        greetingBlock.innerHTML = data.greeting;
        button.innerHTML = buttonText;
        welcomeSection.appendChild(welcomeBlockNode);
      });
    }
  },
  renderAdminPage: function() {
    ajaxHandler.blockUI();
    pageBuilder.initPage('template#library-admin', '/library/admin', i18n.en.adminPage.title);

    var url = '/api/library/library/admin?page=0&size=40';
    var actions = {200: renderPage};
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);

    function renderPage(response) {
      var heading = document.querySelector('h1#admin-panel-heading');
      var userHeader = document.querySelector('table th#user-header');
      var authorityHeader = document.querySelector('table th#authority-header');
      var actionsHeader = document.querySelector('table th#actions-header');

      pageBuilder.breadcrumb([
          {url: '/library', text: i18n.en.breadcrumb.library},
          {url: '/library/admin', text: i18n.en.breadcrumb.admin}
      ]);

      heading.innerHTML = i18n.en.adminPage.heading;
      userHeader.innerHTML = i18n.en.adminPage.user;
      authorityHeader.innerHTML = i18n.en.adminPage.authority;
      actionsHeader.innerHTML = i18n.en.adminPage.actions;

      response.json().then(function(data) {
        var requestsSection = document.querySelector('tbody#requests-section');
        var requestTemplate = document.querySelector('template.request-template');
        var requestBlock = requestTemplate.content.querySelector('tr');

        requestsSection.innerHTML = '';

        data.roleRequests.forEach(renderRoleRequest);

        function renderRoleRequest(roleRequest) {
          var requestBlockNode = document.importNode(requestBlock, true);
          var profileButton = requestBlockNode.querySelector('a.user');
          var authorityCell = requestBlockNode.querySelector('span.authority');
          var acceptButton = requestBlockNode.querySelector('span.accept-request');
          var rejectButton = requestBlockNode.querySelector('span.reject-request');

          profileButton.innerHTML = roleRequest.userName;
          profileButton.href = '/profile/show/' + roleRequest.userProfileId;
          authorityCell.innerHTML = roleRequest.roleLabel;

          acceptButton.onclick = function() {
            var url = '/api/library/library/' + roleRequest.role + '/' + roleRequest.userId;
            ajaxHandler.fetch(null, url, {method: 'POST'}, actions);
          };

          rejectButton.onclick = function() {
            var url = '/api/library/library/' + roleRequest.role + '/' + roleRequest.userId;
            ajaxHandler.fetch(null, url, {method: 'DELETE'}, actions);
          };

          requestsSection.appendChild(requestBlockNode);
        }
      });
    }
  },
  renderPeriodPage: function(periodKey) {
    ajaxHandler.hideModals();
    const lang = 'en';
    const period = periodKey.toUpperCase();
    const periodMessageSource = periodI18n.en.period[period];
    pageBuilder.initPage('template#library-period', '/library/period/' + periodKey, i18n.en.welcomePage.title + ' - ' + periodMessageSource.name);

    pageBuilder.breadcrumb([
        {url: '/library', text: i18n.en.breadcrumb.library},
        {url: '/library/period/' + periodKey, text: periodMessageSource.name}
    ]);

    var srcProperties = i18n.en.source.properties;
    var classifications = classificationI18n.en.classifications;
    const types = typeI18n[lang].types;
    var createSourceSection = document.querySelector('div#create-source-section');
    var labels = Object.keys(srcProperties);
    var searchSection = document.querySelector('div#search-section');
    var searchTemplate = searchSection.querySelector('template#search-template');
    var searchCriterion = searchTemplate.content.querySelector('div');
    var sourceTable = document.querySelector('table#source-table');

    if (createSourceSection) {
      var popupButton = createSourceSection.querySelector('#popup-button > span.fa-plus');
      var createSourceForm = createSourceSection.querySelector('form');
      var classificationOptions = createSourceForm.querySelectorAll('select[name=classification] > option');
      var typeOptions = createSourceForm.querySelectorAll('select[name=type] > option');
      var submitButton = createSourceSection.querySelector('.submit-button');
      popupButton.innerHTML = i18n.en.periodPage.createSource.popupButton;

      createSourceForm.onsubmit = function() {
        library.createSource(this);
        return false;
      }

      labels.forEach(function(label) {
        createSourceForm.querySelector('label[for=' + label + ']').innerHTML = srcProperties[label];
      });

      createSourceForm.querySelector('input[name=period]').value = period;
      createSourceForm.querySelector('input[name=fake-period]').value = periodMessageSource.name;
      submitButton.innerHTML = i18n.en.periodPage.createSource.submitButton;

      classificationOptions.forEach(function(option) {
        option.innerHTML = classifications[option.value];
      });

      typeOptions.forEach(function(option) {
        option.innerHTML = types[option.value];
      });
    }

    document.querySelector('h1#period-heading').innerHTML = periodMessageSource.name;
    document.querySelector('div#period-long-description').innerHTML = periodMessageSource.longDescription;
    document.querySelector('h1#sources').innerHTML = i18n.en.periodPage.sourceListHeading;
    document.querySelector('img#period-image').src = '/images/library/' + periodKey + '.jpg';
    searchSection.querySelector('div#classification-search h4').innerHTML = srcProperties.classification + ":";
    searchSection.querySelector('div#type-search h4').innerHTML = srcProperties.type + ":";
    searchSection.querySelector('input[name=query]').placeholder = i18n.en.periodPage.searchSourcePlaceholder;

    sourceTable.querySelector('th#table-name').innerHTML = srcProperties.name;
    sourceTable.querySelector('th#table-description').innerHTML = srcProperties.description;
    sourceTable.querySelector('th#table-classification').innerHTML = srcProperties.classification;
    sourceTable.querySelector('th#table-type').innerHTML = srcProperties.type;

    buildCheckboxSearch(classifications, 'classification');
    buildCheckboxSearch(types, 'type');

    const searchForm = searchSection.querySelector('form.search-form');
    searchForm.querySelector('input[name=period]').value = period;
    searchForm.action = '/api/library/source/find';
    searchForm.onsubmit = function() {
      library.search(this);
      return false;
    };

    library.search(searchForm);

    function buildCheckboxSearch(checkboxGroup, checkboxType) {
      Object.keys(checkboxGroup).forEach(function(checkboxGroupItem) {
        if (checkboxGroupItem) {
          var searchItem = document.importNode(searchCriterion, true);
          var label = searchItem.querySelector('label');
          var checkbox = searchItem.querySelector('input[type=checkbox]');

          label.innerHTML = checkboxGroup[checkboxGroupItem];
          checkbox.name = checkboxType;
          checkbox.value = checkboxGroupItem;

          searchSection.querySelector('div#' + checkboxType + '-search').appendChild(searchItem);
        }
      });
    }
  },

  loadSource: function(sourceId) {
    ajaxHandler.blockUI();
    const url = '/api/library/source/' + sourceId;
    ajaxHandler.fetch(null, url, {method: 'GET'}, {200: library.parseSourceResponse});
  },
  parseSourceResponse(response) {
    const userInfo = JSON.parse(response.headers.get("User-Info"));

    response.json().then(function(data) {
      library.renderSourcePage(data, userInfo);
    });
  },
  renderSourcePage: function(source, userInfo) {
    ajaxHandler.hideModals();
    const lang = 'en';
    pageBuilder.initPage('template#library-source', '/library/source/' + source.id, i18n[lang].sourcePage.title + ' - ' + source.name);

    const sourceId = source.id;
    const sourceName = source.name;
    const msgSource = i18n[lang];
    const sourceForm = document.querySelector('div#source-form');
    const periodName = periodI18n[lang].period[source.period].name;

    pageBuilder.breadcrumb([
        {url: '/library', text: i18n.en.breadcrumb.library},
        {url: '/library/period/' + source.period.toLowerCase(), text: periodName},
        {url: '/library/source/' + sourceId, text: sourceName}
    ]);

    const roles = userInfo ? userInfo.roles : null;
    const isEditable = library.isEditAllowed(roles)

    const imageContainer = document.querySelector('div.image-container');
    const uploadImageAction = '/api/library/source/' + sourceId + '/images';
    const fetchImagesUrl = '/api/image/image/source/' + sourceId;

    pageBuilder.imageSection(
      imageContainer,
      uploadImageAction,
      imageI18n['en'],
      fetchImagesUrl,
      isEditable
    );

    const updateNameAction = '/api/library/source/' + sourceId + '/name';
    const updateDescriptionAction = '/api/library/source/' + sourceId + '/description';
    const sourceNameLabel = msgSource.source.properties.name;
    const sourceDescriptionLabel = msgSource.source.properties.description;
    const classificationLabel = msgSource.source.properties.classification;
    const classificationValue = classificationI18n.en.classifications[source.classification];
    const periodLabel = msgSource.source.properties.period;
    const typeLabel = msgSource.source.properties.type;
    const typeValue = typeI18n[lang].types[source.type];

    pageBuilder.smartForm(sourceForm, sourceNameLabel + ' *', sourceName, 'name', updateNameAction, isEditable);
    pageBuilder.smartForm(sourceForm, sourceDescriptionLabel, source.description, 'description', updateDescriptionAction, isEditable);
    pageBuilder.smartForm(sourceForm, classificationLabel, classificationValue);
    pageBuilder.smartForm(sourceForm, typeLabel, typeValue);
    pageBuilder.smartForm(sourceForm, periodLabel, periodName);

    if (library.isAdmin(roles)) {
      const deleteSrcButton = document.querySelector('span#delete-source-button');
      const confirmationMessage = i18n.en.sourcePage.deleteSource.confirmation;
      const yesMessage = i18n.en.sourcePage.deleteSource.yes;
      const noMessage = i18n.en.sourcePage.deleteSource.no;
      const submitAction = '/api/library/source/' + sourceId;
      const submitFunction = function() {
        library.deleteSource(this, source);
        return false;
      }

      pageBuilder.modalButton(deleteSrcButton, ['fa', 'fa-trash'], null, confirmationMessage, yesMessage, noMessage,
        submitAction, submitFunction
      );
    }
  },
  createSource: function(form) {
    var formData = new FormData(form);

    var object = {
      name: formData.get('name'),
      description: formData.get('description'),
      classification: formData.get('classification'),
      type: formData.get('type'),
      period: formData.get('period')
    };

    var validator = {
      name: i18n.en.periodPage.createSource.validation.nameBlank,
      classification: i18n.en.periodPage.createSource.validation.classificationBlank,
      type: i18n.en.periodPage.createSource.validation.typeBlank
    };

    var inputIsValid = true;
    Object.entries(validator).forEach(validate);

    function validate(entry) {
      var fieldName = entry[0];
      var validationMessage = entry[1];

      const isInvalid = formValidator.validateBlank(
          form.querySelector('[name=' + fieldName + ']'),
          validationMessage
      );

      if (isInvalid) {
        inputIsValid = false;
      }
    }

    if (!inputIsValid) {
      return false;
    }

    var payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };

    var actions = {
      200: renderSourceDetails,
      400: function(response, form) {
        formValidator.handleBadRequest(response, form);
      }
    };

    function renderSourceDetails(response) {
      response.json().then(function(data) {
        window.location.href = '/library/source/' + data.id;
      });
    }

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, actions);
  },
  search: function(form) {
    const lang = 'en';
    const actions = {
      200: displaySearchResult
    };

    const url = sourceSearch.buildUrl(form);
    ajaxHandler.fetch(form, url, {method: 'GET'}, actions);

    const spinner = document.querySelector('img.load-sources-spinner');
    spinner.classList.remove('hidden');
    const sourceTable = document.querySelector('table#source-table');
    const tableBody = sourceTable.querySelector('tbody');
    tableBody.innerHTML = '';

    function displaySearchResult(response) {
      const userInfo = JSON.parse(response.headers.get("User-Info"));

      response.json().then(function(data) {
        var sourceTemplate = document.querySelector('template#source-template');
        var sourceItem = sourceTemplate.content.querySelector('tr');

        spinner.classList.add('hidden');

        data.forEach(function(source) {
          var sourceNode = document.importNode(sourceItem, true);

          sourceNode.querySelector('td.source-name').innerHTML = source.name;
          sourceNode.onclick = function() {
            library.renderSourcePage(source, userInfo);
          };
          sourceNode.querySelector('td.source-description').innerHTML = source.description;
          sourceNode.querySelector('td.source-classification').innerHTML = classificationI18n[lang].classifications[source.classification];
          sourceNode.querySelector('td.source-type').innerHTML = typeI18n[lang].types[source.type];
          tableBody.appendChild(sourceNode);
        });
      });
    }
  },
  deleteSource: function(form, source) {
    var actions = {
      200: redirectToPeriodPage
    };

    function redirectToPeriodPage() {
      library.renderPeriodPage(source.period.toLowerCase());
    }

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, {method: 'DELETE'}, actions);
  }
};
