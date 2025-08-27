'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AdminUser extends Model {

  }

  AdminUser.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true, // matches the UNIQUE constraint in your DB
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'AdminUser',  
      timestamps: false,    
      underscored: true         
    }
  );

  return AdminUser;
};
