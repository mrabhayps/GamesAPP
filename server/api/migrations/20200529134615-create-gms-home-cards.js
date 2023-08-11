'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsHomeCards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      subTitle: {
        type: Sequelize.STRING(60),
        allowNull: true
      },
      cardType: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      subType: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.INTEGER(1),
        allowNull: false
      },
      jsonRequest: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      preloaded: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },


    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('gmsHomeCards');
  }
};