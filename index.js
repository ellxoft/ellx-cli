#!/usr/bin/env node

const commandLineArgs = require('command-line-args');
const cors = require("cors");
const polka = require("polka");
const fetch = require("node-fetch");
const ec = require('./util/ec');

const optionDefinitions = [
  { name: 'user', alias: 'u', type: String, defaultOption: true },
  { name: 'port', alias: 'p', type: Number },
  { name: 'cert', alias: 'c', type: String },
];

const config = commandLineArgs(optionDefinitions);

config.port = config.port || 3002;
config.cert = config.cert || 'http://localhost:8080/certificate';

if (!config.user) {
  console.log('Please provide your user name using -u <username> option');
  process.exit();
}

fetch(config.cert).then(r => r.text()).then(cert => {
  console.log("Successfully fetched authorization server's certificate: " + cert);
  const publicKey = ec.keyFromPublic(cert);

  function checkUser(req, res, next) {
    let auth = { login: req.query.login };
    if (auth.login !== config.user || !publicKey.verify(auth, req.query.signature)) {
      res.status = 401;
      res.end('Unauthorized');
    }
    next();
  }

  polka()
    .use(cors(), checkUser)
    .get('/', (req, res) => res.end('Hooray!'))
    .listen(config.port, err => {
      if (err) throw err;
      console.log(`> Running on localhost:${config.port}`);
    });
});
