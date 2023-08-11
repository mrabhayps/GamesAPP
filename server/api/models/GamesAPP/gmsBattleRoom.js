/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsBattleRoom', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fk_GameId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'fk_GameId'
    },
    fk_BattleId: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'fk_BattleId'
    },
    br_roomId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'br_roomId'
    },
    videoRoomId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'videoRoomId'
    },
    fk_PlayerId1: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'fk_PlayerId1'
    },
    fk_PlayerId2: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'fk_PlayerId2'
    },
    playerScore1: {
      type: DataTypes.INTEGER(10),
      allowNull: true,
      field: 'playerScore1'
    },
    playerScore2: {
      type: DataTypes.INTEGER(10),
      allowNull: true,
      field: 'playerScore2'
    },
    p1GenderChoice: {
      type: DataTypes.CHAR(10),
      allowNull: true,
      field: 'p1GenderChoice'
    },
    p2GenderChoice: {
      type: DataTypes.CHAR(10),
      allowNull: true,
      field: 'p2GenderChoice'
    },
    note: {
      type: DataTypes.STRING(250),
      allowNull: true,
      field: 'note'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    status: {
      type: DataTypes.INTEGER(6).UNSIGNED,
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsBattleRoom'
  });
};
