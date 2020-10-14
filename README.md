# Ellx CLI

Ellx CLI enables local development in Ellx. Simply run

```sh
ellx -u your-ellx-username
```

to serve current working directory in Ellx. Select "Ellx CLI connect" in the [Ellx](https://ellx.io) user menu and input server
identity value ("localhost~3002" by default) and that's it!

## Installation

```sh
npm i -g @ellx/cli or yarn global add @ellx/cli
```

## Options

Option, alias | Default | Description
--- | --- | ---
`--user, -u`  | _required_ | Ellx username
`--port, -p ` | `3002` | Serve on this port
`--identity, -i` | `localhost~port` | Local server instance identity (the value you should input in "Ellx CLI connect")
`--root, -r ` | `cwd` | Directory to serve

## Syncing with Github

Please refer to [this section](https://docs.ellx.app/#sync-with-github) of Ellx docs on how to set up Github action to sync
a repository and an Ellx project.

## Server REST API

Path | Parameters | Description
--- | --- | ---
`GET /identity` | <none> | retrieve the identity of the server (default: localhost-port)
`GET /resource/:path` | <none> | retrieve the resource (a file or a folder index)
`POST /resource/:path` | `action (move/copy), destination` | move or copy the resource
`DELETE /resource/:path`| <none> | delete the resource
`PUT /resource/:folderPath`| `files: [[path, contents]]` | create or update multiple files or folders
