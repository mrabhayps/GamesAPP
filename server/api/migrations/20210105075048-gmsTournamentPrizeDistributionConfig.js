'use strict';
const tableName = 'gmsTournamentPrizeDistributionConfig';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      fkTournamentConfigId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Ref: from gmsTournamentConfig',
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
      totalAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      individualAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Winning amount of player.',
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
