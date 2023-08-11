/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUsers', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    firstName: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'firstName'
    },
    middleName: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'middleName'
    },
    lastName: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'lastName'
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: true,
      unique: true,
      field: 'email'
    },
    mobile: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'mobile'
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'dob'
    },
    gender: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'gender'
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'image'
    },
    defaultImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'defaultImage'
    },
    city: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'city'
    },
    state: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'state'
    },
    country: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'country'
    },
    continent: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'continent'
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
    updatedBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'updatedBy'
    },
    winPrize: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'winPrize'
    },
    winPrizeT: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'winPrizeT'
    },
    rank: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'rank'
    },
    rankT: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'rankT'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    },
    latitude: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'latitude'
    },
    longitude: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'longitude'
    },
    canUpdateUserName: {
      type: DataTypes.INTEGER(1),
      allowNull: true,
      defaultValue: '1',
      field: 'canUpdateUserName'
    },
    totalWins: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0',
      field: 'totalWins'
    },
    totalWinningAmount: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0',
      field: 'totalWinningAmount'
    },
    gameMatrix: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'gameMatrix'
    },
    userName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      field: 'userName'
    },
    facebookId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'facebookId'
    },
    referralCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'referralCode'
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastSeen'
    },
    restoreId: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'restoreId'
    },
    kycResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'kycResponse'
    },
    kycStatus: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      field: 'kycStatus'
    },
    isCreatorStatus: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isCreatorStatus'
    },
    reportedCount: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'reportedCount'
    }
  }, {
    tableName: 'gmsUsers'
  });
};
