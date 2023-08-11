'use strict';
const tableName = 'gmsTournamentPlayers';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      fkTournamentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      fkGameId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      fkPlayerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment:
          '10: Player initiated in tournament, 20: Playing successfull, 30: Playing Interrupted, ',
      },
      pdStatus: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment:
          '10: Win prize Generated, 20: EntryFee generated , 30: Looser , 40: Entry fee Credited to user wallet, 50: Winning amount credited to user wallet',
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
