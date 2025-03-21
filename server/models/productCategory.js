
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ProductCategory extends Model {
    static associate(models) {
      // product_categories belongs to Product
      ProductCategory.belongsTo(models.Product, {
        foreignKey: {
          name: 'product_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      // product_categories belongs to Category
      ProductCategory.belongsTo(models.Category, {
        foreignKey: {
          name: 'category_id',
          allowNull: false,
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  ProductCategory.init(
    {
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      // Add any other columns if they exist in your table.
      // For example, if you have an "id" column, define it here as well.
    },
    {
      sequelize,
      modelName: 'ProductCategory',
      timestamps: false,
      underscored: true  
    }
  );

  return ProductCategory;
};
