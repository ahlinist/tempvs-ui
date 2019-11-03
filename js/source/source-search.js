export const sourceSearch = {
  buildUrl: function(form) {
    const formData = new FormData(form);

    const object = {
      query: formData.get('query'),
      period: formData.get('period').toUpperCase(),
      classifications: formData.getAll('classification'),
      types: formData.getAll('type')
    };

    const q = window.btoa(encodeURIComponent(JSON.stringify(object)));
    return form.action + '?page=0&size=40&q=' + q;
  }
};
