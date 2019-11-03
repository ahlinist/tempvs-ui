export const formValidator = {
  handleBadRequest: function(response, form, specificAction) {
    response.json().then(function (data) {
      const errors = data.errors;

      for (const fieldName in errors) {
        const validationMessage = errors[fieldName];
        let field;

        if (form.classList.contains("smart-form")) {
          field = form.querySelector('.text-holder');
        } else {
          field = form.querySelector('[name="' + fieldName + '"]')
        }

        if (!field) {
            field = form.querySelector('.submit-button');
        }

        field.classList.add('popped-over');

        $(field).popover({
          placement: 'bottom',
          content: validationMessage,
          html: true,
          container: 'body'
        }).popover('show');
      }

      if (specificAction) {
        specificAction();
      }
    });
  },
  validateBlank: function(field, message) {
    if (!field.value || !/\S/.test(field.value)) {
      field.setAttribute('data-toggle', 'tooltip');
      field.setAttribute('data-placement', 'top');
      field.setAttribute('title', message);
      $(field).tooltip('show');
      return true;
    }

    return false;
  }
};
