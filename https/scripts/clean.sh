# Clean docker container and image
image=promise-api:local

container_id=$(docker ps -a -q --filter ancestor=$image)
if [[ ! -z $container_id ]]; then
  docker rm -f $container_id
fi

image_id=$(docker images -a -q --filter reference=$image)
if [[ ! -z $image_id ]]; then
  docker rmi -f $image_id
fi
