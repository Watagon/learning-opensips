#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail

function usage() {
    cat <<EOF
Usage: $0 TEST_NAME
Ex:    $0 register
EOF
}

if [[ $# -ne 1 ]]
then
    usage
    exit 1
fi

test_folder=$1

/usr/local/src/git/opensips/opensips -c -f $test_folder/opensips.cfg

sudo cp -f $test_folder/opensips.cfg /usr/local/etc/opensips/

# kill opensips (it will restart using the new opensips.cfg)
opensips-cli -x mi kill

# execute the test
node $test_folder/test.js

