import { createApp } from './app';
import { env, loadedEnvFile } from './infra/env';
import { startRatesWorker } from './modules/exchange-rates/bcv-worker';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(
    `✅ AutoparteAIR API [${env.NODE_ENV}] (${loadedEnvFile}) escuchando en http://localhost:${env.PORT}/api/v1`,
  );
  // Worker de tasas automáticas (solo si RADAR_API_KEY está configurada).
  startRatesWorker();
});
