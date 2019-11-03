import {pageBuilder} from './page/page-builder.js';
import {langResolver} from './i18n/language-resolver.js';
import {i18n} from './i18n/user-translations.js';
import {header} from './header.js';
import {profile} from './profile.js';
import {formValidator} from './validation/form-validator.js';
import {ajaxHandler} from './ajax/ajax-handler.js';

export const user = {
  init: function() {
    const location = window.location.pathname;

    if (location.startsWith('/user/registration/')) {
      const idPosition = location.lastIndexOf('/');
      const verificationId = location.substring(idPosition + 1);
      user.verify(verificationId);
    }
  },
  verify: function(verificationId) {
    const lang = langResolver.resolve();
    const messageSource = i18n[lang] || i18n['en'];
    pageBuilder.initPage('template#create-user', '/user/registration/' + verificationId, messageSource.create.title);
    const registerForm = document.querySelector('content form.register-user');
    registerForm.querySelector('label[for=password]').innerHTML = messageSource.create.password + ' *';
    registerForm.querySelector('button.submit-button').innerHTML = messageSource.create.submitButton;
    registerForm.action = '/api/user/verify/' + verificationId;
    registerForm.onsubmit = function() {
      const form = this;
      const formData = new FormData(form);
      const object = {
        password: formData.get('password'),
      };
      const payload = {
        method: 'POST',
        headers:{
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(object)
      };
      const actions = {
        200: function(response) {
          window.history.pushState("", "", '/profile');
          profile.loadProfile();
        },
        400: function(response, form) {
          formValidator.handleBadRequest(response, form);
        }
      };
      ajaxHandler.fetch(form, form.action, payload, actions);
      return false;
    }
  },
  loginPopup: function() {
    const lang = langResolver.resolve();
    const messageSource = i18n[lang] || i18n['en'];
    pageBuilder.initPage('template#unauthorized');
    document.querySelector('content div.message').innerHTML = messageSource.login.loginRequiredMessage;
    document.querySelector('header button.login-popup').click();
  },
  register: function() {
    const lang = langResolver.resolve();
    const messageSource = i18n[lang] || i18n['en'];
    const form = this;
    const isEmailBlank = formValidator.validateBlank(
        form.querySelector('input[name=email]'),
        messageSource.login.emailBlankMessage
    );
    if (isEmailBlank) {
      return false;
    }
    const formData = new FormData(form);
    const object = {
      email: formData.get('email'),
    };
    const payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };
    const actions = {
      200: function(response) {
        ajaxHandler.hideModals();
        const lang = langResolver.resolve(response);
        const messageSource = i18n[lang] || i18n['en'];
        const content = document.querySelector('content');
        content.innerHTML = messageSource.login.verificationSentMessage;
      },
      400: function(response, form) {
        formValidator.handleBadRequest(response, form);
      }
    };
    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, actions);
    return false;
  },
  login: function() {
    const lang = langResolver.resolve();
    const messageSource = i18n[lang] || i18n['en'];
    const form = this;
    const isEmailBlank = formValidator.validateBlank(
        form.querySelector('input[name=email]'),
        messageSource.login.emailBlankMessage
    );
    const isPasswordBlank = formValidator.validateBlank(
        form.querySelector('input[name=password]'),
        messageSource.login.passwordBlankMessage
    );
    if (isEmailBlank || isPasswordBlank) {
      return false;
    }
    const formData = new FormData(form);
    const object = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    const payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(object)
    };
    const actions = {
      200: function() {
        ajaxHandler.hideModals();
        location.reload();
      },
      400: function(response, form) {
        formValidator.handleBadRequest(response, form);
      }
    };
    ajaxHandler.blockUI();
    ajaxHandler.fetch(form, form.action, payload, actions);
    return false;
  },
  logout: function() {
    const url = '/api/user/logout';
    ajaxHandler.hideModals();
    const payload = {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json'
      }
    };
    const actions = {
      200: function(response) {
        location.reload();
      }
    };
    ajaxHandler.fetch(null, url, payload, actions);
  }
};
