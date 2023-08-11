/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsGames', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'name'
    },
    title: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'title'
    },
    description: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'description'
    },
    smallIconImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'smallIconImage'
    },
    longIconImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'longIconImage'
    },
    bgImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'bgImage'
    },
    topColorCode: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'topColorCode'
    },
    bottomColorCode: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'bottomColorCode'
    },
    isBattle: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isBattle'
    },
    isTurnament: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isTurnament'
    },
    isMatchup: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '0',
      field: 'isMatchup'
    },
    tokenPrize: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'tokenPrize'
    },
    howToPlay: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'howToPlay'
    },
    appLaunchLink: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'appLaunchLink'
    },
    configFile: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'configFile'
    },
    orientation: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'orientation'
    },
    screenmode: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'screenmode'
    },
    version: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'version'
    },
    downloadLink: {
      type: DataTypes.STRING(256),
      allowNull: true,
      field: 'downloadLink'
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
    },
    popularRank: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '0',
      field: 'popularRank'
    },
    gameCategory: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      field: 'gameCategory'
    },
    gameType: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      field: 'gameType'
    },
    gameEndTime: {
      type: DataTypes.INTEGER(8),
      allowNull: true,
      field: 'gameEndTime'
    }
  }, {
    tableName: 'gmsGames'
  });
};
