FROM nginx

COPY index.html /usr/share/nginx/html

COPY favicon.ico /usr/share/nginx/html

COPY js /usr/share/nginx/html/js

COPY css /usr/share/nginx/html/css

COPY images /usr/share/nginx/html/images

COPY nginx/conf.d/default.conf /etc/nginx/conf.d/

CMD /bin/bash -c "envsubst '\$PORT \$GATEWAY_URL' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf" && nginx -g 'daemon off;'