'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableGameSession', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkTableGameId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sessionId: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER(3),
        allowNull: true,
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
    return queryInterface.dropTable('gmsTableGameSession');
  }
};