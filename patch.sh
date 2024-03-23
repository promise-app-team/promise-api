#!/bin/bash

file="$(find . -name "plugin-utils.js")"
os=$(uname -s)

echo "Patching $file (OS: $os)"

if [[ $os == "Darwin" ]]; then
  sed -i '' "s/'Promise'/'Promise<'/" $file
  sed -i '' "s/'Observable'/'Observable<'/" $file
elif [[ $os == "Linux" ]]; then
  sed -i "s/'Promise'/'Promise<'/" $file
  sed -i "s/'Observable'/'Observable<'/" $file
fi

echo "Result:"
cat $file | grep -A 2 "isPromiseOrObservable(type)"
