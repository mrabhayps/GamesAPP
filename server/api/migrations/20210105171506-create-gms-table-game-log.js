'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableGameLog', {
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
      fkGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      event: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      log: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      source: {
        type: Sequelize.STRING(50),
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
    return queryInterface.dropTable('gmsTableGameLog');
  }
};