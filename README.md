
# Node Watchdog

## Description

<div>
    This watchdog is a TypeScript watchdog for servers, which allows you to watch for services through systemctl / service commands.
    <br>Then, it formats and sends the data to the main server, which will treat them and send them to the client.
</div>

### Build With

[![Node.js][node.js]][nodejs-url]
[![TypeScript][ts]][ts-url]
[![NPM][npm]][npm-url]
<br>[![Prisma][prisma]][prisma-url]
[![SocketIO][socketio]][socketio-url]

## License

[![MIT License][license-shield]](LICENSE)

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Program structure](#structure)
4. [Contributing](#contributing)
5. [License](#license)

<br><a name="installation"></a>
## 1. Installation

Use the version control [git](https://git-scm.com/downloads) to clone the project.

```bash
git clone https://github.com/brandy223/nodeWatchdog.git
```

<br><a name="usage"></a>
## 2. Usage

Before trying to run, it is necessary to install the dependencies of the project.
<br>To do this, use the NodeJS Package manager [npm](https://www.npmjs.com/get-npm) and run into the project folder:

```bash
# To install the dependencies
npm install
```

Here is the list of the main dependencies of the project:
- [Socket.io](https://www.npmjs.com/package/socket.io)
- [Prisma](https://www.prisma.io/)
- [Node-Cache](https://www.npmjs.com/package/node-cache)
- [Ping](https://www.npmjs.com/package/ping)
- [Nodemailer](https://www.npmjs.com/package/nodemailer)
- [Axios](https://www.npmjs.com/package/axios)

Then, to run the project, use the following commands:

```bash
# To run
npm run dev

# To build
npm run build

# And start the build project
npm run start
```

If you want to run it with pm2 (process manager), you can use the following commands:

```bash
# To run
pm2 npx nodemon # exec npm run dev
```

But, for the watchdog to really work, you need to configure it. You can go to the 
[configuration documentation](docs/config.md) to do so.

<br><a name="structure"></a>
## 3. Program structure

~~Will come soon~~

<br><a name="contributing"></a>
## 4. Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

<br><a name="license"></a>
## 5. License

Distributed under the MIT License. See LICENSE for more information.

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[license-shield]: https://img.shields.io/github/license/Ileriayo/markdown-badges?style=for-the-badge

[socketio]: https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101
[socketio-url]: https://socket.io/
[prisma]: https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white
[prisma-url]: https://www.prisma.io/
[express]: https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB
[express-url]: https://expressjs.com/fr/
[ts]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[ts-url]: https://www.typescriptlang.org/
[node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white
[node.js_small]: https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white
[nodejs-url]: https://nodejs.org/
[npm]: https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white
[npm_small]: https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white
[npm-url]: https://www.npmjs.com/