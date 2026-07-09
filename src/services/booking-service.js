const axios = require('axios');
const db = require('../models');
const { StatusCodes } = require('http-status-codes');
const { BookingRepository, IdempotencyRepository } = require('../repositories');
const { ServerConfig , Queue } = require('../config');
const { AppError, ENUMS } = require('../utils');
const { BOOKED, CANCELLED } = ENUMS.BOOKING_STATUS;

const bookingRepository = new BookingRepository();
const idempotencyRepository = new IdempotencyRepository();

async function createBooking(data) {
    const idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
        const existingKey = await idempotencyRepository.getByKey(idempotencyKey);
        if (existingKey) {
            if (existingKey.response) {
                return JSON.parse(existingKey.response);
            }
            throw new AppError('Cannot process request: A booking with this idempotency key is currently in progress', StatusCodes.CONFLICT);
        } 
    }

    const transaction = await db.sequelize.transaction();
    try {
        if (idempotencyKey) {
            await idempotencyRepository.createKey(idempotencyKey, transaction);
        }

        const flightResponse = await axios.get(`${ServerConfig.FLIGHT_SERVICE_PATH}/api/v1/flights/${data.flightId}`);
        const flightData = flightResponse.data.data;

        if (data.noOfSeats > flightData.totalSeats) {
            throw new AppError('Not enough seats available on the flight', StatusCodes.BAD_REQUEST);
        }

        const totalCost = flightData.price * data.noOfSeats;
        const bookingPayload = {
            flightId: data.flightId,
            userId: data.userId,
            noOfSeats: data.noOfSeats,
            totalCost
        };
        const booking = await bookingRepository.create(bookingPayload, transaction);

        await axios.patch(`${ServerConfig.FLIGHT_SERVICE_PATH}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noOfSeats,
            dec: true
        });

        await bookingRepository.update(booking.id, { status: BOOKED }, transaction);

        // Fetch updated booking WITHIN the transaction so we always get the committed data
        const bookingDetails = await bookingRepository.get({ id: booking.id }, transaction);
        if (idempotencyKey) {
            await idempotencyRepository.updateByKey(idempotencyKey, bookingDetails, transaction);
        }

        await transaction.commit();
        Queue.sendMessageToQueue({ 
            recepientEmail: 'akshanshranjan007#=@gmail.com',// Replace with actual email
            subject: 'Booking Confirmation',
            text: `Booking created successfully for user ${data.userId} on flight ${data.flightId} with booking ID ${booking.id}`, 
            status: BOOKED 
        });
        // Return a plain object in case the instance becomes stale after commit
        return bookingDetails ? bookingDetails.toJSON() : { id: booking.id, flightId: data.flightId, userId: data.userId, noOfSeats: data.noOfSeats, totalCost, status: BOOKED };
    } catch (error) {
        await transaction.rollback();
        if (error.response && error.response.data) {
            throw new AppError(
                error.response.data.message || 'Error from Flights Service',
                error.response.status || StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Something went wrong during the booking process: ' + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function getBooking(id) {
    try {
        const response = await bookingRepository.get({ id });
        if (!response) {
            throw new AppError('Booking not found', StatusCodes.NOT_FOUND);
        }
        return response;
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot fetch booking details: ' + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

module.exports = {
    createBooking,
    getBooking
};
