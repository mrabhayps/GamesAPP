/* jshint indent: 2 */

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsTournamentConfig', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    fkGameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Refarance from gmsGames"
    },
    title: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    fkPDId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Refarance from gmsPrizeDistributionConfig"
    },
    entryFee: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: DataTypes.TIME
    },
    tournamentTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Total time allocated for tournament "
    },
    minPlayer: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Min player need to start tournament."
    },
    maxPlayer: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Max Player which can participate in tournament."
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Rules and discription to play the tournament."
    },
    maxPlaying: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "This is the total number of Chance the player can play in tournament"
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "0: Inactive, 1: Active"
    }
  }, {
    sequelize,
    tableName: 'gmsTournamentConfig',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
