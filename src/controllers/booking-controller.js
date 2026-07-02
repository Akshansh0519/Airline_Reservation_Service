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

module.exports = {
    createBooking,
    getBooking
};
