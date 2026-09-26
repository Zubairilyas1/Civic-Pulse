#!/bin/sh
set -eu

: "${API_BASE_URL:=/api}"
export API_BASE_URL

envsubst '${API_BASE_URL}' < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js
