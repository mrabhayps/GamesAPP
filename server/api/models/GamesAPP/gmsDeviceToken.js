'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsDeviceToken = sequelize.define('gmsDeviceToken', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'fkUserId'
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'token'
    },
    appType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'appType'
    },
    appVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'appVersion'
    },
    badgeCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'badgeCount'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updatedAt'
    }

  }, {
      tableName: 'gmsDeviceToken'
  });
  gmsDeviceToken.associate = function(models) {
    // associations can be defined here
  };
  return gmsDeviceToken;
};