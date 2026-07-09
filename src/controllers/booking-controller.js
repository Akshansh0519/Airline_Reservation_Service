const { BookingService } = require('../services');
const { StatusCodes, AppError } = require('../utils');

async function createBooking(req, res) {
    try {
        const response = await BookingService.createBooking({
            flightId: req.body.flightId,
            userId: req.body.userId,
            noOfSeats: req.body.noOfSeats || 1,
            idempotencyKey: req.headers['x-idempotency-key']
        });
        return res.status(StatusCodes.CREATED).json({
            success: true,
            data: response,
            message: 'Successfully completed the booking',
            error: {}
        });
    } catch (error) {
        let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
        if (error instanceof AppError) {
            statusCode = error.statusCode;
        }
        return res.status(statusCode).json({
            success: false,
            data: {},
            message: error.message || 'Something went wrong while creating booking',
            error: error
        });
    }
}

async function getBooking(req, res) {
    try {
        const response = await BookingService.getBooking(req.params.id);
        return res.status(StatusCodes.OK).json({
            success: true,
            data: response,
            message: 'Successfully fetched booking details',
            error: {}
        });
    } catch (error) {
        let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
        if (error instanceof AppError) {
            statusCode = error.statusCode;
        }
        return res.status(statusCode).json({
            success: false,
            data: {},
            message: error.message || 'Something went wrong while fetching booking details',
            error: error
        });
    }
}

async function makePayment(req, res) {
    try {
        const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey;
        if (!idempotencyKey) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "idempotency key missing"
            });
        }
        if (!req.body.bookingId || !req.body.userId || !req.body.totalCost) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                data: {},
                message: 'Something went wrong while processing payment',
                error: { explanation: 'bookingId, userId and totalCost are required' }
            });
        }
        const response = await BookingService.makePayment({
            bookingId: req.body.bookingId,
            userId: req.body.userId,
            totalCost: req.body.totalCost,
            idempotencyKey: idempotencyKey,
            recepientEmail: req.body.recepientEmail || req.body.recipientEmail
        });
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully completed the request',
            data: response,
            error: {}
        });
    } catch (error) {
        let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
        if (error instanceof AppError) {
            statusCode = error.statusCode;
        }
        return res.status(statusCode).json({
            success: false,
            data: {},
            message: error.message || 'Something went wrong while processing payment',
            error: error
        });
    }
}

module.exports = {
    createBooking,
    getBooking,
    makePayment
};
