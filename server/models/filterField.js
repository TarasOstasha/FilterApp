'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FilterField extends Model {

    static associate(models) {
      FilterField.belongsToMany(models.Product, {
        through: 'product_filters',
        foreignKey: {
          name: 'filter_field_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  FilterField.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      field_name: {
        type: DataTypes.STRING(255), 
        allowNull: false,
      },
      field_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      allowed_values: {
        type: DataTypes.TEXT, 
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, 
      },
    },
    {
      sequelize,
      modelName: 'FilterField',
      timestamps: false,
      underscored: true   
    }
  );

  return FilterField;
};
