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
    .map(item => ({
      name: item.name,
      type: item.isFile() ? 'file' : 'dir'
    })));
}

async function copyDirectory(filePath, newPath) {
  await mkdir(newPath);
  const items = await readdir(filePath, { withFileTypes: true });
  await Promise.all(items.map(item => (item.isDirectory() ? copyDirectory : copyFile)(join(filePath, item.name), join(newPath, item.name))));
}

const serve = root => {
  const ensureParentExists = (path) => {
    if (!path.startsWith(root)) throw new Error('Root path does not exist');

    return {
      and: op => op().catch(e => {
        if (e.code === 'ENOENT') {
          const parent = join(path, '..');
          return ensureParentExists(parent).and(() => mkdir(parent).then(op));
        }
        else if (e.code !== 'EEXIST') throw e;
      })
    };
  }

  return async (req, res) => {
  const filePath = join(root, req.path);
  console.log(req.method + ' ' + filePath);
  if (Object.keys(req.body).length) console.log(req.body);

  if (!filePath.startsWith(root)) {
    return res.error('Unauthorized', 401);
  }

  try {
    const stats = await stat(filePath);

    if (req.method === 'GET') {
      // TODO: cache everything and invalidate in fs watch
      if (stats.isDirectory()) return sendDirectory(res, filePath);
      else if (stats.isFile()) return sendFile(req, res, filePath, stats);
      else return res.error('Unsupported resource type', 400);
    }
    else if (req.method === 'PUT') {
      if (!stats.isDirectory()) return res.error('Not a directory', 400);

      const { name, type, contents } = req.body;
      const file = join(filePath, name);

      await ensureParentExists(file).and(async () => {
        // TODO: set proper access rights mode
        if (type === 'directory') await mkdir(file);
        else await writeFile(file, contents);
      });
    }
    else if (req.method === 'DELETE') {
      if (stats.isDirectory()) await rmdir(filePath, { recursive: Boolean(req.body.recursive) });
      else await unlink(filePath);
    }
    else if (req.method === 'POST') {
      const { action, destination, recursive } = req.body;
      if (stats.isDirectory() && !recursive) return res.error('To move/copy a directory you need to set recursive: true', 400);

      const newPath = join(root, destination);
      if (!newPath.startsWith(root)) return res.error('Unauthorized', 401);

      if (action === 'move') await rename(filePath, newPath);
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
}

module.exports = serve;
