#!/bin/bash
# wait-for-it.sh: Wait for a service to be available before proceeding
# Usage: ./wait-for-it.sh host:port [-- command args]
# Example: ./wait-for-it.sh db:5432 -- echo "DB is up"

set -e

host="$1"
shift
cmd="$@"

until nc -z -v -w30 ${host%:*} ${host#*:}; do
  echo "Waiting for ${host} to be available..."
  sleep 1
done

echo "${host} is available, proceeding with command execution"

if [[ -n $cmd ]]; then
  exec $cmd
fi
