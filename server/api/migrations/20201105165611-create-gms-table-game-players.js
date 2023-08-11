'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableGamePlayers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkTableGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      fkPlayerId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      playerOpeningBalance: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      playerOpeningBalance: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      playerOpeningBalance: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER(2),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('gmsTableGamePlayers');
  }
};