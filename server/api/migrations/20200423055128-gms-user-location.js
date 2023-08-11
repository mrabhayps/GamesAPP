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
      'latitude', 
      {
        type: Sequelize.STRING,
        allowNull: true,
      },
    ),
    queryInterface.addColumn(
      'gmsUsers',
      'longitude',
      {
        type: Sequelize.STRING,
        allowNull: true,
      },
    ),
  ]);
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
   return Promise.all([
    queryInterface.removeColumn('gmsUsers', 'latitude'),
    queryInterface.removeColumn('gmsUsers', 'longitude')
  ]);
  }
};
