const fs = require("fs");
const process = require("process");

const walk = function(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
      file = dir + '/' + file;
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
          results = results.concat(walk(file));
      } else {
          results.push(file);
      }
  });
  return results;
};

const contents = new Map();

const serverPath = p => '/' + p.slice(2);

function hashAndCache(p) {
  const content = fs.readFileSync(p, 'UTF-8');

  contents.set(serverPath(p), content);

  return require("md5")(content);
}

function getContentType(id) {
  if (/\.(js|ellx)$/.test(id)) {
    return 'text/javascript';
  }
  if (/\.(md)$/.test(id)) {
    return 'text/plain';
  }
  return 'text/plain';
}

// TODO: replace owner/project with auth key
async function sync(owner = 'matyunya', project = 'one-project', server = 'http://localhost:8080')  {
  const fetch = require("node-fetch");

  const files = walk('.')
    .filter(name => !name.startsWith('./.git'))
    .map(path => ({
      path: serverPath(path),
      hash: hashAndCache(path),
    }));

  const res = await fetch(
    server + `/resource/${owner}/${project}/write/`,
    {
      method: 'POST',
      body: JSON.stringify({ files }),
      // TODO: auth header from env
      // for now need to copy valid token from client
      headers: {
        Cookie: 'token=1198f4660f72997d97ca5fffa00f0b557092670b1fdfe4e884653d50861acffbfa4399f3caa1fd866b6b8940d4ead2574bb957a43fb196a57b29a2073b22917e',
        'Content-Type': 'application/json',
      },
    }
  );

  const urls = await res.json();

  const up = await Promise.all(
    urls.map(
      async ({ path, url }) => fetch(url, {
        method: 'PUT',
        body: contents.get(path),
        headers: {
          'Content-Type': getContentType(path),
        },
      })
    )
  );

  if (up.ok) {
    console.log(
      'Synced following files successfully:\n',
      urls.map(({ path }) => path.slice(1)).join('\n')
    );
    process.exit(0);
  } else {
    console.log(
      'Error uploading files',
      await res.json()
    );
    process.exit(1);
  }
}

try {
  sync();
} catch (e) {
  console.error('Unexpected error', e);

  process.exit(1);
}
