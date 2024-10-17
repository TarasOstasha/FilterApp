const http = require('node:http');
const app = require('./app');
const chalk = require('chalk');

const PORT = process.env.PORT ?? 5000;


const httpServer = http.createServer(app);

httpServer.listen(PORT, () =>
  console.log(chalk.blue(`Server is listening http://localhost:${PORT}`))
);