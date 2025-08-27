'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Product extends Model {
    static associate(models) {
      // Many-to-many with Category
      Product.belongsToMany(models.Category, {
        through: 'product_categories',
        foreignKey: {
          name: 'product_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      // Many-to-many with FilterField
      // Product.belongsToMany(models.ProductFilter, {
      //   foreignKey: {
      //     name: 'product_id',
      //     allowNull: false,
      //   },
      //   onUpdate: 'CASCADE',
      //   onDelete: 'CASCADE'
      // });

      Product.belongsToMany(models.FilterField, {
        through: 'product_filters',           
        foreignKey: {
          name: 'product_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
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
