const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    PORT: process.env.PORT || 4000,
    FLIGHT_SERVICE_PATH: process.env.FLIGHT_SERVICE_PATH || 'http://localhost:3000',
    RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost'
}
