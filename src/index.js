const express = require('express');
const { ServerConfig, Logger } = require('./config');
const apiRoutes = require('./routes');
const db = require('./models');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

app.listen(ServerConfig.PORT, () => {
    console.log(`Booking Service is running on port ${ServerConfig.PORT}`);
    Logger.info(`Booking Service is running on port ${ServerConfig.PORT}`, {});
});
