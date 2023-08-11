'use strict';
const tableName = 'gmsTournament';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      fkConfigId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Ref from gmsTournament config',
      },
      type: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '1: Everybody wins',
      },
      fkGameId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Refarance from gmsGames',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      entryFee: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      prizePool: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tournament start time',
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tournament End Time ',
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
      totalParticipant: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total number of user who has been played in tournament',
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
        comment:
          '10: Created , 20: Started, 30: Cancelled, 40: Successfully completed, 50: Entry fee refund,  60: Prize Distributed, 70: Amount Credited',
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
