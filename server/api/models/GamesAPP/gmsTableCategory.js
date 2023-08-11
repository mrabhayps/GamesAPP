'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableCategory = sequelize.define('gmsTableCategory', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    tableCategory: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'tableCategory'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      // defaultValue: 'CURRENT_TIMESTAMP(6)',
      field: 'updatedAt'
    }
  }, {
    tableName: 'gmsTableCategory'
  });
  gmsTableCategory.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableCategory;
};