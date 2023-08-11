'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableGame', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkTableTypeId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      fkGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      activePlayersCount: {
        type: Sequelize.INTEGER(11),
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
    return queryInterface.dropTable('gmsTableGame');
  }
};