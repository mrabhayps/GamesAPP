'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsBankDetails', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      bank: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      ifsc: {
        type: Sequelize.STRING(15),
        allowNull: true,
        unique: true
      },
      branch: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      district: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      state: {
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
    return queryInterface.dropTable('gmsBankDetails');
  }
};