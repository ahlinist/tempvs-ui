import {pageBuilder} from './page/page-builder.js';
import {i18n} from './i18n/profile-translations.js';
import {i18n as imageI18n} from './i18n/image-translations.js';
import {formValidator} from './validation/form-validator.js';
import {langResolver} from './i18n/language-resolver.js';
import {user} from './user.js';
import {ajaxHandler} from './ajax/ajax-handler.js';
import {i18n as periodI18n} from './i18n/period-translations.js';

export const profile = {
  init: function() {
    const location = window.location.pathname;

    if (location === "/profile" || location === "/profile/") {
      profile.loadProfile();
    } else if (location.includes("/profile/")) {
      const n = location.lastIndexOf('/');
      const profileId = location.substring(n + 1);
      profile.loadProfile(profileId);
    }
  },
  loadProfile: function(profileId) {
    ajaxHandler.blockUI();
    let url = profileId ? '/api/profile/profile/' + profileId : '/api/profile/profile';

    const actions = {
      200: profile.parseProfileResponse,
      401: user.loginPopup,
      404: profile.renderCreateUserProfile
    };
    ajaxHandler.fetch(null, url, {method: 'GET'}, actions);
  },
  renderCreateUserProfile: function(response) {
    const lang = langResolver.resolve(response);
    const messageSource = i18n[lang] || i18n['en'];
    const messages = messageSource.create;
    const properties = messageSource.properties;
    ajaxHandler.hideModals();
    pageBuilder.initPage('template#create-user-profile', '/profile', messages.title);
    document.querySelector('h1.create-user-profile-heading').innerHTML = messages.heading;
    const form = document.querySelector('form.create-user-profile-form');
    form.querySelector('label[for=firstName]').innerHTML = properties.firstName + ' *';
    form.querySelector('label[for=lastName]').innerHTML = properties.lastName + ' *';
    const submitButton = form.querySelector('button.submit-button').innerHTML = messages.submitButton;

    form.onsubmit = function() {
      const firstNameBlank = formValidator.validateBlank(
          form.querySelector('[name=firstName]'),
          messages.firstNameBlank
      );

      const lastNameBlank = formValidator.validateBlank(
          form.querySelector('[name=lastName]'),
          messages.lastNameBlank
      );

      if (firstNameBlank || lastNameBlank) {
        return false;
      }

      ajaxHandler.blockUI();
      const formData = new FormData(this);

      const actions = {
        200: profile.parseProfileResponse,
        400: function(response, form) {
          formValidator.handleBadRequest(response, form);
        }
      };

      const object = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        type: 'USER'
      };

      const payload = {
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(object)
      };
      ajaxHandler.fetch(this, this.action, payload, actions);
      return false;
    };
  },
  parseProfileResponse: function(response) {
    const userInfo = JSON.parse(response.headers.get("User-Info"));
    const lang = langResolver.resolve(response) || 'en';

    response.json().then(function(data) {
      profile.renderProfile(data, userInfo, lang);
    });
  },
  renderProfile: (prof, userInfo, lang) => {
    const messageSource = i18n[lang] || i18n['en'];
    const properties = messageSource.properties;
    const profileId = prof.id;
    const firstName = prof.firstName;
    const lastName = prof.lastName;
    const nickName = prof.nickName;
    const period = prof.period;
    ajaxHandler.hideModals();
    pageBuilder.initPage('template#profile', '/profile/' + profileId, firstName + ' ' + lastName);

    const firstNameLabel = properties.firstName;
    const lastNameLabel = properties.lastName;
    const nickNameLabel = properties.nickName;
    const periodLabel = properties.period;
    const updateFirstNameAction = '/api/profile/' + profileId + '/firstName';
    const updateLastNameAction = '/api/profile/' + profileId + '/lastName';
    const updateNickNameAction = '/api/profile/' + profileId + '/nickName';
    const profileForm = document.querySelector(".profile-form");

    const isEditable = prof.userId === (userInfo ? userInfo.userId : false);
    pageBuilder.smartForm(profileForm, firstNameLabel, firstName, 'firstName', updateFirstNameAction, isEditable, true);
    pageBuilder.smartForm(profileForm, lastNameLabel, lastName, 'lastName', updateLastNameAction, isEditable);
    pageBuilder.smartForm(profileForm, nickNameLabel, nickName, 'nickName', updateNickNameAction, isEditable);

    pageBuilder.imageSection(
      document.querySelector('div.image-container'),
      '/api/profile/profile/' + profileId + '/avatar',
      imageI18n['en'],
      '/api/image/image/profile/' + profileId,
      isEditable
    );

    if (prof.type === 'USER') {
      const clubProfilesSection = document.querySelector('div.club-profiles-section');
      clubProfilesSection.classList.remove('hidden');
      const clubProfilesHeading = clubProfilesSection.querySelector('h2.club-profiles-heading');
      clubProfilesHeading.innerHTML = messageSource.club.listHeading;

      profile.buildClubProfilesList(clubProfilesSection, prof.userId);

      if (isEditable) {
        profile.renderCreateClubProfilesButton(clubProfilesSection, messageSource);
      }
    }

    if (profile.type === 'CLUB') {
      pageBuilder.smartForm(profileForm, periodLabel, period, 'period', null, isEditable);
    }
  },
  renderCreateClubProfilesButton: (clubProfilesSection, messageSource) => {
    const createClubProfileButton = clubProfilesSection.querySelector('button.create-club-profile-button');
    createClubProfileButton.classList.remove('hidden');
    const createClubProfileForm = clubProfilesSection.querySelector('form.create-club-profile-form');
    createClubProfileForm.querySelector('label[for=firstName]').innerHTML = messageSource.properties.firstName;
    createClubProfileForm.querySelector('label[for=lastName]').innerHTML = messageSource.properties.lastName;
    createClubProfileForm.querySelector('label[for=period]').innerHTML = messageSource.properties.period + ' *';
    const periods = periodI18n.en.period;
    const periodOptions = createClubProfileForm.querySelectorAll('select[name=period] > option');
    periodOptions.forEach(function(option) {
      option.innerHTML = periods[option.value].name;
    });
    const submitButton = createClubProfileForm.querySelector('button.submit-button');
    submitButton.innerHTML = messageSource.club.createButton;
    createClubProfileForm.onsubmit = function() {
      profile.createClubProfile(this);
      return false;
    };
  },
  renderClubProfilesList: (clubProfilesSection, profiles, userInfo, lang) => {
    const profileListItemTemplate = clubProfilesSection.querySelector('template#profile-list-item-template');
    const clubProfileList = clubProfilesSection.querySelector('ul.club-profile-list');

    for (const prof of profiles) {
      const profileId = prof.id;
      const profileListItem = profileListItemTemplate.content.querySelector('a');
      const profileLink = document.importNode(profileListItem, true);
      profileLink.href = '/profile/' + profileId;
      profileLink.onclick = function() {
        profile.renderProfile(prof, userInfo, lang);
        return false;
      }
      profileLink.innerHTML = prof.firstName + ' ' + prof.lastName + ' ' + (prof.nickName ? prof.nickName : '');
      clubProfileList.appendChild(profileLink);
    }
  },
  buildClubProfilesList: (clubProfilesSection, userId) => {
    const url = '/api/profile/club-profile?userId=' + userId;
    const payload = {
      method: 'GET',
      headers:{
        'Content-Type': 'application/json'
      }
    };

    const actions = {
      200: (response) => {
        const userInfo = JSON.parse(response.headers.get("User-Info"));
        const lang = langResolver.resolve(response) || 'en';

        response.json().then(function(data) {
          profile.renderClubProfilesList(clubProfilesSection, data, userInfo, lang);
        });
      }
    };

    ajaxHandler.fetch(null, url, payload, actions);
  },
  createClubProfile: function(form) {
    const formData = new FormData(form);

    const object = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      period: formData.get('period')
    };

    const payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };

    const actions = {
      200: profile.parseProfileResponse,
      400: function(response, form) {
        formValidator.handleBadRequest(response, form);
      }
    };

    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, actions);
  }
};
