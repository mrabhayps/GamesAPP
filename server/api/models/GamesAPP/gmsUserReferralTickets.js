/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsUserReferralTickets', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER(11),
          },
          fkUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Ref. From gmsUser',
          },
          onboardedUserId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            comment: 'Ref. From gmsUser',
          },
          onboardedUserMobile: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: 'Onboarded user Mobile Number',
          },
          referralCode: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: '0: No, 1: Yes (If onboarded user made his first deposite)',
          },
          isDeposited: {
            type: DataTypes.INTEGER(4),
            allowNull: false,
            comment: '0: No, 1: Yes (If onboarded user made his first deposite)',
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
          },
          status: {
            type: DataTypes.INTEGER(4),
            allowNull: false,
            comment: '10:Onboarded , 20:Ticket Active , 30:Ticket Consumed',
          }
    }, {
      tableName: 'gmsUserReferralTickets'
    });
  };
  