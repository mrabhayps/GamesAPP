'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsHomeCardItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cardId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      subTitle: {
        type: Sequelize.STRING(60),
        allowNull: true
      },
      imageUrl: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      videoUrl: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER(1),
        allowNull: false,
        defaultValue: 0
      },
      jsonRequest: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('gmsHomeCardItems');
  }
};