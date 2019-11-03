import {ajaxHandler} from '../ajax/ajax-handler.js';

export const image = {
  uploadImage: function(form, actions) {
    const formData = new FormData(form);
    const image = formData.get('image');
    const imageInfo = formData.get('imageInfo');

    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onload = () => {
        let encoded = reader.result.replace(/^data:(.*;base64,)?/, '');
        if ((encoded.length % 4) > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4));
        }

        const object = {
          imageInfo: imageInfo,
          content: encoded,
          fileName: image.name
        };

        resolve(object);
      };
      reader.onerror = error => reject(error);
    })
    .then(
      data => {
        const payload = {
          method: 'POST',
          headers:{
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        };

        ajaxHandler.blockUI();
        ajaxHandler.fetch(form, form.action, payload, actions);
      }
    );
  }
};
