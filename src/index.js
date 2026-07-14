const express = require('express');
const { ServerConfig, Logger , Queue} = require('./config');
 
const apiRoutes = require('./routes');
const db = require('./models');

const app = express();
const cors = require('cors');
app.use(cors({ origin: true, credentials: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token, x-idempotency-key');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
app.get('/ping-cors', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ status: 'ACTIVE', service: 'Booking', time: new Date().toISOString() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/bookingService/api', apiRoutes);

app.listen(ServerConfig.PORT, async() => {
    console.log(`Booking Service is running on port ${ServerConfig.PORT}`);
    //Logger.info(`Booking Service is running on port ${ServerConfig.PORT}`, {});
    await Queue.connectToRabbitMQ();

});
