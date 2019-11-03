import {langResolver} from './i18n/language-resolver.js';
import {i18n} from './i18n/header-translations.js';
import {formValidator} from './validation/form-validator.js';
import {user} from './user.js';
import {profile} from './profile.js';
import {stash} from './stash.js';
import {library} from './library.js';
import {messaging} from './messaging.js';
import {profileSearcher} from './profile/profile-searcher.js';

export const header = {
  init: function() {
    const lang = langResolver.resolve();
    const messageSource = i18n[lang] || i18n['en'];
    const isAuthenticated = isUserAuthenticated();
    const header = document.querySelector('header');

    //profile
    const profileSection = header.querySelector('span.profile');
    profileSection.setAttribute('title', messageSource.profile.tooltip);
    profileSection.querySelector('a.profile-link').onclick = function() {
      profile.loadProfile();
      return false;
    };

    //profile dropdown
    const profileDropdown = header.querySelector('span.profile-dropdown');

    //stash
    const stashSection = header.querySelector('span.stash');
    stashSection.setAttribute('title', messageSource.stash.tooltip);
    stashSection.querySelector('a.stash-link').onclick = function() {
      stash.renderStash();
      return false;
    };

    //followings
    const followings = header.querySelector('span.followings');
    followings.setAttribute('title', messageSource.followings.tooltip);

    //messaging
    const messagingSection = header.querySelector('span.messaging');
    messagingSection.setAttribute('title', messageSource.messaging.tooltip);
    messagingSection.querySelector('a.messaging-link').onclick = function() {
      messaging.renderMessaging();
      return false;
    };

    //library
    const librarySection = header.querySelector('span.library');
    librarySection.setAttribute('title', messageSource.library.tooltip);
    librarySection.querySelector('a.library-link').onclick = function() {
      library.renderLibrary();
      return false;
    };

    //logout button
    const logout = header.querySelector('span.logout');
    const logoutButton = logout.querySelector('span.fa-sign-out');
    logout.setAttribute('title', messageSource.logout.tooltip);
    logoutButton.onclick = user.logout;

    //login popup
    const login = header.querySelector('span.login');
    login.setAttribute('title', messageSource.login.tooltip);
    login.querySelector('[href=\\#login-tab]').innerHTML = messageSource.login.loginTab;
    login.querySelector('[href=\\#register-tab]').innerHTML = messageSource.login.registerTab;

    //registration form
    const registerForm = login.querySelector('form.registration');
    registerForm.querySelector('label[for=email]').innerHTML = messageSource.login.email + ' *';
    registerForm.querySelector('button.register').innerHTML = messageSource.login.registerButton;
    registerForm.action = '/api/user/register';
    registerForm.onsubmit = user.register;

    //login form
    const loginForm = login.querySelector('form.login');
    loginForm.querySelector('label[for=email]').innerHTML = messageSource.login.email + ' *';
    loginForm.querySelector('label[for=password]').innerHTML = messageSource.login.password + ' *';
    loginForm.querySelector('button.login').innerHTML = messageSource.login.loginButton;
    loginForm.action = '/api/user/login';
    loginForm.onsubmit = user.login;

    if (isAuthenticated) {
      login.classList.add('hidden');
      logout.classList.remove('hidden');
      profileSection.classList.remove('hidden');
      profileDropdown.classList.remove('hidden');
      followings.classList.remove('hidden');
      stashSection.classList.remove('hidden');
      messagingSection.classList.remove('hidden');
    } else {
      logout.classList.add('hidden');
      profileSection.classList.add('hidden');
      profileDropdown.classList.add('hidden');
      followings.classList.add('hidden');
      stashSection.classList.add('hidden');
      messagingSection.classList.add('hidden');
      login.classList.remove('hidden');
    }

    //profile search
    if (isAuthenticated) {
      const profileSearch = header.querySelector('span.profile-search');
      profileSearch.classList.remove('hidden');
      profileSearch.querySelector('input.profile-search-box').setAttribute('placeholder', messageSource.profileSearch.placeholder);
      const profileSearchButton = profileSearch.querySelector('button.profile-search-button');
      profileSearchButton.onclick = function() {
        profileSearcher.search(this, 0);
      }
      const loadMoreButton = profileSearch.querySelector('button.load-more-button');
      loadMoreButton.innerHTML = messageSource.profileSearch.loadMore.italics();
    }

    function isUserAuthenticated() {
      const authCookieName = 'TEMPVS_LOGGED_IN';
      const cookieMatcher = document.cookie.match('(^|;) ?' + authCookieName + '=([^;]*)(;|$)');
      return cookieMatcher && cookieMatcher[2] === 'true';
    }
  }
};
