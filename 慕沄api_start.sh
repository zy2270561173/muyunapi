PATH=/www/server/nodejs/v24.15.0/bin:/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

export 
export NODE_PROJECT_NAME="慕沄api"
cd /disk/muyunapi
nohup /www/server/nodejs/v24.15.0/bin/node /disk/muyunapi/start.js  &>> /www/wwwlogs/nodejs/慕沄api.log &
echo $! > /www/server/nodejs/vhost/pids/慕沄api.pid
