const { StatusCodes } = require('http-status-codes');

function validateBooking(req, res, next) {
    if (!req.headers['x-idempotency-key']) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            data: {},
            message: 'Something went wrong while creating a booking',
            error: { explanation: 'x-idempotency-key header is required' }
        });
    }
    if (!req.body.flightId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            data: {},
            message: 'Something went wrong while creating a booking',
            error: { explanation: 'flightId is required in the request body' }
        });
    }
    if (!req.body.userId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            data: {},
            message: 'Something went wrong while creating a booking',
            error: { explanation: 'userId is required in the request body' }
        });
    }
    if (req.body.noOfSeats && (isNaN(req.body.noOfSeats) || Number(req.body.noOfSeats) <= 0)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            data: {},
            message: 'Something went wrong while creating a booking',
            error: { explanation: 'noOfSeats must be a positive integer' }
        });
    }
    next();
}

module.exports = {
    validateBooking
};
