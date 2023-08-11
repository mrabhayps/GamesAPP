'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGameSessionPlayer = sequelize.define('gmsTableGameSessionPlayer', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    playerSession: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'playerSession'
    },
    fkSessionId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'fkSessionId'
    },
    fkPlayerId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkPlayerId'
    },
    masterSessionId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'masterSessionId'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    }
  }, {
    tableName: 'gmsTableGameSessionPlayer'
  });
  gmsTableGameSessionPlayer.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableGameSessionPlayer;
};