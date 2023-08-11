/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsfantacyCricketMatchScoreCard', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkCid: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkCid'
    },
    fkMatchId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkMatchId'
    },
    fkTeamId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkTeamId'
    },
    fkPlayerId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkPlayerId'
    },
    playerName: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'playerName'
    },
    point: {
      type: "DOUBLE(5,2)",
      allowNull: true,
      field: 'point'
    },
    credit: {
      type: "DOUBLE(5,1)",
      allowNull: true,
      field: 'credit'
    },
    role: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'role'
    },
    isPlaying11: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isPlaying11'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updatedAt'
    },
    starting11P: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'starting11P'
    },
    run: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'run'
    },
    runP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'runP'
    },
    four: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'four'
    },
    fourP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'fourP'
    },
    six: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'six'
    },
    sixP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'sixP'
    },
    sr: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      field: 'sr'
    },
    srP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'srP'
    },
    fifty: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'fifty'
    },
    fiftyP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'fiftyP'
    },
    duck: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'duck'
    },
    duckP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'duckP'
    },
    wkts: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'wkts'
    },
    wktsP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'wktsP'
    },
    maidenover: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'maidenover'
    },
    maidenoverP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'maidenoverP'
    },
    er: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      field: 'er'
    },
    erP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'erP'
    },
    catch: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'catch'
    },
    catchP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'catchP'
    },
    runoutStumping: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'runoutStumping'
    },
    runoutStumpingP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'runoutStumpingP'
    },
    thirty: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'thirty'
    },
    thirtyP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'thirtyP'
    },
    bonusP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'bonusP'
    },
    catchBonusP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'catchBonusP'
    },
    bowedlbwP: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'bowedlbwP'
    }
  }, {
    tableName: 'gmsfantacyCricketMatchScoreCard'
  });
};
