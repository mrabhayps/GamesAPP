'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGameEndTrx = sequelize.define('gmsTableGameEndTrx', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    gameTxnId: {
      type: DataTypes.STRING(256),
      allowNull: false,
      field: 'gameTxnId'
    },
    fkUserId: {
      type: DataTypes.INTEGER(32),
      allowNull: false,
      field: 'fkUserId'
    },
    prevAmount: {
      type: DataTypes.DOUBLE(32,2),
      allowNull: false,
      field: 'prevAmount'
    },
    delta: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      field: 'delta'
    },
    newAmount: {
        type: DataTypes.DOUBLE(32,2),
        allowNull: false,
        field: 'newAmount'
    },
    finalBalance: {
      type: DataTypes.DOUBLE(32,2),
      allowNull: true,
      field: 'finalBalance'
    },
    deposit: {
      type: DataTypes.DOUBLE(32,2),
      allowNull: true,
      field: 'deposit'
    },
    winning: {
      type: DataTypes.DOUBLE(32,2),
      allowNull: true,
      field: 'winning'
    },
    bonus: {
      type: DataTypes.DOUBLE(32,2),
      allowNull: true,
      field: 'bonus'
    },
    distribution: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'distribution'
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      field: 'status'
    },
    reqLog: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'reqLog'
    },
    respLog: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'respLog'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt'
    }
  }, {
    tableName: 'gmsTableGameEndTrx'
  });
  return gmsTableGameEndTrx;
};