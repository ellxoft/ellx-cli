# Ellx-CLI

Ellx CLI enables local development in Ellx. Simply run

```sh
ellx -u *your-ellx-username*
```

to serve current working directory in Ellx. Select "Ellx CLI connect" in the user menu and input server
identity value ("localhost~3002" by default) and that's it!

## Installation

```sh
npm i -g ellx-cli or yarn global add ellx-cli
```

## Options

`--user, -u` _required_ Ellx username.
`--port, -p _(3002)_` Port to serve.
`--identity, -i _(localhost~port)` Local server instance identity (the value you should input in "Ellx CLI connect").
`--root, -r _(cwd)_` Directory to serve.

## Syncing with Github

Please refer to this [section](https://docs.ellx.app/#sync-with-github) of Ellx docs on how to set up Github action to sync
a repository and Ellx project.
