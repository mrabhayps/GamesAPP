'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGameLog = sequelize.define('gmsTableGameLog', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkTableGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkTableGameId'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkGameId'
    },
    event: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'event'
    },
    log: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'log'
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'source'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    }
  }, {
    tableName: 'gmsTableGameLog'
  });
  gmsTableGameLog.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableGameLog;
};