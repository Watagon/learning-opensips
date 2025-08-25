# learning-opensips

## Overview

This repo provides tools to quickly get up to speed working with opensips using [zeq](https://github.com/MayamaTakeshi/zeq) and [sip-lab](https://github.com/MayamaTakeshi/sip-lab) to write functional tests.

Here we have a Dockerfile that permits to build a docker image with opensips, node.js (used to run functional tests) and sngrep2 (used to follow SIP message flows)

## Building the image:
```
./build_image.sh
```
This will take several minutes to complete. Be patient as we will build opensips from source.

After it completes, we will have Debian 11 with opensips 3.6.0 installed with almost all modules except for these ones that require extra libs, require special building procedure, requires special hardware or are failing to compile due to bugs in the module code itself:

- db_oracle 
- osp
- cachedb_cassandra
- cachedb_couchbase
- cachedb_dynamodb
- sngtc
- aaa_radius
- event_sqs
- http2d
- launch_darkly
- rtp.io
- tls_wolfssl

## Starting the container:
```
./start_container.sh
```

Once you are inside the container, you can start a tmux session for work by doing:
```
./tmux_session.sh
```

This will create the tmux session specified in tmux_session.yml:
```
name: learning-opensips
root: ~/src/git/learning-opensips

windows:
  - opensips:
    - sudo /etc/init.d/mariadb restart
    - sudo cp -f etc/opensips/opensips.cfg /usr/local/etc/opensips/
    - ./opensips_loop.sh
  - opensips-cli:
    - sleep 5
    - opensips-cli
  - mariadb:
    - sleep 5
    - mysql -u root -pbrastel opensips
  - sngrep2:
    - sudo sngrep2 -d any
  - exercises:
    - npm i
    - cd ~/src/git/learning-opensips/exercises
```

The 'opensips' window will have opensips running and outputting logs.

The 'opensips-cli' window runs the tool that permits to talk to opensips and send commands to it.

Obs: sngrep2 is a fork of [sngrep](https://github.com/irontec/sngrep) with support for RFC2833 DTMF and MRCP support.

## Test-driven development

When developing solutions, we need to provide test scripts confirming their proper behavior.

So we use node.js [zeq](https://github.com/MayamaTakeshi/zeq) module that permits to write functional tests.

This is a simple library that permits to sequence execution of commands and wait for events triggered by the commands.

Then [sip-lab](https://github.com/MayamaTakeshi/sip-lab) is used to make/receive SIP calls and perform media operations (play/record audio files, detect digits, send receive fax, etc).

So we combine these two libraries to write functional SIP tests.

You can see a generic sample (not involving freeswitch) here: https://github.com/MayamaTakeshi/sip-lab/blob/master/samples/simple.js

## Opensips SIP registrar/proxy server

Opensips is a SIP registrar and proxy server. A SIP registrar is an entity that maintains records of locations where SIP entities like SIP terminal/softphones can be found.

This is necessary for SIP terminals/softphones because their IP:Port can change due the change of network/roaming etc.

So they don't have a fixed IP:Port and this information must be informed to a central location (the SIP registrar) and kept updated periodically.

Then Opensips is also a proxy as it accepts SIP requests, resolves the destination SIP entity and proxies the request to it.

The opensips documentation can be found here: https://www.opensips.org/Documentation/Manual-3-6

The documentation is large but basically, you must understand that opensips.cfg defines how a SIP message should be handled by opensips.

This means to decide what to do with the message, like refuse it, process it locally or proxy it to some SIP entity.

This is done by routes, so you can start by reading about them here: https://www.opensips.org/Documentation/Script-Routes-3-6

## Configuring opensips

The configuration of opensips is done by a single file at /usr/local/etc/opensips/opensips.cfg

For our training purposes, we will have exercises to be completed and each exercise will be in a folder like this:
```
  - exercises
    - exercise1
      - opensips.cfg
      - test.js
    - exercise2
      - opensips.cfg
      - test.js
    - exercise3
      - opensips.cfg
      - test.js
    - exercise4
      - opensips.cfg
      - test.js
```

So each exercise will have its own opensips.cfg and test.js file.

To run an exercise we will do:
```
./run_test.sh EXERCISE_NAME
```

The script run_test.sh will copy the exercise opensips.cfg to /usr/local/etc/opensips/opensips.cfg and will force opensips to restart to get the new configuration

then run_test.sh will run 'node test.js'

## Running a sample test script

Inside the container, in the tmux session, switch to the 'exercises' window and do:

```
./run_test.sh register
```

This test will make a REGISTER request to opensips and expect for a reply.

For this, the test send the request with header 'Expires: 60' which means we want the registrar server (opensips) to keep the registration valid for 60 seconds. So if we don't re-register again after 60 seconds, the registration
can should be discarded (to avoid stale registrations, we must keep re-registering periodically).

After the above is successful, the test will un-REGISTER (header 'Expires: 0', meaning the registrar server should delete the registration) and expects the reply for it.

Switch to the 'sngrep2' window to inspect the SIP messages exchanged by the test script and opensips.

You can also switch to the 'opensips' window to check its logs. This will not make much sense right now but it will be important when debugging.


## Exercises



Once all exercises are complete you can run all of them by doing:
```
./run_tests.sh
```
