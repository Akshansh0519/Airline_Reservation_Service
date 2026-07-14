const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    PORT: process.env.PORT || 4000,
    FLIGHT_SERVICE_PATH: (process.env.FLIGHT_SERVICE_PATH || 'https://skyelite-flights-service.onrender.com').replace(/\/$/, ''),
    RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost',
    RABBITMQ_QUEUE_NAME: process.env.RABBITMQ_QUEUE_NAME || 'Notification-Queue'
}
