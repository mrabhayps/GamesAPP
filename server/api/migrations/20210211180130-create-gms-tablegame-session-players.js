'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableGameSessionPlayer', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkSessionId: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      fkPlayerId: {
        type: Sequelize.INTEGER,
        allowNull: true
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
    return queryInterface.dropTable('gmsTableGameSessionPlayer');
  }
};