'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGameAPILog = sequelize.define('gmsTableGameAPILog', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkTableGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkTableGameId'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkGameId'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkUserId'
    },
    api: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'api'
    },
    isError: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'isError'
    },
    request: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'request'
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'response'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    }
  }, {
    tableName: 'gmsTableGameAPILog'
  });
  gmsTableGameAPILog.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableGameAPILog;
};