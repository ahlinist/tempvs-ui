import {library} from './library.js';
import {stash} from './stash.js';
import {messaging} from './messaging.js';
import {profile} from './profile.js';
import {user} from './user.js';
import {header} from './header.js';

window.onload = function() {
  header.init();
  library.init();
  stash.init();
  messaging.init();
  profile.init();
  user.init();

  //TODO: to be refactored
  //preventing double clicking
  $('.disableable').click(function() {
      this.setAttribute('disabled', true);
  });

  $('body').click(function() {
      $('.popped-over').popover('destroy');
      $('[data-toggle="tooltip"]').tooltip('destroy');
  });

  //enabling tooltips for glyphiconed buttons
  $('[data-toggle="tooltip"]').tooltip();

  //hide inner modals and their backdrops after hiding the outer modal
  $('.modal').on('hidden.bs.modal', function (e) {
      if ($('.modal:visible').length == 0) {
          ajaxHandler.hideModals();
      }
  });

  //hide tooltip when modal is shown
  $('.modal').on('shown.bs.modal', function (e) {
      $('[data-toggle="tooltip"]').tooltip('hide');
  });
};
