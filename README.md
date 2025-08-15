# learning-opensips

## Overview

This repo provides tools to quickly get up to speed working with opensips using [zeq](https://github.com/MayamaTakeshi/zeq) and [sip-lab](https://github.com/MayamaTakeshi/sip-lab) to write functional tests.

Here we have a Dockerfile that permits to build a docker image with opensips, node.js (used to run functional tests) and sngrep2 (used to follow SIP message flows)

## Building the image:
```
./build_image.sh
```
This will take several minutes to complete. Be patient as we will build opensips from source.

After it completes, we will have opensips 3.6.0 installed with almost all modules except for these ones that require extra libs or are failing to compile:

- db_oracle 
- osp
- cachedb_cassandra
- cachedb_couchbase
- cachedb_dynamodb
- sngtc
- aaa_radius
- aaa_diameter
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
root: ~/

windows:
  - opensips:
    - sudo /usr/sbin/opensips -F
  - opensips-cli:
    - opensips-cli
  - sngrep2:
    - sudo sngrep2 -d any
  - tests:
    - cd ~/src/git/learning-opensips/tests
```

The 'opensips' window will have opensips running and outputting logs (this is not a CLI).

Obs: sngrep2 is a fork of [sngrep](https://github.com/irontec/sngrep) with support for RFC2833 DTMF and MRCP support.

## Test-driven development

When developing solutions, we need to provide test scripts confirming their proper behavior.

So we use node.js [zeq](https://github.com/MayamaTakeshi/zeq) module that permits to write functional tests.

This is a simple library that permits to sequence execution of commands and wait for events triggered by the commands.

Then [sip-lab](https://github.com/MayamaTakeshi/sip-lab) is used to make/receive SIP calls and perform media operations (play/record audio files, detect digits, send receive fax, etc).

So we combine these two libraries to write functional SIP tests.

You can see a generic sample (not involving freeswitch) here: https://github.com/MayamaTakeshi/sip-lab/blob/master/samples/simple.js

## Running a sample test script

Inside the container, in the tmux session, switch to the 'tests' window and do:

```
npm i
```

The above will install node.js modules required by the test script.

Then  you can run the sample script by doing:
```
node register.js
```
This will just make a REGISTER request to opensips and expect for a reply.

Then it will un-REGISTER (Expires: 0) and expects the reply for it.
