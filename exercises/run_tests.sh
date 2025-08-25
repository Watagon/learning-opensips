#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail

tests=()

for i in *
do
    if [[ -d $i ]]
    then
        test_folder=$i

        sudo cp -f $test_folder/opensips.cfg /usr/local/etc/opensips/

        # restart opensips with new opensips.cfg
        opensips-cli -x mi kill

        # execute the test
        node $test_folder/test.js

        tests+=($i)
    fi
done

echo "Success. All tests passed"
echo

for item in "${tests[@]}"
do
  echo " - $item: OK"
done

echo

