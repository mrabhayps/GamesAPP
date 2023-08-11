'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('gmsContestConfigMain', 'fkPDId', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }),
            queryInterface.addColumn('gmsFantacyCricketContest', 'fkPDId', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }),
            queryInterface.addColumn('gmsTournamentConfig', 'fkPDId', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }),
            queryInterface.addColumn('gmsTournament', 'fkPDId', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }),
        ]);
    },

    down: (queryInterface) => {
      return Promise.all([
          queryInterface.removeColumn('gmsContestConfigMain', 'fkPDId'),
          queryInterface.removeColumn('gmsFantacyCricketContest', 'fkPDId'),
          queryInterface.removeColumn('gmsTournamentConfig', 'fkPDId'),
          queryInterface.removeColumn('gmsTournament', 'fkPDId')
      ]);
        
    },
};
