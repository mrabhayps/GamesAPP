'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsHomeCardItems = sequelize.define('gmsHomeCardItems', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    cardId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'cardId'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'title'
    },
    subTitle: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'subTitle'
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'image'
    },
    video: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'video'
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'displayOrder'
    },
    status: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      field: 'status',
      defaultValue: 0
    },
    jsonRequest: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'jsonRequest'
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'width'
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'height'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt',
      defaultValue: 'CURRENT_TIMESTAMP(6)'
    },
  }, {});
  gmsHomeCardItems.associate = function(models) {
    // associations can be defined here
  };
  return gmsHomeCardItems;
};