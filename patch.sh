#!/bin/bash

_file="$(dirname $0)/node_modules/@nestjs/swagger/dist/plugin/utils/plugin-utils.js"
_os=$(uname -s)

if [[ $_os == "Darwin" ]]; then
  sed -i '' "s/'Promise'/'Promise<'/" $_file
  sed -i '' "s/'Observable'/'Observable<'/" $_file
elif [[ $_os == "Linux" ]]; then
  sed -i "s/'Promise'/'Promise<'/" $_file
  sed -i "s/'Observable'/'Observable<'/" $_file
fi
