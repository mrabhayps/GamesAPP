/* jshint indent: 2 */

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define(
    'gmsTournament',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      fkConfigId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Ref from gmsTournament config',
      },
      type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1: Everybody wins',
      },
      fkGameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Refarance from gmsGames',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      fkPDId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Refarance from gmsPrizeDistributionConfig"
      },
      entryFee: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      prizePool: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tournament start time',
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tournament End Time ',
      },
      minPlayer: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Min player need to start tournament.',
      },
      maxPlayer: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Max Player which can participate in tournament.',
      },
      totalParticipant: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total number of user who has been played in tournament',
      },
      rules: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Rules and discription to play the tournament.',
      },
      maxPlaying: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment:
          'This is the total number of Chance the player can play in tournament',
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment:
          '10: Created , 20: Started, 30: Cancelled, 40: Successfully completed, 50: Entry fee refund,  60: Prize Distributed, 70: Amount Credited',
      },
    },
    {
      sequelize,
      tableName: 'gmsTournament',
      timestamps: true,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
      ],
    }
  );
};
