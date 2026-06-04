'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Product extends Model {
    static associate(models) {
      // Many-to-many with Category
      Product.belongsToMany(models.Category, {
        through: 'product_categories',
        foreignKey: 'product_id',
        otherKey: 'category_id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      // Many-to-many with FilterField
      Product.belongsToMany(models.FilterField, {
        through: 'product_filters',
        foreignKey: 'product_id',
        otherKey: 'filter_field_id',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
      
      Product.hasMany(models.ProductFilter, { foreignKey: 'product_id' });
    }
  }

  Product.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_code: {
        type: DataTypes.STRING,
      },
      product_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      product_link: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      product_img_link: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      product_price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      most_popular: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      hide_product: {
        type: DataTypes.STRING(1),
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'Product',
      timestamps: false,   
      underscored: true   
    }
  );

  return Product;
};
