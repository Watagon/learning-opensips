#!/bin/bash

# Fix sudo host warning (optional)
echo "127.0.0.1 $(hostname)" | sudo tee -a /etc/hosts >/dev/null

function start_opensips {
    echo starting opensips
    sudo /usr/sbin/opensips -F
}

trap "echo 'Stopping OpenSIPS...'; sudo kill -TERM $pid 2>/dev/null; echo trapped SIGINT; exit 0" SIGINT

trap "echo 'echo trapped SIGTERM'; start_opensips" SIGTERM

start_opensips
