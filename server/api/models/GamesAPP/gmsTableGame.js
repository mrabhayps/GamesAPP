'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGame = sequelize.define('gmsTableGame', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkGameId'
    },
    fkTableTypeId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkTableTypeId'
    },
    activePlayersCount: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: 0,
      field: 'activePlayersCount'
    },
    tableCurrentBalance: {
      type: "DOUBLE(8,2)",
      allowNull: true,
      field: 'tableCurrentBalance'
    },
    tableInitialBalance: {
      type: "DOUBLE(8,2)",
      allowNull: true,
      field: 'tableInitialBalance'
    },
    gameTableType: {
      type: DataTypes.INTEGER(3),
      allowNull: false,
      field: 'gameTableType'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    },
    tableCreatedBy: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'tableCreatedBy'
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
    tableName: 'gmsTableGame'
  });
  gmsTableGame.associate = function (models) {
    // associations can be defined here
  };
  return gmsTableGame;
};