/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsBattle', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      field: 'id'
    },
    fkGamesId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_GamesId'
    },
    title: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'title'
    },
    isPaid: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isPaid'
    },
    paidAmount: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'paidAmount'
    },
    winningAmount: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'winningAmount'
    },
    isVideoEnabled: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isVideoEnabled'
    },
    isAudioEnabled: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isAudioEnabled'
    },
    isChatEnabled: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isChatEnabled'
    },
    link: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'link'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'startTime'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'endTime'
    },
    battleRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'battleRules'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    createdBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdBy'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    updatedBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'updatedBy'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsBattle'
  });
};
