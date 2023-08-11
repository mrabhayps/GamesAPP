/* jshint indent: 2 */

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsTournamentPrizeDistributionConfig', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    fkTournamentConfigId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Ref: from gmsTournamentConfig"
    },
    classInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Use to break the winner in different class"
    },
    rankFrom: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rankTill: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    totalWinner: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Total winner in given class "
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    individualAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Winning amount of player."
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "0:Inactive , 1: Active"
    }
  }, {
    sequelize,
    tableName: 'gmsTournamentPrizeDistributionConfig',
    timestamps: false,
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
