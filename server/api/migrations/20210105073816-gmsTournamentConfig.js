'use strict';
const tableName = 'gmsTournamentConfig';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      fkGameId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Refarance from gmsGames',
      },
      title: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      entryFee: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      interval: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Time interval',
      },
      tournamentTime: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total time allocated for tournament ',
      },
      minPlayer: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Min player need to start tournament.',
      },
      maxPlayer: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Max Player which can participate in tournament.',
      },
      rules: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Rules and discription to play the tournament.',
      },
      maxPlaying: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment:
          'This is the total number of Chance the player can play in tournament',
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '0: Inactive, 1: Active',
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
