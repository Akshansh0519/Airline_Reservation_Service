'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class IdempotencyKey extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  IdempotencyKey.init({
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'IdempotencyKey',
  });
  return IdempotencyKey;
};
