'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsDisconnectionLog', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fk_userId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      fk_gameId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      logMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      connectionType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isInterrupted:{
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    return queryInterface.dropTable('gmsDisconnectionLog');
  }
};