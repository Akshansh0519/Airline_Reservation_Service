const express = require('express');
const router = express.Router();
const { BookingController } = require('../../controllers');
const { BookingMiddleware } = require('../../middlewares');

// POST /api/v1/bookings
router.post('/', BookingMiddleware.validateBooking, BookingController.createBooking);

// GET /api/v1/bookings/:id
router.get('/:id', BookingController.getBooking);

module.exports = router;
