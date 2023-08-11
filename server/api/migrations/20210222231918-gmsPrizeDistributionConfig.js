'use strict';
const tableName = 'gmsPrizeDistributionConfig';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Grouping with unique combination of all classes',
      },
      type: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '1:Dynamic, 2:Constant(Static)',
      },
      classInterval: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Use to break the winner in different class',
      },
      rankFrom: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      rankTill: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      totalWinner: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total winner in given class ',
      },
      totalWinnerPercentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total winner in Percentage for given class ',
      },
      totalAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      totalAmountPercentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total Amount in Percentage for given class ',
      },
      individualAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Winning amount of player.',
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
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '0:Inactive , 1: Active',
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
