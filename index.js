#!/usr/bin/env node

const commandLineArgs = require('command-line-args');
const cors = require("cors");
const polka = require("polka");
const fetch = require("node-fetch");
const ec = require('./util/ec');

const serveFiles = require('./util/serve_files');

const optionDefinitions = [
  { name: 'user', alias: 'u', type: String, defaultOption: true },
  { name: 'trust', alias: 't', type: String },
  { name: 'identity', type: String },
  { name: 'port', alias: 'p', type: Number },
  { name: 'root', alias: 'r', type: String }
];

const config = commandLineArgs(optionDefinitions);

config.port = config.port || 3002;
config.trust = config.trust || 'http://localhost:8080/certificate';
config.identity = config.identity || 'localhost:' + config.port;
config.root = config.root || process.cwd();

if (!config.user) {
  console.log('Please provide your user name using -u <username> option');
  process.exit();
}

const helpers = (req, res, next) => {
  res.json = resp => res.end(JSON.stringify(resp));
  res.error = (error, status = 500) => {
    res.status = status;
    res.json({
      error
      // TODO: context
    });
  };
  next();
}

fetch(config.trust).then(r => r.text()).then(cert => {
  console.log("Successfully fetched authorization server's certificate: " + cert);
  const publicKey = ec.keyFromPublic(cert);

  const auth = handler => (req, res) => {
    const { user, fp } = req.query;
    if (user !== config.user || fp !== config.identity || !publicKey.verify({ user, fp }, req.headers.signature)) {
      res.error('Unauthorized', 401);
    }
    else return handler(req, res);
  }

  polka()
    .use(helpers, cors())
    .use('/resource', auth(serveFiles(config.root)))
    .get('/identity', (_, res) => res.end(config.identity))
    .listen(config.port, err => {
      if (err) throw err;
      console.log(`> Running on localhost:${config.port}`);
    });
});
