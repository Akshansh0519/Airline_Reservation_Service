const CrudRepository = require('./crud-repository');
const { IdempotencyKey } = require('../models');

class IdempotencyRepository extends CrudRepository {
    constructor() {
        super(IdempotencyKey);
    }

    async getByKey(key, transaction) {
        return await IdempotencyKey.findOne({
            where: { key },
            transaction
        });
    }

    async createKey(key, transaction) {
        return await IdempotencyKey.create({ key }, { transaction });
    }

    async updateByKey(key, responseData, transaction) {
        return await IdempotencyKey.update(
            { response: JSON.stringify(responseData) },
            { where: { key }, transaction }
        );
    }
}

module.exports = IdempotencyRepository;
