/* jshint indent: 2 */

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsPrizeDistributionConfig', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Grouping with unique combination of all classes',
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
    totalWinnerPercentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total winner in Percentage for given class ',
    },
    totalAmount: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    totalAmountPercentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total Amount in Percentage for given class ',
    },
    individualAmount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Winning amount of player."
    },
    createdAt: {
        type: Sequelize.DATE,
        allowNull: false
    },
    updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "0:Inactive , 1: Active"
    }
  }, {
    sequelize,
    tableName: 'gmsPrizeDistributionConfig',
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
