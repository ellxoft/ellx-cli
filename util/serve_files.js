const path = require('path');
const fs = require('fs').promises;

const serve = root => async (req, res) => {
  const filePath = path.join(root, req.path);
  console.log(req.method + ' ' + filePath);

  if (req.method !== 'GET' || !filePath.startsWith(root)) {
    return res.error('Unauthorized', 401);
  }

  // TODO: cache everything and invalidate in fs watch

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const items = await fs.readdir(filePath, { withFileTypes: true });

      res.json(items
        .filter(item => !item.name.startsWith('.') && (item.isDirectory() || item.isFile()))
        .map(item => ({
          name: item.name,
          type: item.isFile() ? 'file' : 'dir'
        })));
    }
    else {
      res.end("Send file here");
    }
  }
  catch (e) {
    res.error(e.code, 404);
  }
}

module.exports = serve;
