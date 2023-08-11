/* jshint indent: 2 */

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsTournamentPlayers', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    fkTournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fkGameId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fkPlayerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "10: Player initiated in tournament, 20: Playing successfull, 30: Playing Interrupted, "
    },
    pdStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "10: Win prize Generated, 20: EntryFee generated , 30: Looser , 40: Entry fee Credited to user wallet, 50: Winning amount credited to user wallet"
    }
  }, {
    sequelize,
    tableName: 'gmsTournamentPlayers',
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
