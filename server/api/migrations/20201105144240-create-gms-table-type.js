'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsTableType', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkGameId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      fkTableCategoryId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      isPaid: {
        type: Sequelize.INTEGER(2),
        allowNull: true
      },
      onePointValue: {
        type: Sequelize.DECIMAL(3,2),
        defaultValue: 1.0,
        allowNull: true
      },
      tableValue: {
        type: Sequelize.DECIMAL(3,2),
        defaultValue: 0.0,
        allowNull: true
      },
      minPlayers: {
        type: Sequelize.INTEGER(4),
        defaultValue: 1,
        allowNull: true
      },
      maxPlayers: {
        type: Sequelize.INTEGER(4),
        defaultValue: 1,
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
    return queryInterface.dropTable('gmsTableType');
  }
};