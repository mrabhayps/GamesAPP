/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFavouriteGames', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkGamesId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_GamesId'
    },
    fkTurnamentId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_TurnamentId'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_UserId'
    },
    isFavourite: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'isFavourite'
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
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsFavouriteGames'
  });
};
