const CrudRepository = require('./crud-repository');
const { Booking } = require('../models');
const { AppError, StatusCodes } = require('../utils');

class BookingRepository extends CrudRepository {
    constructor() {
        super(Booking);
    }

    async create(data, transaction) {
        try {
            const response = await Booking.create(data, { transaction: transaction });
            return response;
        }
        catch (error) {
            throw error;
        }
    }

    async update(id, data, transaction) {
        try {
            const response = await Booking.update(data, {
                where: { id },
                transaction: transaction
            });
            return response;
        }
        catch (error) {
            throw error;
        }
    }
}

module.exports = BookingRepository;
