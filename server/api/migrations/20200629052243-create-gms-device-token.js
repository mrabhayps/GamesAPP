'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsDeviceToken', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      token: {
        type: Sequelize.STRING
      },
      appType: {
        type: Sequelize.STRING
      },
      appVersion: {
        type: Sequelize.STRING
      },
      badgeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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
    return queryInterface.dropTable('gmsDeviceToken');
  }
};