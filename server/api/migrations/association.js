module.exports = {
  setAssociations,
};

function setAssociations(models) {
  //Gms gmsUsers Association to gmsUserAuth
  models.gmsUsers.associate = function(models) {
    models.gmsUsers.hasMany(models.gmsUserAuth, {
      foreignKey: 'fkUserId',
    });
  };

  // Gms gmsUserAuth Association to gmsUsers
  // models.gmsAuthUser.associate = function(models) {
  //     models.gmsAuthUser.belongsTo(models.gmsUsers, {
  //         foreignKey: 'fkUserId'
  //     });
  // };

  //Gms gmsAuthUser Association to gmsAppHistory
  // models.gmsAuthUser.associate = function(models) {
  //     models.gmsAuthUser.hasOne(models.gmsAppHistory, {
  //         foreignKey: 'fkAppHistoryId'
  //     });
  // };

  //Gms Tournament Association . . .
  /*models.gmsTurnament.associate = function(models) {
        models.gmsTurnament.hasMany(models.gmsTurnamentPlayers, {
            foreignKey: 'fk_TurnamentId'
        });
    };*/

  //Gms Users Association
  /*models.gmsUsers.associate = function(models) {
        models.gmsUsers.hasMany(models.gmsTurnamentPlayers, {
            foreignKey: 'fk_PlayerId'
        });
    };*/

  //gmsTurnamentPlayers Association
  /*models.gmsTurnamentPlayers.associate = function(models) {
        models.gmsTurnamentPlayers.belongsTo(models.gmsUsers,{
            foreignKey: 'fk_PlayerId'
        });
    };*/

  //gmsGames Association . . .
  models.gmsGames.associate = function(models) {
    models.gmsGames.hasOne(models.gmsBattle, {
      foreignKey: 'fk_GamesId',
    });
  };
}
