export const ajaxHandler = {
  fetch: function(form, url, payload, actions) {
    fetch(url, payload)
      .then(
        function(response) {
          ajaxHandler.unblockUI();
          actions[response.status](response, form);
        }
      )
      .catch(function(error) {
        ajaxHandler.unblockUI();
        console.log('Looks like there was a problem: ' + error);
      });
  },
  hideModals: function() {
    const backdrop = document.querySelector('.modal-backdrop');

    if (backdrop) {
        backdrop.parentNode.removeChild(backdrop);
    }

    $('.modal-backdrop').remove();
    $('.modal').modal('hide');
    document.querySelector('body').classList.remove('modal-open');
  },
  blockUI: function() {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);
  },
  unblockUI: function() {
    const overlay = document.querySelector('#overlay');

    if (overlay && overlay.parentNode == document.body) {
        document.body.removeChild(overlay);
    }
  }
};
