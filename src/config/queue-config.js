const amqplib = require('amqplib');
const ServerConfig = require('./server-config');

let channel;
let connection;

async function connectToRabbitMQ(){
    try{
        if (channel && connection) return channel;
        connection = await amqplib.connect(ServerConfig.RABBITMQ_URL);
        
        connection.on('error', (err) => {
            console.error('RabbitMQ connection error:', err.message);
            channel = null;
            connection = null;
        });
        connection.on('close', () => {
            console.warn('RabbitMQ connection closed by broker.');
            channel = null;
            connection = null;
        });

        channel = await connection.createChannel();
        channel.on('error', (err) => {
            console.error('RabbitMQ channel error:', err.message);
            channel = null;
        });
        channel.on('close', () => {
            console.warn('RabbitMQ channel closed.');
            channel = null;
        });

        await channel.assertQueue(ServerConfig.RABBITMQ_QUEUE_NAME, { durable: true });
        console.log(`Connected to RabbitMQ [Queue: ${ServerConfig.RABBITMQ_QUEUE_NAME}]`);
        return channel;
    }
    catch(error){
        console.error('Error occurred while connecting to RabbitMQ:', error.message);
        channel = null;
        connection = null;
        throw error;
    }
}

async function sendMessageToQueue(message){
    try{
        if (!channel) {
            console.log('RabbitMQ channel inactive. Reconnecting before dispatch...');
            await connectToRabbitMQ();
        }
        const sent = await channel.sendToQueue(
            ServerConfig.RABBITMQ_QUEUE_NAME,
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );
        console.log(`Message successfully sent to RabbitMQ queue [${ServerConfig.RABBITMQ_QUEUE_NAME}]:`, message.recepientEmail);
        return sent;
    }catch(error){
        console.error('Error sending to RabbitMQ, retrying connection once:', error.message);
        try {
            channel = null;
            connection = null;
            await connectToRabbitMQ();
            const retried = await channel.sendToQueue(
                ServerConfig.RABBITMQ_QUEUE_NAME,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );
            console.log(`Message recovered and dispatched to RabbitMQ queue [${ServerConfig.RABBITMQ_QUEUE_NAME}]`);
            return retried;
        } catch (retryErr) {
            console.error('Fatal RabbitMQ dispatch error:', retryErr.message);
            throw retryErr;
        }
    }
}

module.exports = {
    connectToRabbitMQ,
    sendMessageToQueue
};
