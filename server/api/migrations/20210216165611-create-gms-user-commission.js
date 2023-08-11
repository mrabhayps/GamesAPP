'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsUserCommission', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkUserId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      fkGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      commission: {
        type: Sequelize.DECIMAL(8,2),
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
    return queryInterface.dropTable('gmsUserCommission');
  }
};