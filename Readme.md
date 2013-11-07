# connect-sdb

  SimpleDB session store for Connect

## Installation

connect-sdb supports only connect `>= 1.0.3`.

via npm:

    $ npm install connect-sdb

## Options

  - `db` SDB object (optional if keyid & secret are passed)
  - `domain_name` SimpleDB's domain name used to store sessions (optional, default: `sessions`) .
                This domain should be created before hand (this module doesn't create it).
  - `keyid` AWS Key (optional if db is passed)
  - `secret` AWS Secret (optional if db is passed)
  - `cleanup_interval` This module removes expired sessions from the domain every cleanup_interval milliseconds.
                (optional, default: 60000)
  - `stringify` If true, connect-sdb will serialize sessions using `JSON.stringify` before
                setting them, and deserialize them with `JSON.parse` when getting them.
                (optional, default: true). This is useful if you want to keep everything in one attribute.


## Example

With express:

    var express = require('express');
    var SdbStore = require('connect-sdb')(express);

    app.use(express.session({
        secret: settings.cookie_secret,
        store: new SdbStore({
          aws_key: settings.aws_key,
          aws_secret: settings.aws_secret
        })
      }));

With connect:

    var connect = require('connect');
    var SdbStore = require('connect-sdb')(connect);

## Removing expired sessions

  connect-sdb only removes the expired session if a user reconnects 
  with an expired session. This only works if maxAge = null. 

  In other cases (maxAge != null), expired sessions will be removed every cleanup_interval milliseconds.


## Tests

The test is in the test folder and runs a server on port 13000.

## License 

(The MIT License)

Copyright (c) 2011 Farid Fadaie &lt;farid.fadaie@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
