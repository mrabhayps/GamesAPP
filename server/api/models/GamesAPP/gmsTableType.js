'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableType = sequelize.define('gmsTableType', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkGameId'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'title'
    },
    fkTableCategoryId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkTableCategoryId'
    },
    isPaid: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isPaid'
    },
    // entryFee: {
    //   type: "DOUBLE(8,2)",
    //   allowNull: true,
    //   field: 'entryFee'
    // },
    onePointValue: {
      type: "DOUBLE(4,2)",
      allowNull: true,
      field: 'onePointValue'
    },
    minEntryFee: {
      type: "DOUBLE(8,2)",
      allowNull: true,
      field: 'minEntryFee'
    },
    maxEntryFee: {
      type: "DOUBLE(8,2)",
      allowNull: true,
      field: 'maxEntryFee'
    },
    winningAmount: {
      type: "DOUBLE(8,2)",
      allowNull: true,
      field: 'winningAmount'
    },
    minPlayers: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1',
      field: 'minPlayers'
    },
    maxPlayers: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1',
      field: 'maxPlayers'
    },
    // turnTime:{
    //   type: DataTypes.INTEGER(4),
    //   allowNull: true,
    //   field: 'turnTime'
    // },
    // smallBlind:{
    //   type: DataTypes.INTEGER(6),
    //   allowNull: true,
    //   field: 'smallBlind'
    // },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'data',
      get: function () {
        return JSON.parse(this.getDataValue('data'));
      },
      set: function (value) {
          this.setDataValue('data', JSON.stringify(value));
      },
    },
    // bigBlind:{
    //   type: DataTypes.INTEGER(8),
    //   allowNull: true,
    //   field: 'bigBlind'
    // },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    },
    totalActivePlayer: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'totalActivePlayer'
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
    tableName: 'gmsTableType'
  });
  gmsTableType.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableType;
};