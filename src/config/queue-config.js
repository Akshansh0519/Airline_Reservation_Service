const amqplib = require('amqplib');
const ServerConfig = require('./server-config');

let channel;
async function connectToRabbitMQ(){
    try{
        const connection = await amqplib.connect(ServerConfig.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(ServerConfig.RABBITMQ_QUEUE_NAME);
        console.log('Connected to RabbitMQ');
        return channel;
    }
    catch(error){
        console.error('Error occurred while connecting to RabbitMQ:', error);
        throw error;
    }
}

async function sendMessageToQueue(message){
    try{
        await channel.sendToQueue(ServerConfig.RABBITMQ_QUEUE_NAME, Buffer.from(JSON.stringify(message)));
    }catch(error){
        console.error('Error occurred while sending message to RabbitMQ:', error);
        throw error;
    }
}

module.exports = {
    connectToRabbitMQ,
    sendMessageToQueue
};
