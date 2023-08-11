'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGamePlayers = sequelize.define('gmsTableGamePlayers', {
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
    fkPlayerId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkPlayerId'
    },
    firstSessionId: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'firstSessionId'
    },
    playerOpeningBalance: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'playerOpeningBalance'
    },
    playerClosingBalance: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'playerClosingBalance'
    },
    playerCurrentBalance: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'playerCurrentBalance'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
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
    tableName: 'gmsTableGamePlayers'
  });
  gmsTableGamePlayers.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableGamePlayers;
};