'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsDisconnectionLog = sequelize.define('gmsDisconnectionLog', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fk_userId'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fk_gameId'
    },
    logMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'logMessage'
    },
    connectionType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'connectionType'
    },
    isInterrupted:{
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'isInterrupted'
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: true
    }
  }, {
    tableName: 'gmsDisconnectionLog'
  });
  gmsDisconnectionLog.associate = function(models) {
    // associations can be defined here
  };
  return gmsDisconnectionLog;
};