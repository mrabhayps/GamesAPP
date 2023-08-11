'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.renameColumn('gmsUsers', 'continante', 'continent', { transaction: t }),
        // queryInterface.changeColumn('gmsUsers', 'gender', {type: Sequelize.ENUM,
          // values: ['M', 'F'],
          // allowNull: true,}, { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'token', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'sessionId', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'sessionTimestamp', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'fk_AppHistoryId', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'isOnline', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'isOnlineTime', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'UUID', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'APPIP', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'userAgent', { transaction: t }),
        queryInterface.removeColumn('gmsUsers', 'createdBy', { transaction: t }),
        queryInterface.removeColumn('gmsUserAuth', 'winPrize', { transaction: t }),
        queryInterface.removeColumn('gmsUserAuth', 'rank', { transaction: t }),

      ]);
    });
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};
