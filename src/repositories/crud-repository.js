const { Logger } = require("../config");

class CrudRepository {
    constructor(model) {
        this.model = model;
    }

    async create(data) {
        try {
            const response = await this.model.create(data);
            return response;
        }
        catch (error) {
            Logger.error('Error in Crud Repository create method', { error });
            throw error;
        }
    }

    async destroy(data) {
        try {
            const response = await this.model.destroy({
                where: {
                    id: data.id
                }
            });
            return response;
        }
        catch (error) {
            Logger.error('Error in Crud Repository destroy method', { error });
            throw error;
        }
    }

    async get(data, transaction) {
        try {
            const options = {};
            if (transaction) options.transaction = transaction;
            const response = await this.model.findByPk(data.id, options);
            return response;
        }
        catch (error) {
            Logger.error('Error in Crud Repository get method', { error });
            throw error;
        }
    }

    async getAll() {
        try {
            const response = await this.model.findAll();
            return response;
        }
        catch (error) {
            Logger.error('Error in Crud Repository getAll method', { error });
            throw error;
        }
    }

    async update(id, data) {
        try {
            const response = await this.model.update(data, {
                where: {
                    id: id
                }
            });
            return response;
        }
        catch (error) {
            Logger.error('Error in Crud Repository update method', { error });
            throw error;
        }
    }
}

module.exports = CrudRepository;
