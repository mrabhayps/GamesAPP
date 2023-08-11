'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
   return Promise.all([
    queryInterface.addColumn(
      'gmsUsers', 
      'userName', 
      {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      queryInterface.addColumn(
        'gmsUsers', 
        'canUpdateUserName', 
        {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
      ),
      queryInterface.addColumn(
        'gmsUsers', 
        'totalWins', 
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
      ),
      queryInterface.addColumn(
        'gmsUsers', 
        'facebookId', 
        {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
      ),
    )]);
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
   return Promise.all([
    queryInterface.removeColumn('gmsUsers', 'userName'),
    queryInterface.removeColumn('gmsUsers', 'canUpdateUserName'),
    queryInterface.removeColumn('gmsUsers', 'totalWins')
  ]);
  }
};
