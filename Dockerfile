FROM nginx

COPY index.html /usr/share/nginx/html

COPY favicon.ico /usr/share/nginx/html

COPY js /usr/share/nginx/html/js

COPY css /usr/share/nginx/html/css

COPY images /usr/share/nginx/html/images

COPY nginx/conf.d /etc/nginx/conf.d
