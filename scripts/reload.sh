bun run build

pm2 kill

# pm2 start yarn --interpreter bash --name promise-api --cron-restart="0 1/6 * * *"  -- start:prod;
pm2 start bun --name promise-api -- start:prod
