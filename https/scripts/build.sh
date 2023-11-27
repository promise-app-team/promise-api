dotenv=$(git rev-parse --show-toplevel)/.env
if [ ! -f "$dotenv" ]; then
  echo "Please create a .env file in the root directory"
  exit 1
fi

source $dotenv

docker build . -t promise-api:https --build-arg PORT=$PORT
