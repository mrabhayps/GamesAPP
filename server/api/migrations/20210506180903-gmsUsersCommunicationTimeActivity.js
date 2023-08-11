'use strict';

const { sequelize } = require("../models");

const tableName = 'gmsUsersCommunicationTimeActivity';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER(11),
      },
      fkUserId:{
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      timeLog:{
        type: Sequelize.TEXT,
        allowNull: false
      },
      communicationTime:{
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '0:Inactive , 1: Active',
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
