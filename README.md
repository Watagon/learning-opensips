# learning-opensips

## Overview

This repo provides tools to quickly get up to speed working with opensips using [zeq](https://github.com/MayamaTakeshi/zeq) and [sip-lab](https://github.com/MayamaTakeshi/sip-lab) to write functional tests.

Here we have a Dockerfile that permits to build a docker image with opensips, node.js (used to run functional tests) and sngrep2 (used to follow SIP message flows)

## Pre-requisites

Please, follow [learning-freeswitch](https://github.com/MayamaTakeshi/learning-freeswitch) first as it will give you a solid understanding of how to write functional tests.

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

The 'opensips-cli' window runs the tool that permits to talk to opensips and send commands to it. Documentation: https://www.opensips.org/Documentation/Interface-CoreMI-3-6

The 'mariadb' window has mysql client connected to mariadb server (database 'opensips').

Obs: sngrep2 is a fork of [sngrep](https://github.com/irontec/sngrep) with support for RFC2833 DTMF and MRCP support.

## Opensips SIP registrar/proxy server

Opensips is a SIP registrar and proxy server.

A SIP registrar is an entity that maintains records of locations where SIP entities like SIP terminal/softphones can be found.

This is necessary for SIP terminals/softphones because their IP:Port can change due the changes in network, roaming etc.

So they don't have a fixed IP:Port and this information must be informed to a central/known location (the SIP registrar) and kept updated periodically.

Then Opensips is also a proxy as it accepts SIP requests, resolves the destination SIP entity and proxies the request to it.

The opensips documentation can be found here: https://www.opensips.org/Documentation/Manual-3-6

The documentation is large but basically, you must understand that opensips.cfg defines how a SIP message should be handled by opensips.

This means to decide what to do with the message, like refuse it, process it locally or proxy it to some SIP entity.

This is done by routes, so you can start by reading about them here: https://www.opensips.org/Documentation/Script-Routes-3-6

## Configuring opensips

The configuration of opensips is done by a single file at /usr/local/etc/opensips/opensips.cfg

You can load modules to handle different needs like use of database backend, http requests and programming languages like perl, python and lua to resolve how to handle incoming calls. Documentation: https://www.opensips.org/Documentation/Modules-3-6

For our training purposes, we will have exercises to be completed and each exercise will have its own subfolder like this:
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

The script run_test.sh will check if the exercise opensips.cfg is syntactically valid, copy it to /usr/local/etc/opensips/opensips.cfg and will force opensips to restart to get the new configuration.

Then run_test.sh will execute test.js.

## Running a sample test script

Inside the container, in the tmux session, switch to the 'exercises' window and do:

```
./run_test.sh register
```

This test will make a REGISTER request to opensips and wait for a reply.

For this, the test sends the request with header 'Expires: 60' which means we want the registrar server (opensips) to keep the registration valid for 60 seconds. So if we don't re-register again after 60 seconds, the registration
should be discarded (to avoid stale registrations. So we must keep re-registering periodically).

After the above is successful, the test will un-REGISTER (header 'Expires: 0', meaning the registrar server should delete the registration) and expect the reply for it.

Switch to the 'sngrep2' window to inspect the SIP messages exchanged by the test script and opensips.

You can also switch to the 'opensips' window to check its logs. This will not make much sense right now but it will be important when debugging.


## Exercises

For each exercise, create a new subfolder inside folder exercises and copy register/opensips.cfg and register/test.js to the new subfolder.

Then adjust the new files to make then work as expected by the exercise (you can use AI to help you).

To test the exercise do:
```
./run_test.sh EXERCISE_NAME
```

Obs: the register/opensips.cfg listen to port 5060 (public, used for SIP terminals) and port 5080 (private, used by SIP gateways).

  1. register: just register and unregister procedure (sample)

  2. user2user: register sip terminals (users) and make a call from one user to another (via port 5060). In the INVITE from the user1, include a header 'X-Test: ABC' and make opensips suppress this header when relaying this INVITE to user2. When the call arrives at user2, confirm the header 'X-Test' is absent, answer it and end the call from any of the sides. To finish the test, unregister the terminals.

  3. register_with_auth: the base opensips.cfg accepts REGISTER requests from any SIP entity. Add support for authentication for requests arriving at port 5060 (need to add a record into table subscriber with authentication details). After registration success, do the unregistration.

  4. gw2user: register the user (via port 5060) and make a call to 05011112222 via port 5080 to simulate a gateway calling that user. In opensis.cfg route, there should be a condition checking if the RURI username is '0501111222'. If yes, then relay the INVITE to the user. Make opensips to add a header 'X-Test: DEF' to the original INVITE. Answer the call, terminate it and unregister.

  5. aliasdb_user_resolution: add this module to opensips.cfg: https://opensips.org/docs/modules/3.6.x/alias_db.html. The test should be the same as gw2user but instead of resolving 05011112222 by a condition in opensips.cfg, adjust opensips.cfg to resolve the 05011112222 by a record in table dbaliases (an 'alias' is an extra name a user can be identified by. So we say, '05011112222' is an alias for 'user1' for example. This is how a number dialed at the PSTN is resolved to a subscriber in the SIP system).

  6. rest_client_user_resolution: add this module to opensips.cfg: https://opensips.org/docs/modules/3.6.x/rest_client.html and change the code to handle INVITE and make a POST request sending the R-URI username (R-URI is the username in the URI in the first line of the SIP request), to resolve the user to be called. In test.js, start an http server to handle requests, register a user and then make a call via 5080 to 05011112222, When the POST request arrives, reply saying the user should be the destination of the INVITE.

Obs: 
  - there is no need to send/receive DTMF as opensips is a SIP only server and doesn't handle media/RTP.
  - add a node.js mysql module to permit for the test.js scripts to clear and add records to mariadb 'opensips' database tables.

Once all exercises are complete you can run all of them by doing:
```
./run_tests.sh
```
