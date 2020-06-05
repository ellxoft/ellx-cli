const { join } = require('path');
const fs = require('fs');
const mime = require('mime/lite');

const { stat, readdir, mkdir, writeFile, rmdir, unlink, rename, copyFile } = fs.promises;

async function sendFile(req, res, file, stats, headers={}) {
  let code=200, opts={};

  if (req.headers.range) {
    code = 206;
    let [x, y] = req.headers.range.replace('bytes=', '').split('-');
    let end = opts.end = parseInt(y, 10) || stats.size - 1;
    let start = opts.start = parseInt(x, 10) || 0;

    if (start >= stats.size || end >= stats.size) {
      res.setHeader('Content-Range', `bytes */${stats.size}`);
      res.statusCode = 416;
      return res.end();
    }

    headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    headers['Content-Length'] = (end - start + 1);
    headers['Accept-Ranges'] = 'bytes';
  }
  else headers['Content-Length'] = stats.size;

  headers['Content-Type'] = mime.getType(file);
  headers['Last-Modified'] = stats.mtime.toUTCString();

  res.writeHead(code, headers);
  fs.createReadStream(file, opts).pipe(res);
}

async function sendDirectory(res, filePath) {
  const items = await readdir(filePath, { withFileTypes: true });

  res.json(items
    .filter(item => !item.name.startsWith('.') && (item.isDirectory() || item.isFile()))
    .map(item => item.name + (item.isDirectory() ? '/' : ''))
  );
}

async function copyDirectory(filePath, newPath) {
  await mkdir(newPath);
  const items = await readdir(filePath, { withFileTypes: true });

  return Promise.all(items
    .map(item => (item.isDirectory() ? copyDirectory : copyFile)(
      join(filePath, item.name),
      join(newPath, item.name)
    )));
}

async function makeOne(filePath, contents, secondTry = false) {
  try {
    // TODO: set proper access rights mode
    if (filePath.endsWith('/')) await mkdir(filePath);
    else await writeFile(filePath, contents, 'utf8');
  }
  catch (e) {
    if (e.code === 'ENOENT') {
      if (secondTry) throw e;

      await makeOne(join(filePath, '../'));
      return makeOne(filePath, contents, true);
    }
    if (e.code !== 'EEXIST') throw e;
  }
}

function makeResources(filePath, files) {
  files = new Map(files
    .filter(Array.isArray)
    .map(([path, contents]) => [join(filePath, decodeURI(path)), contents && String(contents)])
    .filter(([path]) => path.startsWith(filePath))
  );
  return Promise.all([...files].map(pair => makeOne(...pair)));
}

const serve = root => async (req, res) => {
  const filePath = join(root, decodeURI(req.path));

  console.log(req.method + ' ' + filePath);
  if (Object.keys(req.body).length) console.log(req.body);

  if (!filePath.startsWith(root)) {
    return res.error('Unauthorized', 401);
  }

  try {
    const stats = await stat(filePath);

    if (req.method === 'GET') {
      if (stats.isDirectory()) await sendDirectory(res, filePath);
      else if (stats.isFile()) await sendFile(req, res, filePath, stats);
      else return res.error('Unsupported resource type', 400);
    }
    else if (req.method === 'PUT') {
      const { files } = req.body;
      if (!stats.isDirectory()) return res.error(`${filePath} is not a directory`, 400);
      if (!Array.isArray(files)) return res.error('Bad files argument', 400);

      await makeResources(filePath, files);
    }
    else if (req.method === 'DELETE') {
      if (stats.isDirectory()) await rmdir(filePath, { recursive: true });
      else await unlink(filePath);
    }
    else if (req.method === 'POST') {
      const { action, destination } = req.body;

      const newPath = join(root, decodeURI(destination));
      if (!newPath.startsWith(root)) return res.error('Unauthorized', 401);

      if (action === 'move') {
        await rename(filePath, newPath);
      }
      else if (action === 'copy') {
        if (stats.isDirectory()) await copyDirectory(filePath, newPath);
        else await copyFile(filePath, newPath);
      }
      else return res.error('Unrecognized action: ' + action, 400);
    }
    else return res.error('Unsupported method', 400);

    res.end('success');
  }
  catch (e) {
    res.error(e.code, 400);
  }
}

module.exports = serve;
