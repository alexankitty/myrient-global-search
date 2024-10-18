# Myrient Search Engine
It is finally here. There is now a way to search all of Myrient's offerings.  
[Myrient Search](https://myrientsearch.org) can be accessed by clicking the link.
# Requirements
1. nodejs
2. npm

# Self-Hosting
1. Clone the repository. `git clone https://github.com/alexankitty/Myrient-Search-Engine`
2. Install dependencies. `npm i`
3. Start the server. `node server.js`

# HTTPS Encryption 
Use something like `nginx` and add a site to sites-available called myrient-search in `/etc/ngix/sites-available`.  
Link the site to the sites-enabled folder. `ln -sf /etc/nginx/sites-available/myrient-search /etc/nginx/sites-enabled/myrient-search`  
## nginx Site Template
```
server {
    listen 80;
    listen [::]:80;

    server_name server address.tld
    root /usr/share/nginx
    access_log on;
}

#server {

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name serveraddress.tld;
    access_log on;

    root /usr/share/nginx;

    location / {
        add_header Cache-Control no-cache;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:8062/;
    }

}
```
## SSL Certificate
For the SSL certificate you can use certbot via the `certbot -d servername.tld` command and adding it to your `crontab`.  
[Additional Information for Certbot Setup](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04)