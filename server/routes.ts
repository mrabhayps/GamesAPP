import { Application } from 'express';

import otpR from './api/router/otpR';
import userR from './api/router/userR';
import battleR from './api/router/battleR';
import gamesR from './api/router/gamesR';
import tournamentR from './api/router/tournamentR';
import commonR from './api/router/commonR';
import fantacyCricketR from './api/router/fantacyCricketR';
import paymentR from './api/router/paymentR';
import friendsR from './api/router/friendsR';
import agoraR from './api/router/agoraR';
import tableGamesR from './api/router/tableGamesR';
import scratchCardR from './api/router/scratchCardR';
import streaksR from './api/router/streaksR';
import preloginR from './api/router/preloginR';

export default function routes(app: Application): void {
  app.use('/api/v1/otp',otpR);
  app.use('/api/v1/user',userR);
  app.use('/api/v1/games/battle',battleR);
  app.use('/api/v1/games',gamesR);
  app.use('/api/v1/games/tournament',tournamentR);
  app.use('/api/v1',commonR);
  app.use('/api/v1/fantacy/cricket',fantacyCricketR);
  app.use('/api/v1/games/integration',gamesR);
  app.use('/api/v1/payment', paymentR);
  app.use('/api/v1/friends', friendsR);
  app.use('/api/v1/agora', agoraR);
  app.use('/api/v1/games/table', tableGamesR);
  app.use('/api/v1/scratchcard', scratchCardR);
  app.use('/api/v1/streaks', streaksR);
  app.use('/api/v1/prelogin', preloginR);
}
