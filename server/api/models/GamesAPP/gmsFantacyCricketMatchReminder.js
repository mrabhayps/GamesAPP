module.exports = function(sequelize, DataTypes) {
  return sequelize.define(
    'gmsFantacyCricketMatchReminder',
    {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      fkMatchId: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(128),
        allowNull: true,
        field: 'title',
      },
      playerList: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        field: 'playerList',
      },
      status: { type: DataTypes.INTEGER(2), allowNull: true, field: 'status' },
      createdAt: {
        allowNull: true,
        type: DataTypes.DATE,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: true,
      },
    },
    {
      tableName: 'gmsFantacyCricketMatchReminder',
    }
  );
};
