# Clean docker container and image
image=promise-api:local

container_id=$(docker ps -a -q --filter ancestor=$image)
[[ -n $container_id ]] && docker rm -f $container_id

image_id=$(docker images -a -q --filter reference=$image)
[[ -n $image_id ]] && docker rmi -f $image_id
