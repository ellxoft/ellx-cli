const path = require('path');
const fs = require('fs');
const mime = require('mime/lite');

const { stat, readdir } = fs.promises;

function send(req, res, file, stats, headers={}) {
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

const serve = root => async (req, res) => {
  const filePath = path.join(root, req.path);
  console.log(req.method + ' ' + filePath);

  if (req.method !== 'GET' || !filePath.startsWith(root)) {
    return res.error('Unauthorized', 401);
  }

  // TODO: cache everything and invalidate in fs watch

  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      const items = await readdir(filePath, { withFileTypes: true });

      res.json(items
        .filter(item => !item.name.startsWith('.') && (item.isDirectory() || item.isFile()))
        .map(item => ({
          name: item.name,
          type: item.isFile() ? 'file' : 'dir'
        })));
    }
    else {
      send(req, res, filePath, stats);
    }
  }
  catch (e) {
    res.error(e.code, 404);
  }
}

module.exports = serve;
