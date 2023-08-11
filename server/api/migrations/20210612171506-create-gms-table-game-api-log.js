'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableGameAPILog', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkTableGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      fkGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      fkUserId: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      api: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      isError: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      request: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      response: {
        type: Sequelize.TEXT,
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
    return queryInterface.dropTable('gmsTableGameAPILog');
  }
};