#!/usr/bin/env node

const commandLineArgs = require('command-line-args');
const path = require('path');
const cors = require('cors');
const polka = require('polka');
const fetch = require('node-fetch');
const { json } = require('body-parser');
const initWorkflow = require('./util/workflow');
const ec = require('./util/ec');

const serveFiles = require('./util/serve_files');

const optionDefinitions = [
  { name: 'user', alias: 'u', type: String, defaultOption: true },
  { name: 'trust', alias: 't', type: String },
  { name: 'identity', type: String },
  { name: 'port', alias: 'p', type: Number },
  { name: 'root', alias: 'r', type: String },
  { name: 'force', alias: 'f', type: Boolean }
];

const config = commandLineArgs(optionDefinitions);

config.port = config.port || 3002;
config.trust = config.trust || 'http://localhost:8080/certificate';
config.identity = config.identity || 'localhost~' + config.port;
config.force = config.force || false;
config.root = path.resolve(process.cwd(), config.root || '.');

// TODO: RegEx check and warn for user and identity

if (!config.user) {
  console.log('Please provide your user name using -u <username> option');
  process.exit();
}

const helpers = (req, res, next) => {
  res.json = resp => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(resp));
  }
  res.error = (error, status = 500) => {
    res.statusCode = status;
    res.json({
      error
      // TODO: context
    });
  };
  next();
}

fetch(config.trust).then(r => {
  if (r.ok) return r.text();

  throw new Error(`${r.status} ${r.statusText}`);
}).then(cert => {
  console.log('Successfully fetched authorization server\'s certificate: ' + cert);
  const publicKey = ec.keyFromPublic(cert);

  const auth = handler => (req, res) => {
    if (!req.headers.authorization) {
      return res.error('No authorization header', 403);
    }

    const [user, fp, signature] = req.headers.authorization.split(',');
    if (user !== config.user || fp !== config.identity || !publicKey.verify({ user, fp }, signature)) {
      res.error('Unauthorized', 401);
    }
    else return handler(req, res);
  }

  initWorkflow(config.force);

  polka()
    .use(json(), helpers, cors())
    .use('/resource', auth(serveFiles(config.root)))
    .get('/identity', (_, res) => res.end(config.identity))
    .listen(config.port, err => {
      if (err) throw err;
      console.log(`> Running on localhost:${config.port}`);
      console.log('Serving ' + config.root);
    });
});
