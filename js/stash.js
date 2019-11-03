import {i18n} from './i18n/stash-translations.js';
import {i18n as periodI18n} from './i18n/period-translations.js';
import {i18n as classificationI18n} from './i18n/classification-translations.js';
import {i18n as imageI18n} from './i18n/image-translations.js';
import {pageBuilder} from './page/page-builder.js';
import {linkedSources} from './source/linked-sources.js';
import {formValidator} from './validation/form-validator.js';
import {ajaxHandler} from './ajax/ajax-handler.js';

export const stash = {
  init: function() {
    const location = window.location.href;

    if (location.includes("/group/")) {
      const n = location.lastIndexOf('/');
      const groupId = location.substring(n + 1);
      stash.loadGroup(groupId)
    } else if (location.includes("/stash/item")) {
      const n = location.lastIndexOf('/');
      const itemId = location.substring(n + 1);
      stash.loadItem(itemId);
    } else if (location.includes("/stash/") && !location.endsWith("/stash")) {
      const n = location.lastIndexOf('/');
      const userId = location.substring(n + 1);
      stash.renderStash(userId)
    } else if (location.endsWith("/stash")) {
      stash.renderStash();
    }
  },
  renderStash: function(userId) {
    pageBuilder.initPage('template#stash', '/stash', i18n.en.stash.title);

    const stashSection = document.querySelector("#stash-section");
    const messageSource = i18n.en.stash;
    stashSection.querySelector('h1#group-list-heading').innerHTML = messageSource.groups.heading;
    let url = '/api/stash/group';

    if (userId !== undefined) {
      url += '?userId=' + userId;
    }

    const actions = {200: renderPage};
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);

    function renderPage(response) {
      const userInfo = JSON.parse(response.headers.get("User-Info"));
      const currentUserId = userInfo.userId;

      response.json().then(function(data) {
        const groupList = stashSection.querySelector('div#group-list');
        const groupListItemTemplate = stashSection.querySelector('template#group-list-item-template');
        const userId = data.owner.id;
        const userName = data.owner.userName;

        pageBuilder.breadcrumb([
            {url: '/stash/' + userId, text: messageSource.breadCrumb + " (" + userName + ")"}
        ]);

        if (currentUserId == userId) {
          const createGroupSection = stashSection.querySelector("div#create-group-section");
          createGroupSection.classList.remove("hidden");
          const form = createGroupSection.querySelector('form');
          form.querySelector("label[for=name]").innerHTML = messageSource.groups.create.name;
          form.querySelector("label[for=description]").innerHTML = messageSource.groups.create.description;
          form.querySelector("button.submit-button").innerHTML = messageSource.groups.create.createButton;
          form.action = '/api/stash/group';
          form.onsubmit = function() {
            stash.createGroup(this, userInfo);
            return false;
          }
        }

        for (const group of data.groups) {
            renderGroupListItem(group);
        }

        function renderGroupListItem(group) {
          const groupListItem = groupListItemTemplate.content.querySelector('div');
          const groupListItemNode = document.importNode(groupListItem, true);
          const groupLink = groupListItemNode.querySelector("a");
          groupLink.href = "/stash/" + group.id;
          groupLink.onclick = function() {
            stash.renderGroup(group, userInfo);
            return false;
          }
          groupLink.querySelector("b.group-name").innerHTML = group.name;
          groupLink.querySelector("p.group-description").innerHTML = group.description || '&nbsp;';
          groupList.appendChild(groupLink);
        }
      });
    }
  },
  loadGroup: function(groupId) {
    ajaxHandler.blockUI();
    const url = '/api/stash/group/' + groupId;
    const actions = {200: renderPage};
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);

    function renderPage(response) {
      const userInfo = JSON.parse(response.headers.get("User-Info"));

      response.json().then(function(data) {
        stash.renderGroup(data, userInfo);
      });
    }
  },
  renderGroup: function(group, userInfo) {
    ajaxHandler.hideModals();
    pageBuilder.initPage('template#item-group', '/stash/group/' + group.id, i18n.en.stash.title + ' - ' + group.name);

    const groupId = group.id;
    const groupName = group.name;
    const groupDescription = group.description;

    pageBuilder.breadcrumb([
        {url: '/stash/' + group.owner.id, text: i18n.en.stash.breadCrumb + " (" + group.owner.userName + ")"},
        {url: '/stash/group/' + groupId, text: groupName}
    ]);

    const groupSection = document.querySelector("#group-section");
    groupSection.querySelector('h1.item-list-heading').innerHTML = i18n.en.stash.group.heading;

    const groupNameLabel = i18n.en.stash.group.nameLabel;
    const groupDescriptionLabel = i18n.en.stash.group.descriptionLabel;
    const updateNameAction = '/api/stash/group/' + groupId + '/name';
    const updateDescriptionAction = '/api/stash/group/' + groupId + '/description';
    const groupForm = groupSection.querySelector(".group-form");

    const isEditable = group.owner.id == userInfo.userId;
    pageBuilder.smartForm(groupForm, groupNameLabel + ' *', groupName, 'name', updateNameAction, isEditable);
    pageBuilder.smartForm(groupForm, groupDescriptionLabel, groupDescription, 'description', updateDescriptionAction, isEditable);

    if (isEditable) {
      const createItemForm = document.querySelector('.create-item-form');
      const itemProperties = i18n.en.stash.items.properties;
      const classifications = classificationI18n.en.classifications;
      const periods = periodI18n.en.period;
      const labels = Object.keys(itemProperties);
      const classificationOptions = createItemForm.querySelectorAll('select[name=classification] > option');
      const periodOptions = createItemForm.querySelectorAll('select[name=period] > option');
      const submitButton = createItemForm.querySelector('.submit-button');
      createItemForm.action = '/api/stash/group/' + groupId + '/item';

      createItemForm.onsubmit = function() {
        stash.createItem(this);
        return false;
      }

      labels.forEach(function(label) {
        createItemForm.querySelector('label[for=' + label + ']').innerHTML = itemProperties[label];
      });

      classificationOptions.forEach(function(option) {
        option.innerHTML = classifications[option.value];
      });

      periodOptions.forEach(function(option) {
        option.innerHTML = periods[option.value].name;
      });

      submitButton.innerHTML = i18n.en.stash.items.submitButton;
      createItemForm.onsubmit = function() {
        stash.createItem(this);
        return false;
      }

      const createItemButton = document.querySelector('button.create-item-button');
      createItemButton.classList.remove('hidden');
      createItemButton.querySelector('span.text-holder').innerHTML = i18n.en.stash.items.createButton;
    }

    const url = '/api/stash/group/' + groupId + '/item?page=0&size=40';
    const actions = {200: renderItemList};
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);

    function renderItemList(response) {
      const itemListTemplate = document.querySelector('template.item-list-template');
      const itemListBlock = document.querySelector('.item-list-block');

      response.json().then(function(data) {
        for (const item of data) {
          renderItem(item);
        }

        function renderItem(item) {
          const listItem = itemListTemplate.content.querySelector('div');
          const listItemNode = document.importNode(listItem, true);
          const itemLink = listItemNode.querySelector('a');
          itemLink.href = '/stash/' + item.itemGroup.id + '/item/' + item.id;
          itemLink.onclick = function() {
            stash.renderItem(item, userInfo);
            return false;
          }
          itemLink.querySelector("b.item-name").innerHTML = item.name;
          itemLink.querySelector("p.item-description").innerHTML = item.description || "&nbsp;";
          itemListBlock.appendChild(itemLink);
        }
      });
    }
  },
  loadItem: function(itemId) {
    ajaxHandler.blockUI();
    const url = '/api/stash/item/' + itemId;
    const actions = {200: stash.parseItemResponse};
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);
  },
  parseItemResponse: function(response) {
    const userInfo = JSON.parse(response.headers.get("User-Info"));

    response.json().then(function(data) {
      stash.renderItem(data, userInfo);
    });
  },
  renderItem: function(item, userInfo) {
    ajaxHandler.hideModals();
    pageBuilder.initPage('template#item', '/stash/item/' + item.id, i18n.en.stash.title + ' - ' + item.name);

    const itemGroup = item.itemGroup;

    pageBuilder.breadcrumb([
      {url: '/stash/' + itemGroup.owner.id, text: i18n.en.stash.breadCrumb + " (" + itemGroup.owner.userName + ")"},
      {url: '/stash/group/' + itemGroup.id, text: itemGroup.name},
      {url: '/stash/item/' + item.id, text: item.name}
    ]);

    const itemForm = document.querySelector('.item-form');

    const isEditable = itemGroup.owner.id == userInfo.userId;
    const updateNameAction = '/api/stash/item/' + item.id + '/name';
    const updateDescriptionAction = '/api/stash/item/' + item.id + '/description';
    const itemNameLabel = i18n.en.stash.items.properties.name;
    const itemDescriptionLabel = i18n.en.stash.items.properties.description;
    const itemClassificationLabel = i18n.en.stash.items.properties.classification;
    const itemPeriodLabel = i18n.en.stash.items.properties.period;

    const periodName = periodI18n.en.period[item.period].name;
    const classificationName = classificationI18n.en.classifications[item.classification];

    pageBuilder.smartForm(itemForm, itemNameLabel + ' *', item.name, 'name', updateNameAction, isEditable);
    pageBuilder.smartForm(itemForm, itemDescriptionLabel, item.description, 'description', updateDescriptionAction, isEditable);
    pageBuilder.smartForm(itemForm, itemClassificationLabel, classificationName);
    pageBuilder.smartForm(itemForm, itemPeriodLabel, periodName);

    if (isEditable) {
      const deleteItemButton = document.querySelector('span#delete-item-button');
      const confirmationMessage = i18n.en.stash.items.delete.confirmation;
      const yesMessage = i18n.en.stash.items.delete.yes;
      const noMessage = i18n.en.stash.items.delete.no;
      const submitAction = '/api/stash/item/' + item.id;
      const submitFunction = function() {
        stash.deleteItem(this, item, userInfo);
        return false;
      }

      pageBuilder.modalButton(deleteItemButton, ['fa', 'fa-trash'], null, confirmationMessage, yesMessage, noMessage,
        submitAction, submitFunction
      );
    }

    const linkedSourcesContainer = document.querySelector('.linked-sources');

    linkedSources.build(linkedSourcesContainer, item, isEditable);

    const imageContainer = document.querySelector('div#image-container');
    const uploadImageAction = '/api/stash/item/' + item.id + '/images';
    const fetchImagesUrl = '/api/image/image/item/' + item.id;

    pageBuilder.imageSection(
      imageContainer,
      uploadImageAction,
      imageI18n['en'],
      fetchImagesUrl,
      isEditable
    );
  },
  deleteItem: function(form, item, userInfo) {
    var actions = {
      200: successfulDeletion
    };

    function successfulDeletion() {
      stash.renderGroup(item.itemGroup, userInfo);
    }

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, {method: 'DELETE'}, actions);
  },
  createItem: function(form) {
    const messageSource = i18n.en.stash.items.create.validation;
    const formData = new FormData(form);

    const object = {
      name: formData.get('name'),
      description: formData.get('description'),
      classification: formData.get('classification'),
      period: formData.get('period'),
    };

    const validator = {
      name: messageSource.nameBlank,
      classification: messageSource.classificationMissing,
      period: messageSource.periodMissing
    };

    let inputIsValid = true;
    Object.entries(validator).forEach(validate);

    function validate(entry) {
      const fieldName = entry[0];
      const validationMessage = entry[1];

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

    const payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };

    const actions = {
      200: renderItemPage,
      400: function(response, form) {
        formValidator.handleBadRequest(response, form);
      }
    };

    function renderItemPage(response) {
      const userInfo = JSON.parse(response.headers.get("User-Info"));

      response.json().then(function(data) {
        stash.renderItem(data, userInfo);
      });
    }

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, actions);
  },
  createGroup: function(form, userInfo) {
    const formData = new FormData(form);

    const object = {
      name: formData.get('name'),
      description: formData.get('description'),
    };

    const nameBlank = formValidator.validateBlank(
        form.querySelector('[name=name]'),
        i18n.en.stash.groups.create.validation.nameBlank
    );

    if (nameBlank) {
      return false;
    }

    const payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };

    const actions = {
      200: renderGroupItems,
      400: function(response, form) {
        formValidator.handleBadRequest(response, form);
      }
    };

    function renderGroupItems(response) {
      response.json().then(function(data) {
        stash.renderGroup(data, userInfo)
      });
    }

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, actions);
  }
}
