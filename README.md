# ellx resource server API

Path | Parameters | Description
--- | --- | ---
GET `/identity` | <none> | retrieve the identity of the server (default: localhost-port)
GET `/resource/:path` | <none> | retrieve the resource (a file or a folder index)
POST `/resource/:path` | `action (move/copy), destination` | move or copy the resource
DELETE `/resource/:path`| <none> | delete the resource
PUT `/resource/:folderPath`| `files: [[path, contents]]` | create or update multiple files or folders
