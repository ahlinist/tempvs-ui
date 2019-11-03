import {i18n} from './i18n/messaging-translations.js';
import {profileSearcher} from './profile/profile-searcher.js';
import {pageBuilder} from './page/page-builder.js';
import {formValidator} from './validation/form-validator.js';
import {ajaxHandler} from './ajax/ajax-handler.js';
import {langResolver} from './i18n/language-resolver.js';

export let messaging = {
  conversationId: null,
  defaultPageNumber: 0,
  defaultConversationsSize: 40,
  defaultMessagesSize: 40,
  currentConversationsPage: 0,
  currentMessagesPage: 0,
  didScroll: false,
  init: function() {
    const location = window.location.href;

    if (location.endsWith("/messaging") || location.endsWith("/messaging/")) {
      messaging.renderMessaging();
    } else if (location.includes("/messaging/") && !location.endsWith("/messaging/")) {
      const n = location.lastIndexOf('/');
      const conversationId = location.substring(n + 1);
      pageBuilder.initPage('template#message', '/messaging/' + conversationId, i18n.en.messaging.title);
      messaging.conversation(conversationId, messaging.defaultPageNumber, messaging.defaultMessagesSize);
    }

    if (location.includes("/messaging")) {
      messaging.clearForms();
      messaging.displayNewMessagesCounter();
      messaging.loadConversations(true);
    }
  },
  renderMessaging: function() {
    const lang = langResolver.resolve();
    const messageSource = i18n[lang] || i18n['en'];
    pageBuilder.initPage('template#message', '/messaging', messageSource.messaging.title);
  },
  actions: {
    200: function(response) {
      const userInfo = JSON.parse(response.headers.get("User-Info"));
      const currentProfileId = userInfo.profileId;
      const lang = userInfo.lang;
      const conversationsContainer = document.querySelector("div#conversations-container");
      const conversationDetails = document.querySelector('div#conversation-details');

      response.json().then(function(conversation) {
        if (!window.location.href.includes('/messaging')) {
          window.location.href = "/messaging/" + conversation.id;
          return;
        }

        messaging.clearForms();
        ajaxHandler.hideModals();
        messaging.currentMessagesPage = messaging.defaultPageNumber;
        messaging.conversationId = conversation.id;
        conversationDetails.classList.remove('hidden');

        //messages section
        var append = false;
        messaging.appendMessages(conversation.messages, conversationDetails, append);
        const loadMoreMessagesButton = conversationDetails.querySelector("button#load-more-messages-button");
        loadMoreMessagesButton.innerHTML = i18n[lang].messaging.loadMoreMessages;

        loadMoreMessagesButton.onclick = function() {
          messaging.loadMessages();
        };

        const messagesContainer = conversationDetails.querySelector("div#messages-container");
        messagesContainer.onscroll = function() {
          messaging.markAsRead();
        };

        //conversation name section
        if (conversation.type == 'CONFERENCE') {
          const conversationNameContainer = document.querySelector('div.conversation-name');
          const conversationNameLabel = i18n[lang].messaging.conversation;
          const updateNameAction = '/api/message/conversations/' + conversation.id + '/name';
          conversationNameContainer.innerHTML = '';
          pageBuilder.smartForm(conversationNameContainer, conversationNameLabel, conversation.name, 'name', updateNameAction, true);
        }

        //participants section
        var participants = conversation.participants;
        var participantsContainer = conversationDetails.querySelector('.participants-container');
        var participantTemplate = conversationDetails.querySelector('template.participant-template');
        var participantsList = conversationDetails.querySelector('ul#participants-list');
        participantsContainer.querySelector("b").innerHTML = i18n[lang].messaging.participants;
        participantsList.innerHTML = '';

        participants.forEach(function(participant) {
          if (participant.id == currentProfileId) {
            return;
          }

          var participantListItem = participantTemplate.content.querySelector('li');
          var participantNode = document.importNode(participantListItem, true);
          var profileLink = participantNode.querySelector('.active-conversation-participant');
          profileLink.setAttribute('href', '/profile/show/' + participant.id);
          profileLink.innerHTML = participant.name;

          if ((conversation.type == 'CONFERENCE') && (conversation.admin.id == currentProfileId) && (participants.length > 2)) {
            var removeForm = participantNode.querySelector('form.participant-deletion-form');
            removeForm.action = '/api/message/conversations/' + conversation.id + '/participants/' + participant.id;

            removeForm.onsubmit = function() {
              messaging.removeParticipant(this);
              return false;
            };

            var removeButton = participantNode.querySelector('.remove-participant-button');
            removeButton.classList.remove('hidden');
            removeButton.querySelector('[data-toggle=modal]').setAttribute('data-target', '#removeParticipantModal-' + participant.id);
            removeButton.querySelector('[role=dialog]').setAttribute('id', 'removeParticipantModal-' + participant.id);

            const removalConfirmation = participantNode.querySelector("div.remove-participant-confirmation");
            removalConfirmation.querySelector("span.confirmation-text").innerHTML = i18n[lang].messaging.removeParticipant.confirmation;
            removalConfirmation.querySelector("form button.submit-button").innerHTML = i18n[lang].messaging.removeParticipant.yes;
            removalConfirmation.querySelector("form span[data-dismiss=modal]").innerHTML = i18n[lang].messaging.removeParticipant.no;
          }

          participantsList.appendChild(participantNode);
        });

        const addParticipantSearch = document.querySelector('div#add-participant-profile-search');
        const addParticipantSearchButton = addParticipantSearch.querySelector("button.profile-search-button");
        const loadMoreParticipantsButton = addParticipantSearch.querySelector("button.load-more-button");
        addParticipantSearch.querySelector("input.profile-search-box").placeholder = i18n[lang].messaging.participantSearchPlaceholder;
        loadMoreParticipantsButton.querySelector("i").innerHTML = i18n[lang].messaging.loadMoreParticipants;

        addParticipantSearchButton.onclick = function() {
          profileSearcher.search(this, 0, messaging.addParticipantsActions);
        };

        loadMoreParticipantsButton.onclick = function() {
          profileSearcher.search(this, 10, messaging.addParticipantsActions);
        };

        const addParticipantButton = addParticipantSearch.querySelector("form button.add-participant-button");
        addParticipantButton.innerHTML = i18n[lang].messaging.addParticipantButton;

        window.history.pushState("", "", '/messaging/' + conversation.id);
        messaging.markAsRead();
        messaging.scrollMessagesDown();
        messaging.loadConversations(false);
        messaging.displayNewMessagesCounter();
      });
    },
    400: function(response, form) {
      var specificAction = function() {
        messaging.scrollMessagesDown();
        messaging.loadConversations(false);
        messaging.displayNewMessagesCounter();
      }

      formValidator.handleBadRequest(response, form, specificAction);
    },
    404: function(response) {
      console.log('Status code 404 returned.');

      messaging.scrollMessagesDown();
      messaging.loadConversations(false);
      messaging.displayNewMessagesCounter();
    }
  },
  addParticipantsActions: {
    200: function(response) {
      var resultContainer = document.querySelector('#add-participant-to-conversation-container');
      var resultList = resultContainer.querySelector('ul');
      var addParticipantForm = resultContainer.querySelector('form.add-participant-to-conversation-form');
      var addParticipantButton = addParticipantForm.querySelector('button');
      addParticipantForm.action = '/api/message/conversations/' + messaging.conversationId + '/participants';

      addParticipantForm.onsubmit = function() {
        messaging.addParticipants(this);
        return false;
      }

      response.json().then(function(data) {
        profileSearcher.recoverUI();
        var profileSearchContainer = document.querySelector('#add-participant-profile-search');
        var profileSearchTemplate = profileSearchContainer.querySelector('template.profile-search-template');
        var profileSearchListItem = profileSearchTemplate.content.querySelector('li');

        data.forEach(function(dataEntry){
          var profileId = dataEntry.id;
          var profileName = dataEntry.name;

          var isParticipant = document.querySelector('.active-conversation-participant[href$="/' + profileId + '"]');
          var isForAddition = profileSearchContainer.querySelector('.search-result-link[href$="/' + profileId + '"]');

          if (isParticipant || isForAddition) {
            return;
          }

          var profileSearchNode = document.importNode(profileSearchListItem, true);
          var profileResultLink = profileSearchNode.querySelector('a.search-result');
          profileResultLink.innerHTML = profileName;

          profileResultLink.onclick = function() {
            var searchResultTemplate = document.querySelector('template#profile-search-result-template');
            var searchResultListItem = searchResultTemplate.content.querySelector('li');
            var searchResultNode = document.importNode(searchResultListItem, true);
            var searchResultLink = searchResultNode.querySelector('a.search-result-link');
            var remove = searchResultNode.querySelector('span.remove-participant');
            var input = searchResultNode.querySelector('input[type=hidden]');

            input.value = profileId;
            searchResultLink.href = '/profile/show/' + profileId;
            searchResultLink.innerHTML = profileName;

            remove.onclick = function() {
              resultList.removeChild(searchResultNode);
              toggleAddButton();
            };

            resultList.appendChild(searchResultNode);
            toggleAddButton();
          };

          profileSearcher.searchResult.appendChild(profileSearchNode);
        });

        toggleAddButton();

        function toggleAddButton() {
          if (addParticipantForm.querySelectorAll('a.search-result-link').length > 0) {
            addParticipantButton.classList.remove('hidden');
          } else {
            addParticipantButton.classList.add('hidden');
          }
        }
      });
    }
  },
  createConversation: function(form) {
    const textBlank = formValidator.validateBlank(
        form.querySelector('textarea[name=text]'),
        i18n.en.messaging.blankMessage
    );

    const noParticipants = formValidator.validateBlank(
        form.querySelector('input[name=participants]'),
        i18n.en.messaging.noParticipantsChosen
    );

    if (textBlank || noParticipants) {
      return false;
    }

    ajaxHandler.blockUI();
    var formData = new FormData(form);

    var object = {
      name: formData.get('name'),
      text: formData.get('text'),
      receivers: formData.getAll('participants')
    };

    var payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    }

    ajaxHandler.fetch(form, form.action, payload, messaging.actions);
  },
  createConversationActions: {
    200: function(response) {
      response.json().then(function(data) {
        profileSearcher.recoverUI();
        var createConversationWrapper = document.querySelector('#conversation-popup-wrapper');
        var participantsList = createConversationWrapper.querySelector('ul.create-conversation-participants-container');
        var profileSearchTemplate = createConversationWrapper.querySelector('template.profile-search-template');
        var profileSearchListItem = profileSearchTemplate.content.querySelector('li');

        data.forEach(function(dataEntry){
          var profileId = dataEntry.id;
          var profileName = dataEntry.name;

          if (participantsList.querySelector('input[name=participants][value="' + profileId + '"]')) {
            return;
          }

          var profileSearchNode = document.importNode(profileSearchListItem, true);
          var profileResultLink = profileSearchNode.querySelector('a.search-result');
          profileResultLink.innerHTML = profileName;

          profileResultLink.onclick = function() {
            var searchResultTemplate = document.querySelector('template#profile-search-result-template');
            var searchResultListItem = searchResultTemplate.content.querySelector('li');
            var searchResultNode = document.importNode(searchResultListItem, true);
            var searchResultLink = searchResultNode.querySelector('a.search-result-link');
            var remove = searchResultNode.querySelector('span.remove-participant');
            var input = searchResultNode.querySelector('input[type=hidden]');

            searchResultLink.href = '/profile/show/' + profileId;
            searchResultLink.innerHTML = profileName;
            input.value = profileId;

            remove.onclick = function() {
              participantsList.removeChild(searchResultNode);
              toggleConversationNameContainer();
            };

            participantsList.appendChild(searchResultNode);
            toggleConversationNameContainer();
          };

          profileSearcher.searchResult.appendChild(profileSearchNode);

          function toggleConversationNameContainer() {
            var conversationNameContainer = createConversationWrapper.querySelector('div.new-conversation-name-container');

            if (participantsList.querySelectorAll('input[name=participants]').length > 1) {
              conversationNameContainer.style.display = 'block';
            } else {
              conversationNameContainer.style.display = 'none';
            }
          }
        });
      });
    },
    400: function(response, form) {
      formValidator.handleBadRequest(response, form);
    }
  },
  send: function(form) {
    var formData = new FormData(form);
    var message = formData.get('message');

    if (!message) {
      var inputBox = form.querySelector('input[name=message]');
      $(inputBox).tooltip('show');
      return;
    }

    form.querySelector('input[name=message]').value = '';
    var url = '/api/message/conversations/' + messaging.conversationId + '/messages';

    var payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({text: message})
    };

    ajaxHandler.fetch(form, url, payload, messaging.actions);
  },
  conversation: function(conversationId, page, size) {
    document.title = i18n.en.messaging.title;

    if (conversationId) {
      var url = '/api/message/conversations/' + conversationId + '?page=' + page + '&size=' + size;
      ajaxHandler.fetch(null, url, {method: 'GET'}, messaging.actions);
    }
  },
  appendMessages: function(messages, conversationDetails, append) {
    var messagesContainer = conversationDetails.querySelector('div#messages-container');
    var messagesList = messagesContainer.querySelector('ul#messages-list');
    var messageTemplate = messagesContainer.querySelector('template#message-template');
    var messageForm = messagesContainer.querySelector('form#message-form');
    var firstListItem = messagesList.firstChild;
    var spinner = document.querySelector('img.load-more-messages-spinner');
    spinner.classList.add('hidden');

    if (!append) {
      messagesList.innerHTML = '';

      messageForm.onsubmit = function() {
        messaging.send(this);
        return false;
      }
    }

    messages.forEach(function(message) {
      var messageListItem = messageTemplate.content.querySelector('li');
      var messageNode = document.importNode(messageListItem, true);

      if (message.system) {
        messageNode.style.fontStyle = 'italic';
      }

      var authorLink = messageNode.querySelector('a.message-author');
      authorLink.setAttribute('href', '/profile/show/' + message.author.id);
      authorLink.querySelector('b').innerHTML = message.author.name;

      var encodedStr = message.text.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
         return '&#'+i.charCodeAt(0)+';';
      });

      messageNode.querySelector('span.message-text').innerHTML = encodedStr;

      if (message.subject) {
        var subjectLink = messageNode.querySelector('a.message-subject');
        subjectLink.setAttribute('href', '/profile/show/' + message.subject.id);
        subjectLink.querySelector('b').innerHTML = message.subject.name;
      }

      if (message.unread) {
        messageNode.classList.add('message-unread');
      }

      messageNode.querySelector('span.message-created-date').innerHTML = message.createdDate;
      messageNode.setAttribute('message-id', message.id);

      append ? messagesList.insertBefore(messageNode, firstListItem) : messagesList.appendChild(messageNode);
    });

    var loadMoreButton = messagesContainer.querySelector('div#load-more-messages');

    if (messages.length == messaging.defaultMessagesSize) {
      loadMoreButton.classList.remove('hidden');
    } else {
      loadMoreButton.classList.add('hidden');
    }
  },
  loadMessages: function() {
    var page = ++messaging.currentMessagesPage;
    var size = messaging.defaultMessagesSize;
    var url = '/api/message/conversations/' + messaging.conversationId + '?page=' + page + '&size=' + size;
    var conversationDetails = document.querySelector('div#conversation-details');
    var messagesContainer = conversationDetails.querySelector('div#messages-container');
    var loadMoreButton = messagesContainer.querySelector('div#load-more-messages');
    loadMoreButton.classList.add('hidden');
    var spinner = document.querySelector('img.load-more-messages-spinner');
    spinner.classList.remove('hidden');

    var actions = {
      200: function(response) {
        response.json().then(function(conversation) {
          const append = true;
          messaging.appendMessages(conversation.messages, conversationDetails, append);
          messaging.markAsRead();
        });
      }
    }

    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);
  },
  loadConversations: function(append) {
    document.title = i18n.en.messaging.title;
    var conversationsContainer = document.querySelector('#conversations-container');
    var conversationsList = conversationsContainer.querySelector('ul#conversations-list');
    var spinner = conversationsContainer.querySelector('img.spinner');

    if (!append) {
      messaging.currentConversationsPage = messaging.defaultPageNumber;
    } else {
      spinner.classList.remove('hidden');
    }

    var actions = {
      200: function(response) {
        const userInfo = JSON.parse(response.headers.get("User-Info"));
        const lang = userInfo.lang;
        document.querySelector("span.create-conversation-button").innerHTML = i18n[lang].messaging.createConversationButton;

        const createConversationPopup = document.querySelector("#create-conversation-popup");
        const profileSearchBox = createConversationPopup.querySelector("input.profile-search-box");
        const profileSearchButton = createConversationPopup.querySelector("button.profile-search-button");
        const loadMoreButton = createConversationPopup.querySelector("button.load-more-button");
        profileSearchBox.placeholder = i18n[lang].messaging.participantSearchPlaceholder;

        profileSearchButton.onclick = function() {
          profileSearcher.search(this, 0, messaging.createConversationActions);
          return false;
        };

        loadMoreButton.onclick = function() {
          profileSearcher.search(this, 10, messaging.createConversationActions);
          return false;
        };

        loadMoreButton.querySelector("i").innerHTML = i18n[lang].messaging.loadMoreParticipants;

        const loadMoreConversationsSection = conversationsContainer.querySelector("div#load-more-conversations");
        const loadMoreConversationsButton = loadMoreConversationsSection.querySelector("button");
        loadMoreConversationsButton.innerHTML = i18n[lang].messaging.loadMoreConversations;

        loadMoreConversationsButton.onclick = function() {
          messaging.loadConversations(true);
        };

        const createConversationForm = createConversationPopup.querySelector("form.create-conversation-form");
        createConversationForm.action = "/api/message/conversations";

        createConversationForm.onsubmit = function() {
          messaging.createConversation(this);
          return false;
        };

        const nameInput = createConversationForm.querySelector("input[name=name]");
        const textInput = createConversationForm.querySelector("textarea[name=text]");
        const submitButton = createConversationForm.querySelector("button.submit-button");
        nameInput.placeholder = i18n[lang].messaging.conversationName;
        textInput.placeholder = i18n[lang].messaging.message;
        submitButton.innerHTML = i18n[lang].messaging.sendMessage;

        response.json().then(function(data) {
          var conversations = data.conversations
          var conversationTemplate = document.querySelector('template#conversation-template');

          spinner.classList.add('hidden');

          if (!append) {
            conversationsList.innerHTML = '';
          }

          conversations.forEach(function(conversation) {
            var lastMessage = conversation.lastMessage;
            var conversationListItem = conversationTemplate.content.querySelector('li');
            var conversationNode = document.importNode(conversationListItem, true);
            var conversationNameContainer = conversationNode.querySelector('b.conversation-name');
            var lastMessageContainer = conversationNode.querySelector('i.last-message');
            var unreadCounter = conversationNode.querySelector('.badge-notify');

            unreadCounter.innerHTML = conversation.unreadMessagesCount || "";

            conversationNode.onclick = function() {
              messaging.conversation(conversation.id, messaging.defaultPageNumber, messaging.defaultConversationsSize);
            }

            if (lastMessage.unread) {
              conversationNode.style.backgroundColor = '#E9F9FF';
            }

            if (conversation.type == 'CONFERENCE' && conversation.name) {
              conversationNameContainer.innerHTML = conversation.name;
            } else {
              conversationNameContainer.innerHTML = conversation.conversant;
            }

            let rawMessage = lastMessage.author.name + ': ' + lastMessage.text;

            if (lastMessage.subject) {
              rawMessage += ' ' + lastMessage.subject.name;
            }

            const encodedStr = rawMessage.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
               return '&#'+i.charCodeAt(0)+';';
            });

            lastMessageContainer.innerHTML = encodedStr;

            conversationsList.appendChild(conversationNode);
          });

          messaging.currentConversationsPage++;
          var loadMoreButton = conversationsContainer.querySelector('div#load-more-conversations');

          if (conversations.length == messaging.defaultConversationsSize) {
            loadMoreButton.classList.remove('hidden');
          } else {
            loadMoreButton.classList.add('hidden');
          }
        });
      }
    }

    var url = '/api/message/conversations?page=' + messaging.currentConversationsPage + '&size=' + messaging.defaultConversationsSize;
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);
  },
  scrollMessagesDown: function() {
    var scrollable = document.querySelector('div#messages-container');
    scrollable.scrollTop = scrollable.scrollHeight - scrollable.clientHeight;
  },
  removeParticipant: function(form) {
    var payload = {
      method: 'DELETE',
    };

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, messaging.actions);
  },
  addParticipants: function(form) {
    var formData = new FormData(form);

    var object = {
      participants: formData.getAll('participants')
    };

    var payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, messaging.actions);
  },
  displayNewMessagesCounter: function() {
    var counter = document.querySelector('span#new-conversations');
    var url = '/api/message/conversations';

    var actions = {
      200: function(response) {
        var count = response.headers.get("X-Total-Count");

        if (count > 0) {
          counter.classList.remove('hidden');
          counter.innerHTML = count;
        } else {
          counter.classList.add('hidden');
          counter.innerHTML = '';
        }
      }
    };

    ajaxHandler.fetch(null, url, {method: 'HEAD'}, actions);
  },
  markAsRead: function() {
    if (messaging.didScroll) {
      return;
    }

    messaging.didScroll = true;
    var conversationId = messaging.conversationId;

    if (!conversationId) {
      messaging.didScroll = false;
      return;
    }

    var messagesList = document.querySelector('ul#messages-list');
    var unreadMessages = messagesList.getElementsByClassName('message-unread');
    var messagesToMarkAsRead = [];

    setTimeout(function() {
      for (var i = 0; i < unreadMessages.length; i++) {
        var message = unreadMessages[i];
        
        if (isMessageVisible(message)) {
          messagesToMarkAsRead.push(message);
        }
      }

      if (!messagesToMarkAsRead.length) {
        messaging.didScroll = false;
        return;
      }

      var url = '/api/message/conversations/' + conversationId + '/read';
      var data = {'messages': messagesToMarkAsRead.map(getMessageId)};

      var payload = {
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      };

      var actions = {
        200: function(response) {
          if (response.ok) {
            setTimeout(function() {
              var appendConversations = false;
              messaging.loadConversations(appendConversations);
              messaging.displayNewMessagesCounter();
              [].slice.call(messagesToMarkAsRead).forEach(dropUnreadState)
            }, 1000);
          }
        }
      };

      messaging.didScroll = false;
      ajaxHandler.fetch(null, url, payload, actions);
    }, 1000);

    function getMessageId(message) {
      return message.getAttribute('message-id');
    }

    function dropUnreadState(message) {
      message.classList.remove('message-unread');
    }

    function isMessageVisible(message) {
      var top = message.getBoundingClientRect().top

      if ((top > 40) && (top < window.innerHeight - 40)) {
        return true;
      }

      return false;
    }
  },
  clearForms: function() {
    var conversationPopupWrapper = document.querySelector('div#conversation-popup-wrapper');
    var conversationPopupTemplate = document.querySelector('template#conversation-popup-template');
    var conversationPopupContent = conversationPopupTemplate.content.querySelector('div');
    var conversationPopupNode = document.importNode(conversationPopupContent, true);
    conversationPopupWrapper.innerHTML = '';
    conversationPopupWrapper.appendChild(conversationPopupNode);

    var addParticipantWrapper = document.querySelector('div#add-participant-wrapper');
    var addParticipantTemplate = document.querySelector('template#add-participant-template');
    var addParticipantContent = addParticipantTemplate.content.querySelector('div');
    var addParticipantNode = document.importNode(addParticipantContent, true);
    addParticipantWrapper.innerHTML = '';
    addParticipantWrapper.appendChild(addParticipantNode);
  }
}
