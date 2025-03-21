'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ProductFilter extends Model {
    static associate(models) {
      // product_filters belongs to Product
      ProductFilter.belongsTo(models.Product, {
        foreignKey: {
          name: 'product_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      // product_filters belongs to FilterField
      ProductFilter.belongsTo(models.FilterField, {
        foreignKey: {
          name: 'filter_field_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  ProductFilter.init(
    {
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: false,
      },
      filter_field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      filter_value: {
        type: DataTypes.STRING, 
        allowNull: true,       
      },
    },
    {
      sequelize,
      modelName: 'ProductFilter',
      timestamps: false,
      underscored: true   
    }
  );

  return ProductFilter;
};
